import io
import torch
import pdfplumber
from docx import Document
from transformers import T5Tokenizer, T5ForConditionalGeneration
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor



from google import genai
import os

client = genai.Client(api_key="AIzaSyDuzl7Q7BIbSG5knVepFTrODPP5E3MxxSc")



# ── MODEL SETUP ───────────────────────────────
MODEL_PATH = "../model"

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH)
model     = T5ForConditionalGeneration.from_pretrained(MODEL_PATH).to(device)


# ── EXTRACT PDF ───────────────────────────────
def extract_pdf(file):
    """
    Accepts a Flask FileStorage stream or any file-like object.
    Reads all pages and returns concatenated text.
    """
    text = ""

    # Wrap in BytesIO so pdfplumber always gets a seekable stream
    raw = file.read() if hasattr(file, "read") else file
    stream = io.BytesIO(raw)

    with pdfplumber.open(stream) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:                        # skip blank pages
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


def _summarize_chunk(text, params):
    """
    Runs T5 inference on a single chunk of text.
    """
    input_ids = tokenizer.encode(
        "summarize: " + text,
        return_tensors="pt",
        max_length=512,
        truncation=True
    ).to(device)

    outputs = model.generate(
        input_ids,
        max_new_tokens=params["max_new_tokens"],
        min_new_tokens=params["min_new_tokens"],
        num_beams=4,
        length_penalty=2.0,
        no_repeat_ngram_size=3,
        early_stopping=True
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)



def llm(summary,word_param):
     min_words = word_param["min_word"]
     max_words = word_param["max_word"]

     prompt = f"""
You are an expert document analyst.

Improve the following summary and extract useful insights.

STRICT RULES:
- Total response MUST be between {min_words} and {max_words} words. Count carefully.
- Do NOT exceed {max_words} words under any circumstance.
- Do NOT write in paragraphs. Use ONLY the exact format below.

Return output in EXACTLY this format (no extra text, no paragraphs):

Improved Summary:
<your refined summary here in 2-4 sentences>

Key Insights:
- <insight 1>
- <insight 2>
- <insight 3>

Important Points:
- <point 1>
- <point 2>

Summary to improve:
{summary}
"""

     response = client.models.generate_content(
       model="gemini-2.5-flash",
        contents=prompt
    )

     return response.text


def generate_summary(text, length="medium"):
    if not text or not text.strip():
        return {"model_summary": "", "llm_summary": "No text provided for summarization."}

    length_map = {
        "short":    {"max_new_tokens": 100,  "min_new_tokens": 60},
        "medium":   {"max_new_tokens": 250, "min_new_tokens": 130},
        "detailed": {"max_new_tokens": 700, "min_new_tokens": 250},
    }
    word_limits = {                              # ← renamed from `len`
        "short":    {"max_word": 60,  "min_word": 50},
        "medium":   {"max_word": 150,  "min_word": 130},
        "detailed": {"max_word": 300, "min_word": 280},
    }

    params      = length_map.get(length, length_map["medium"])
    word_param  = word_limits.get(length, word_limits["medium"])  # ← use renamed dict
    words      = text.split()
    if len(words) > 400: 
        chunks = [" ".join(words[i:i + 400]) for i in range(0, len(words), 400)]

        # ✅ Parallel — all chunks run at the same time
        with ThreadPoolExecutor() as executor:
            partials = list(executor.map(lambda c: _summarize_chunk(c, params), chunks))
    t5_summary = _summarize_chunk(text, params)

 
    final_summary = llm(t5_summary, word_param)

    return {
        "model_summary": t5_summary,    # T5 output
        "llm_summary":   final_summary  # Gemini output
    }

