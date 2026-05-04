FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir pika psycopg2-binary mysql-connector-python requests
COPY worker.py .
CMD ["python", "worker.py"]
