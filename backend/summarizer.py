import io
import torch
import pdfplumber
from docx import Document
from transformers import T5Tokenizer, T5ForConditionalGeneration
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from google import genai
import os

# ── ENV ───────────────────────────────────────
load_dotenv()   # must be called before os.getenv

client = genai.Client(api_key="AIzaSyBp9cAolhGC7wdKqLiWR1zZNOoF7mOBbwQ")


# ── MODEL SETUP ───────────────────────────────
MODEL_PATH = "model"   # local fine-tuned T5 checkpoint

device    = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH)
model     = T5ForConditionalGeneration.from_pretrained(MODEL_PATH).to(device)
model.eval()


# ── EXTRACT PDF ───────────────────────────────
def extract_pdf(file):
    """
    Accepts a Flask FileStorage stream or any file-like object.
    Reads all pages and returns concatenated text.
    """
    raw    = file.read() if hasattr(file, "read") else file
    stream = io.BytesIO(raw)

    text = ""
    with pdfplumber.open(stream) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    return text.strip()


# ── EXTRACT DOCX ──────────────────────────────
def extract_docx(file):
    """
    Accepts a Flask FileStorage stream or any file-like object.
    Returns paragraph text joined by newlines.
    """
    raw    = file.read() if hasattr(file, "read") else file
    stream = io.BytesIO(raw)

    doc  = Document(stream)
    text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    return text.strip()


# ── EXTRACT TXT ───────────────────────────────
def extract_txt(file):
    """
    Accepts a Flask FileStorage object.
    Decodes bytes to UTF-8 string.
    """
    raw = file.read() if hasattr(file, "read") else file
    return raw.decode("utf-8").strip()


# ── T5 CHUNK INFERENCE ────────────────────────
def _summarize_chunk(text, params):
    """
    Runs T5 inference on a single chunk of text.
    Called directly or via ThreadPoolExecutor.
    """
    input_ids = tokenizer.encode(
        "summarize: " + text,
        return_tensors="pt",
        max_length=512,
        truncation=True,
    ).to(device)

    with torch.no_grad():
        outputs = model.generate(
            input_ids,
            max_new_tokens=params["max_new_tokens"],
            min_new_tokens=params["min_new_tokens"],
            num_beams=4,
            length_penalty=2.0,
            no_repeat_ngram_size=3,
            early_stopping=True,
        )


    return tokenizer.decode(outputs[0], skip_special_tokens=True)


# ── GEMINI REFINEMENT ─────────────────────────
def llm(summary, word_param):

    min_words = word_param["min_word"]
    max_words = word_param["max_word"]

    prompt = f"""
Improve the summary below.

Rules:
- {min_words}-{max_words} words
- No paragraphs
- Structured format

Summary:
{summary}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if response and response.text:
            return response.text
        else:
            return summary

    except Exception as e:
        print("Gemini Error:", e)
        return summary


# ── MAIN SUMMARY PIPELINE ─────────────────────
def generate_summary(text, length="medium"):
    if not text or not text.strip():
        return {
            "model_summary": "",
            "llm_summary": "No text provided for summarization.",
        }

    length_map = {
        "short":    {"max_new_tokens": 100, "min_new_tokens": 60},
        "medium":   {"max_new_tokens": 250, "min_new_tokens": 130},
        "detailed": {"max_new_tokens": 700, "min_new_tokens": 250},
    }
    word_limits = {
        "short":    {"max_word": 60,  "min_word": 50},
        "medium":   {"max_word": 150, "min_word": 130},
        "detailed": {"max_word": 300, "min_word": 280},
    }

    params     = length_map.get(length, length_map["medium"])
    word_param = word_limits.get(length, word_limits["medium"])

    words = text.split()


    t5_summary = _summarize_chunk(text, params)


        # Short document — single-pass summarization
     
    # Refine and enrich with Gemini
    final_summary = llm(t5_summary, word_param)

    return {
        "model_summary": t5_summary,    # raw T5 output
        "llm_summary":   final_summary, # Gemini-refined output
    }