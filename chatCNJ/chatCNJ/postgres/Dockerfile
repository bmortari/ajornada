FROM postgres:16

# Install pgvector
RUN apt-get update && \
    apt-get install -y postgresql-16-pgvector python3 python3-pip && \
    pip3 install --break-system-packages psycopg2-binary && \
    rm -rf /var/lib/apt/lists/*

COPY init/ /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/*.sh
