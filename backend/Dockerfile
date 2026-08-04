FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home --uid 10001 medper && mkdir -p /app/storage && chown -R medper:medper /app
USER medper
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--proxy-headers"]
