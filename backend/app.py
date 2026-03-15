from flask import Flask, request, jsonify
from flask_cors import CORS
from summarizer import extract_pdf, extract_docx, extract_txt, generate_summary

app = Flask(__name__)
CORS(app)

# ── EXTRACT ROUTE ─────────────────────────────
@app.route("/extract", methods=["POST"])
def extract():
    file = request.files.get("file")

    if not file or file.filename == "":
        return jsonify({"error": "No file provided"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        text = extract_pdf(file)
    elif ext == "docx":
        text = extract_docx(file)
    elif ext == "txt":
        text = extract_txt(file)
    else:
        return jsonify({"error": "Unsupported format. Use PDF, DOCX, or TXT."}), 400

    if not text or not text.strip():
        return jsonify({"error": "Could not extract text from the document."}), 422

    return jsonify({"text": text})


# ── SUMMARIZE ROUTE ───────────────────────────
@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.json

    if not data:
        return jsonify({"error": "No JSON body received"}), 400

    text   = data.get("text")
    length = data.get("length", "medium")

    if not text or not text.strip():
        return jsonify({"error": "No text provided for summarization"}), 400

    if length not in ("short", "medium", "detailed"):
        length = "medium"

    # generate_summary handles the full pipeline: T5 → Gemini
    result = generate_summary(text, length)

    return jsonify({
        "model_summary": result["model_summary"],   # Raw T5 output
        "final_output":  result["llm_summary"]      # Gemini refined output
    })


if __name__ == "__main__":
    app.run(debug=True)