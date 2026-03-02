"""
Sistema LIA - Exportar Catálogo para CSV
==========================================
Exporta materiais + serviços do PostgreSQL para um CSV unificado.
O CSV gerado é usado no Google Colab para gerar embeddings.

Uso:
    python catalogo/export_csv.py
    python catalogo/export_csv.py --output catalogo_gov.csv

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""

import os
import sys
import csv
import json
import argparse
import logging

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("CatalogExport")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    return url


def export(output_path: str):
    conn = psycopg2.connect(get_db_url())
    
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Materiais
            cur.execute("""
                SELECT codigo_item AS codigo, descricao_item AS descricao,
                       codigo_grupo, nome_grupo, codigo_classe, nome_classe,
                       codigo_pdm, nome_pdm, status_item, item_sustentavel
                FROM materiais
                WHERE descricao_item IS NOT NULL AND descricao_item != ''
            """)
            materiais = cur.fetchall()
            
            # Serviços
            cur.execute("""
                SELECT codigo_servico AS codigo, nome_servico AS descricao,
                       codigo_secao, nome_secao, codigo_divisao, nome_divisao,
                       codigo_grupo, nome_grupo, codigo_classe, nome_classe,
                       codigo_subclasse, nome_subclasse, codigo_cpc, status_servico
                FROM servicos
                WHERE nome_servico IS NOT NULL AND nome_servico != ''
            """)
            servicos = cur.fetchall()
        
        # Escrever CSV unificado
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["tipo", "codigo", "descricao", "metadata_json"])
            
            for row in materiais:
                meta = {
                    "codigo_grupo": row["codigo_grupo"] or 0,
                    "nome_grupo": row["nome_grupo"] or "",
                    "codigo_classe": row["codigo_classe"] or 0,
                    "nome_classe": row["nome_classe"] or "",
                    "codigo_pdm": row["codigo_pdm"] or 0,
                    "nome_pdm": row["nome_pdm"] or "",
                    "status_ativo": bool(row["status_item"]),
                    "sustentavel": bool(row["item_sustentavel"]),
                }
                writer.writerow(["material", row["codigo"], row["descricao"], json.dumps(meta)])
            
            for row in servicos:
                meta = {
                    "codigo_secao": row["codigo_secao"] or 0,
                    "nome_secao": row["nome_secao"] or "",
                    "codigo_divisao": row["codigo_divisao"] or 0,
                    "nome_divisao": row["nome_divisao"] or "",
                    "codigo_grupo": row["codigo_grupo"] or 0,
                    "nome_grupo": row["nome_grupo"] or "",
                    "codigo_classe": row["codigo_classe"] or 0,
                    "nome_classe": row["nome_classe"] or "",
                    "codigo_subclasse": row["codigo_subclasse"] or 0,
                    "nome_subclasse": row["nome_subclasse"] or "",
                    "codigo_cpc": row["codigo_cpc"] or 0,
                    "status_ativo": bool(row["status_servico"]),
                }
                writer.writerow(["servico", row["codigo"], row["descricao"], json.dumps(meta)])
        
        total = len(materiais) + len(servicos)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        logger.info(f"Exportado: {total} itens ({len(materiais)} mat + {len(servicos)} srv)")
        logger.info(f"Arquivo: {output_path} ({size_mb:.1f} MB)")
    
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Exportar catálogo CATMAT/CATSERV para CSV")
    parser.add_argument("--output", "-o", default=os.path.join(CURRENT_DIR, "catalogo_gov.csv"),
                        help="Caminho do CSV de saída")
    args = parser.parse_args()
    export(args.output)


if __name__ == "__main__":
    main()
