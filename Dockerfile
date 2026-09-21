FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

# Copy dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

# Copy source code
COPY . .

# Default port for Render
ENV PORT=10000
EXPOSE 10000

# Start FastAPI server
CMD ["python", "-m", "uvicorn", "scripts.yemennet_bridge:app", "--host", "0.0.0.0", "--port", "10000"]
