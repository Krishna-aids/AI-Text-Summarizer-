import io
import torch
import pdfplumber
from docx import Document
from transformers import T5Tokenizer, T5ForConditionalGeneration, GenerationConfig
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
import os

# ── ENV ───────────────────────────────────────
load_dotenv()

# ── GROQ CLIENT ───────────────────────────────
llm_client = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",   # swap to any Groq-hosted model as needed
    temperature=0.3,
)

# ── MODEL SETUP ───────────────────────────────
import os
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model")


device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH)
model     = T5ForConditionalGeneration.from_pretrained(MODEL_PATH).to(device) 

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


# ── GROQ REFINEMENT ─────────────────────────── 
def llm(summary, word_param):
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

    response = llm_client.invoke([HumanMessage(content=prompt)])
    return response.content


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

    t5_summary    = _summarize_chunk(text, params) # raw data generate
    final_summary = llm(t5_summary, word_param)

    return {
        "model_summary": t5_summary,     # raw T5 output
        "llm_summary":   final_summary,  # Groq-refined output
    }
