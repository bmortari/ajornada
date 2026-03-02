"""
Catálogo CATMAT/CATSERV - Scraper + Vetorizador + Busca Semântica
=================================================================

Módulos:
  - scrapy.py    → Sincroniza catálogo do ComprasGov → PostgreSQL
  - vectorize.py → Gera embeddings BGE-M3 → pgvector (PostgreSQL)
  - search.py    → Busca semântica na tabela `catalogo_vetorial`

Uso rápido:
  from catalogo.search import CatalogoSearcher
  
  searcher = CatalogoSearcher()
  results = searcher.search("computador desktop", top_k=5)
"""

from .search import CatalogoSearcher, SearchResult

__all__ = ["CatalogoSearcher", "SearchResult"]
