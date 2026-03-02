# ALTERNATIVA: Usar imagem baseada no Bullseye
# Esta versão usa uma imagem Python mais antiga baseada no Debian Bullseye
# onde o wkhtmltopdf está disponível nos repositórios oficiais

FROM python:3.11-bullseye

# Defina o diretório de trabalho dentro do container
WORKDIR /code

# Instale dependências do sistema (wkhtmltopdf)
RUN apt-get update && \
    apt-get install -y --no-install-recommends wkhtmltopdf && \
    rm -rf /var/lib/apt/lists/*

# Copie o arquivo de dependências primeiro para aproveitar o cache do Docker
COPY ./requirements.txt /code/requirements.txt

# Instale as dependências Python
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copie todo o resto do seu código para dentro do container
COPY . /code/

# Exponha a porta em que o uvicorn irá rodar dentro do container
EXPOSE 8006

# Comando para iniciar a aplicação quando o container for executado
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006", "--proxy-headers", "--forwarded-allow-ips", "*"]