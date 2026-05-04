FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pandas mysql-connector-python psycopg2-binary
COPY report.py .
EXPOSE 5002
CMD ["uvicorn", "report:app", "--host", "0.0.0.0", "--port", "5002"]
