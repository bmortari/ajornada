"""
Sistema LIA - Serviço de Notícias (RSS)
=========================================
Busca notícias sobre Licitações e IA no Google News RSS.
Extraído de views/home_views.py para eliminar dependência de Jinja2.
"""

import logging
from datetime import datetime
import httpx
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)


async def fetch_licitacao_news():
    """Busca notícias sobre Licitações e IA no Google News RSS."""
    feeds = [
        "https://news.google.com/rss/search?q=licitações+públicas+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        "https://news.google.com/rss/search?q=inteligência+artificial+IA+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    ]
    noticias = []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            for rss_url in feeds:
                try:
                    response = await client.get(rss_url)
                    if response.status_code == 200:
                        root = ET.fromstring(response.content)
                        for item in root.findall(".//item"):
                            title = item.find("title").text if item.find("title") is not None else "Sem título"
                            link = item.find("link").text if item.find("link") is not None else "#"
                            pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
                            data_fmt = "Recente"
                            if pub_date:
                                try:
                                    dt = datetime.strptime(pub_date[:16], "%a, %d %b %Y")
                                    dias_atras = (datetime.utcnow() - dt).days
                                    if dias_atras <= 7:
                                        data_fmt = dt.strftime("%d %b")
                                    else:
                                        continue
                                except Exception:
                                    pass
                            if not any(n["titulo"].lower() == title.lower() for n in noticias):
                                noticias.append({
                                    "titulo": title,
                                    "link": link,
                                    "data": data_fmt,
                                    "descricao": title
                                })
                except Exception as e:
                    logger.warning(f"Erro ao buscar feed {rss_url}: {e}")
                    continue

        if noticias:
            return noticias[:2]

    except Exception as e:
        logger.error(f"Erro geral ao buscar notícias RSS: {e}")

    # Fallback
    return [
        {
            "titulo": "Notícias sobre Licitações e IA em tempo real",
            "link": "https://news.google.com/search?q=licitações+públicas+brasil",
            "data": "Hoje",
            "descricao": "Atualizações contínuas sobre licitações públicas e inteligência artificial no Brasil"
        },
        {
            "titulo": "Acompanhe as últimas tendências em contratações públicas",
            "link": "https://news.google.com/search?q=inteligência+artificial+brasil",
            "data": "Hoje",
            "descricao": "Tecnologia e inovação em processos de licitação"
        }
    ]
