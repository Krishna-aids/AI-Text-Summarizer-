FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
COPY frontend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Download the T5 model during build (baked into image)
RUN python -c "\
from transformers import T5Tokenizer, T5ForConditionalGeneration; \
tokenizer = T5Tokenizer.from_pretrained('t5-base'); \
model = T5ForConditionalGeneration.from_pretrained('t5-base'); \
tokenizer.save_pretrained('backend/model'); \
model.save_pretrained('backend/model')"

# Expose HF Spaces port (must be 7860)
EXPOSE 7860

# Start the Flask server
CMD ["python", "backend/app.py"]
