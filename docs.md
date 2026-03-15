# Automatic Text Summarization System
**Project Documentation**

---

## 1. Project Overview

The **Automatic Text Summarization System** is an AI-powered application designed to generate concise summaries from uploaded documents such as PDF and DOCX files.

The system extracts raw text from documents, processes it using a transformer-based summarization model, and refines the generated output using a Large Language Model (LLM) to produce structured and readable summaries.

The project has evolved through multiple versions, each improving model performance, user experience, and output quality.

---

## 2. Core Objectives

- **Automatic Document Parsing** — Extract text from uploaded PDF and DOCX files.
- **AI-Based Summarization** — Use transformer-based models to generate abstractive summaries.
- **Structured Output** — Improve readability and topic flow using LLM-based post-processing.
- **User-Friendly Interface** — Provide a clean web interface for document upload and summary generation.
- **Continuous Improvement** — Improve summarization quality, model performance, and system efficiency across versions.

---

## 3. System Architecture

```
User Uploads Document
        │
        ▼
Document Parsing Layer
(PDF / DOCX Text Extraction)
        │
        ▼
Preprocessing Layer
(Text Cleaning and Formatting)
        │
        ▼
Summarization Model
(Fine-tuned T5 Base)
        │
        ▼
LLM Refinement Layer
(Improves structure and readability)
        │
        ▼
Final Structured Summary
        │
        ▼
Displayed on Web Interface
```

---

## 4. Evolution of the System

### Version 1 – Prototype

| Property | Details |
|----------|---------|
| Model | T5-Small (Pretrained) |
| Interface | Streamlit |

**Features:**
- Basic document upload
- Text extraction
- Simple abstractive summarization

**Limitations:**
- Minimal user interface
- Low control over summary structure
- Output sometimes lacked clarity

---

### Version 2 – UI Enhancement

| Property | Details |
|----------|---------|
| Model | T5-Small |
| Frontend | HTML + CSS + JavaScript |
| Backend | Python API |

**Improvements:**
- Custom web interface
- Better user interaction
- Improved document upload handling

**Limitations:**
- Summaries still lacked structure
- Important topics sometimes missing

---

### Version 3 – Semantic Refinement

**Pipeline:**
```
Document → Extraction → T5 Summary → LLM Processing → Structured Summary
```

**Improvements:**
- Added LLM-based post-processing
- Topic identification
- Improved readability and natural language flow

**Limitations:**
- Increased latency due to external LLM API calls

---

### Version 4 – Hybrid AI System *(Current Version)*

| Property | Details |
|----------|---------|
| Model | Fine-tuned T5 Base |
| Post-Processing | LLM Refinement |

**Improvements:**
- Better contextual understanding
- Higher-quality summaries
- Structured and readable outputs

**Trade-offs:**
- Higher computational requirements
- Increased inference time compared to earlier versions

---

## 5. Technical Components

### Document Parsing
Libraries used to extract text from files:
- `pdfplumber` — PDF processing
- `python-docx` — DOCX processing

### Summarization Model
- Transformer architecture (T5 Base)
- Fine-tuned for text summarization tasks
- Generates abstractive summaries

### LLM Refinement
- Enhances summary readability
- Extracts key topics
- Structures the final output

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Python
- Model inference pipeline
- API endpoints for extraction and summarization

---

## 6. Evaluation Metrics

| Metric | Description |
|--------|-------------|
| **ROUGE Score** | Measures similarity between generated summaries and reference summaries |
| **Latency** | Measures the time taken to generate a summary |
| **User Readability** | Measures how understandable and structured the summary appears to users |

---

## 7. Future Improvements

### Model Optimization
- Quantization to reduce inference time
- Efficient model loading for CPU environments

### Advanced Summarization
- Multi-document summarization
- Domain-specific summarization

### Deployment
- REST API deployment
- Cloud hosting
- Scalable inference system

---

## 8. Conclusion

The Automatic Text Summarization System demonstrates the practical integration of transformer models and large language models to build an intelligent document summarization platform.

Through continuous iterations, the system has improved in terms of model capability, output quality, and user experience. The current hybrid architecture combines deep learning summarization with LLM refinement to deliver structured and meaningful summaries.