from flask import Flask, request, jsonify
from flask_cors import CORS
from summarizer import extract_pdf, extract_docx, extract_txt, generate_summary

app = Flask(__name__)
CORS(app)

# ── EXTRACT ROUTE ─────────────────────────────
@app.route("/extract", methods=["POST"])
def extract():
    try:
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

    except Exception as e:
        print("Extraction Error:", e)
        return jsonify({"error": "Failed to extract text"}), 500


# ── SUMMARIZE ROUTE ───────────────────────────
@app.route("/summarize", methods=["POST"])
def summarize():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON body received"}), 400

        text = data.get("text")
        length = data.get("length", "medium")

        if not text or not text.strip():
            return jsonify({"error": "No text provided for summarization"}), 400

        if length not in ("short", "medium", "detailed"):
            length = "medium"

        # Run summarization pipeline
        result = generate_summary(text, length)

        # Safety fallback
        model_summary = result.get("model_summary", "")
        llm_summary = result.get("llm_summary", "")

        return jsonify({
            "model_summary": model_summary,
            "final_output": llm_summary
        })

    except Exception as e:
        print("Summarization Error:", e)
        return jsonify({"error": "Failed to generate summary"}), 500


if __name__ == "__main__":
    app.run(debug=True)