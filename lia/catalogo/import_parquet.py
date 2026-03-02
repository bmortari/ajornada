"""
Sistema LIA - Importar Embeddings do Parquet para PostgreSQL
==============================================================
Lê o Parquet gerado no Google Colab e insere na tabela
`catalogo_vetorial` com pgvector.

Uso:
    python catalogo/import_parquet.py
    python catalogo/import_parquet.py --input catalogo_vetorizado.parquet --reset

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""

import os
import sys
import time
import argparse
import json
import logging

import psycopg2
import psycopg2.extras
import pandas as pd
import numpy as np
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("CatalogImport")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

VECTOR_DIM = 1024
TABLE_NAME = "catalogo_vetorial"


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    return url


def setup_pgvector(conn):
    """Cria extensão pgvector e tabela se não existirem."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                id              SERIAL PRIMARY KEY,
                tipo            VARCHAR(10) NOT NULL,
                codigo          BIGINT NOT NULL,
                descricao       TEXT NOT NULL,
                metadata        JSONB NOT NULL DEFAULT '{{}}'::jsonb,
                embedding       vector({VECTOR_DIM}),
                data_vetorizacao TIMESTAMP DEFAULT NOW(),
                UNIQUE(tipo, codigo)
            );
        """)
        cur.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_embedding 
            ON {TABLE_NAME} USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
        """)
        cur.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_tipo ON {TABLE_NAME}(tipo);")
        cur.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_metadata ON {TABLE_NAME} USING GIN (metadata);")
    conn.commit()
    logger.info("[pgvector] Tabela pronta")


def import_parquet(input_path: str, reset: bool = False, batch_size: int = 1000):
    """Importa parquet com embeddings para PostgreSQL."""
    
    logger.info(f"[Parquet] Lendo {input_path}...")
    df = pd.read_parquet(input_path)
    total = len(df)
    logger.info(f"[Parquet] {total} itens carregados")
    
    # Verificar colunas
    required = {"tipo", "codigo", "descricao", "metadata_json", "embedding"}
    missing = required - set(df.columns)
    if missing:
        logger.error(f"Colunas faltando no parquet: {missing}")
        sys.exit(1)
    
    conn = psycopg2.connect(get_db_url())
    
    try:
        setup_pgvector(conn)
        
        if reset:
            with conn.cursor() as cur:
                cur.execute(f"TRUNCATE TABLE {TABLE_NAME};")
            conn.commit()
            logger.info("[Reset] Tabela limpa")
        
        start = time.time()
        inserted = 0
        
        for i in range(0, total, batch_size):
            batch = df.iloc[i:i + batch_size]
            
            with conn.cursor() as cur:
                values = []
                for _, row in batch.iterrows():
                    # Converter embedding: pode ser lista ou numpy array
                    emb = row["embedding"]
                    if isinstance(emb, np.ndarray):
                        emb = emb.tolist()
                    vec_str = "[" + ",".join(str(x) for x in emb) + "]"
                    
                    values.append((
                        row["tipo"],
                        int(row["codigo"]),
                        row["descricao"],
                        row["metadata_json"],
                        vec_str,
                    ))
                
                psycopg2.extras.execute_batch(cur, f"""
                    INSERT INTO {TABLE_NAME} (tipo, codigo, descricao, metadata, embedding)
                    VALUES (%s, %s, %s, %s::jsonb, %s::vector)
                    ON CONFLICT (tipo, codigo)
                    DO UPDATE SET
                        descricao = EXCLUDED.descricao,
                        metadata = EXCLUDED.metadata,
                        embedding = EXCLUDED.embedding,
                        data_vetorizacao = NOW()
                """, values, page_size=batch_size)
            
            conn.commit()
            inserted += len(batch)
            
            elapsed = time.time() - start
            rate = inserted / elapsed if elapsed > 0 else 0
            eta = (total - inserted) / rate if rate > 0 else 0
            
            batch_num = (i // batch_size) + 1
            total_batches = (total + batch_size - 1) // batch_size
            logger.info(f"[Batch {batch_num}/{total_batches}] {inserted}/{total} | {rate:.0f} itens/s | ETA: {eta:.0f}s")
        
        elapsed_total = time.time() - start
        logger.info(f"\n{'='*60}")
        logger.info(f"[CONCLUÍDO] Importação finalizada!")
        logger.info(f"  Itens importados: {inserted}")
        logger.info(f"  Tempo: {elapsed_total:.1f}s")
        logger.info(f"  Tabela: {TABLE_NAME}")
        logger.info(f"{'='*60}\n")
    
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Importar embeddings do Parquet para PostgreSQL (pgvector)")
    parser.add_argument("--input", "-i", default=os.path.join(CURRENT_DIR, "catalogo_vetorizado.parquet"),
                        help="Caminho do Parquet")
    parser.add_argument("--reset", action="store_true", help="Limpar tabela antes de importar")
    parser.add_argument("--batch", type=int, default=1000, help="Batch size (default: 1000)")
    args = parser.parse_args()
    import_parquet(args.input, reset=args.reset, batch_size=args.batch)


if __name__ == "__main__":
    main()
