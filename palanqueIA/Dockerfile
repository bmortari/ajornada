FROM python:3.11-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . /code/

EXPOSE 8002

# Corrigido para porta 8002
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--proxy-headers", "--forwarded-allow-ips", "*"]