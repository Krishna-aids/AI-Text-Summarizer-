# 📝 Text Summarization AI

An **Automatic Text Summarization System** powered by a fine-tuned **T5 Transformer** model that generates concise, accurate summaries from long documents.

---

## 🚀 Features

- 🤖 Fine-tuned **T5 Transformer** model for high-quality abstractive summarization
- ⚡ Fast and efficient summarization of long-form text and documents
- 🌐 Clean and responsive **web-based frontend** (HTML, CSS, JavaScript)
- 🔧 Robust **Python backend** API to serve model predictions
- 📦 Dependency management via `pyproject.toml` and `uv.lock`

---

## 🗂️ Project Structure

```
Text_Summarization_AI/
├── backend/          # Python backend (API, model loading, inference)
├── frontend/         # Web UI (HTML, CSS, JavaScript)
├── test.py           # Test scripts for model/API validation
├── pyproject.toml    # Python project configuration & dependencies
├── uv.lock           # Locked dependency versions (uv package manager)
├── docs.md           # Additional documentation
└── README.md         # Project overview (this file)
```

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Model      | T5 Transformer (fine-tuned)       |
| Backend    | Python (FastAPI / Flask)          |
| Frontend   | HTML, CSS, JavaScript             |
| ML Library | Hugging Face Transformers         |
| Package Mgr| uv (`pyproject.toml`)             |

---

## ⚙️ Installation & Setup

### Prerequisites

- Python 3.9+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip
- Node.js (optional, for frontend tooling)

### 1. Clone the Repository

```bash
git clone https://github.com/HeadTarun/Text_Summarization_AI.git
cd Text_Summarization_AI
```

### 2. Install Dependencies

Using **uv** (recommended):
```bash
uv sync
```

Or using **pip**:
```bash
pip install -r requirements.txt
```

### 3. Start the Backend

```bash
cd backend
python app.py
```

The backend server will start at `http://localhost:8000` (or as configured).

### 4. Open the Frontend

Open `frontend/index.html` in your browser, or serve it with a local server:

```bash
cd frontend
python -m http.server 3000
```

Then visit `http://localhost:3000`.

---

## 🧪 Testing

Run the test script to validate model and API functionality:

```bash
python test.py
```

---

## 📖 Usage

1. Open the web app in your browser.
2. Paste or type a long document/article into the input field.
3. Click **"Summarize"**.
4. View the generated concise summary instantly.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source. See the repository for license details.

---

## 👤 Author

#### **Tarun Dange** — [@HeadTarun](https://github.com/HeadTarun)
#### **Krishna Kumrawat** - [@Krishna-aids](https://github.com/Krishna-aids)
#### **Abhinav Singh Kushwah** - [@Abhinavsingh000001](https://github.com/Abhinavsingh000001)
---

> ⭐ If you find this project useful, please consider giving it a star on GitHub!