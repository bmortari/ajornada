FROM postgres:16

COPY init/ /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/03_seed.sh
