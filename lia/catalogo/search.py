"""
Sistema LIA - Busca Semântica no Catálogo CATMAT/CATSERV
=========================================================
Busca vetorial no PostgreSQL (pgvector) usando BGE-M3.

Uso:
  CLI:    python catalogo/search.py "computador desktop" -k 5
  Módulo: from catalogo.search import CatalogoSearcher

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""

import os
import sys
import argparse
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

logger = logging.getLogger("CatalogSearch")

# Paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

TABLE_NAME = "catalogo_vetorial"


@dataclass
class SearchResult:
    """Resultado de busca no catálogo vetorial."""
    id: int
    tipo: str           # "material" ou "servico"
    codigo: int         # codigo_item ou codigo_servico
    descricao: str      # Texto original
    score: float        # Similaridade cosseno (0-1, maior = melhor)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tipo": self.tipo,
            "codigo": self.codigo,
            "descricao": self.descricao,
            "score": round(self.score, 4),
            **self.metadata,
        }


def _get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    return url


class CatalogoSearcher:
    """
    Busca semântica no catálogo unificado CATMAT/CATSERV via pgvector.
    
    Usa BGE-M3 para gerar embedding da query e busca por similaridade
    cosseno direto no PostgreSQL.
    
    Exemplo:
        searcher = CatalogoSearcher()
        results = searcher.search("computador para escritório", top_k=5)
        for r in results:
            print(f"{r.codigo} - {r.descricao} ({r.score:.2f})")
    """
    
    def __init__(self, db_url: str = None):
        self._db_url = db_url or _get_db_url()
        self._model = None
    
    def _ensure_model(self):
        """Lazy loading do modelo BGE-M3."""
        if self._model is not None:
            return
        
        from sentence_transformers import SentenceTransformer
        
        logger.info("[Search] Carregando modelo BGE-M3...")
        self._model = SentenceTransformer("BAAI/bge-m3", device="cpu")
        logger.info("[Search] Modelo carregado!")
    
    def _embed_query(self, text: str) -> List[float]:
        """Gera embedding para uma query."""
        self._ensure_model()
        embedding = self._model.encode(
            [text], 
            normalize_embeddings=True,
        )
        return embedding[0].tolist()
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        tipo_filtro: Optional[str] = None,
        apenas_ativos: bool = True,
    ) -> List[SearchResult]:
        """
        Busca semântica no catálogo.
        
        Args:
            query: Texto para buscar (ex: "monitor LED 24 polegadas")
            top_k: Quantidade de resultados (default: 10)
            tipo_filtro: "material" ou "servico" (None = ambos)
            apenas_ativos: Filtrar apenas itens ativos (default: True)
        
        Returns:
            Lista de SearchResult ordenada por relevância
        """
        # Gerar embedding da query
        query_vec = self._embed_query(query)
        vec_str = "[" + ",".join(str(x) for x in query_vec) + "]"
        
        # Construir query SQL com pgvector
        # 1 - cosine_distance = cosine_similarity
        where_clauses = ["embedding IS NOT NULL"]
        params: list = []
        
        if tipo_filtro:
            where_clauses.append("tipo = %s")
            params.append(tipo_filtro)
        
        if apenas_ativos:
            where_clauses.append("(metadata->>'status_ativo')::boolean = true")
        
        where_sql = " AND ".join(where_clauses)
        
        sql = f"""
            SELECT 
                id, tipo, codigo, descricao, metadata,
                1 - (embedding <=> %s::vector) AS score
            FROM {TABLE_NAME}
            WHERE {where_sql}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        
        params = [vec_str] + params  # primeiro param: vetor para score
        # Inserir vec_str novamente para ORDER BY e limit
        # Reorganizar: score usa vec_str, WHERE usa filters, ORDER BY usa vec_str
        
        # Query reescrita para clareza
        sql = f"""
            SELECT 
                id, tipo, codigo, descricao, metadata,
                1 - (embedding <=> %(vec)s::vector) AS score
            FROM {TABLE_NAME}
            WHERE {where_sql}
            ORDER BY embedding <=> %(vec)s::vector
            LIMIT %(limit)s
        """
        
        named_params = {"vec": vec_str, "limit": top_k}
        if tipo_filtro:
            # Rewrite WHERE with named params
            where_clauses_named = ["embedding IS NOT NULL"]
            where_clauses_named.append("tipo = %(tipo)s")
            named_params["tipo"] = tipo_filtro
            if apenas_ativos:
                where_clauses_named.append("(metadata->>'status_ativo')::boolean = true")
            where_sql = " AND ".join(where_clauses_named)
        else:
            where_clauses_named = ["embedding IS NOT NULL"]
            if apenas_ativos:
                where_clauses_named.append("(metadata->>'status_ativo')::boolean = true")
            where_sql = " AND ".join(where_clauses_named)
        
        sql = f"""
            SELECT 
                id, tipo, codigo, descricao, metadata,
                1 - (embedding <=> %(vec)s::vector) AS score
            FROM {TABLE_NAME}
            WHERE {where_sql}
            ORDER BY embedding <=> %(vec)s::vector
            LIMIT %(limit)s
        """
        
        conn = psycopg2.connect(self._db_url)
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, named_params)
                rows = cur.fetchall()
        finally:
            conn.close()
        
        results = []
        for row in rows:
            meta = row["metadata"] if isinstance(row["metadata"], dict) else {}
            results.append(SearchResult(
                id=row["id"],
                tipo=row["tipo"],
                codigo=row["codigo"],
                descricao=row["descricao"],
                score=float(row["score"]),
                metadata=meta,
            ))
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas da tabela vetorial."""
        conn = psycopg2.connect(self._db_url)
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT count(*) FROM {TABLE_NAME}")
                total = cur.fetchone()[0]
                
                cur.execute(f"SELECT count(*) FROM {TABLE_NAME} WHERE embedding IS NOT NULL")
                vetorizados = cur.fetchone()[0]
                
                cur.execute(f"SELECT count(*) FROM {TABLE_NAME} WHERE tipo = 'material'")
                materiais = cur.fetchone()[0]
                
                cur.execute(f"SELECT count(*) FROM {TABLE_NAME} WHERE tipo = 'servico'")
                servicos = cur.fetchone()[0]
        finally:
            conn.close()
        
        return {
            "total_itens": total,
            "vetorizados": vetorizados,
            "materiais": materiais,
            "servicos": servicos,
            "modelo": "BAAI/bge-m3",
            "dimensoes": 1024,
            "tabela": TABLE_NAME,
        }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Busca semântica no Catálogo CATMAT/CATSERV (pgvector)"
    )
    parser.add_argument("query", type=str, help="Texto para buscar")
    parser.add_argument("-k", "--top-k", type=int, default=10, help="Resultados (default: 10)")
    parser.add_argument("-t", "--tipo", choices=["material", "servico"], default=None, help="Filtrar por tipo")
    parser.add_argument("--inativos", action="store_true", help="Incluir inativos")
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    
    searcher = CatalogoSearcher()
    results = searcher.search(
        query=args.query,
        top_k=args.top_k,
        tipo_filtro=args.tipo,
        apenas_ativos=not args.inativos,
    )
    
    if not results:
        print("\n❌ Nenhum resultado encontrado.\n")
        return
    
    print(f"\n🔍 Busca: \"{args.query}\"")
    print(f"📊 {len(results)} resultados\n")
    print(f"{'#':<4} {'Score':<8} {'Tipo':<10} {'Código':<15} {'Descrição'}")
    print("-" * 90)
    
    for i, r in enumerate(results, 1):
        tipo_label = "📦 MAT" if r.tipo == "material" else "🔧 SRV"
        desc = r.descricao[:55] + "..." if len(r.descricao) > 55 else r.descricao
        print(f"{i:<4} {r.score:<8.4f} {tipo_label:<10} {r.codigo:<15} {desc}")
    
    print()


if __name__ == "__main__":
    main()
