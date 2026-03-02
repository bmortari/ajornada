import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Mock data for demonstration purposes. This would normally come from a real API or Database.
MOCK_ARPS = [
    {
        "id": "arp-1",
        "numero": "12/2023",
        "descricao": "Computadores Desktop",
        "fornecedor": "Tech Store LTDA",
        "categoria": "TI",
        "valor": 125000.00,
        "validade": "2026-12-31",
        "link_sei": "sei.tre-go.jus.br/...1"
    },
    {
        "id": "arp-2",
        "numero": "45/2023",
        "descricao": "Notebooks Executivos",
        "fornecedor": "Informatica BR",
        "categoria": "TI",
        "valor": 95000.00,
        "validade": "2026-06-30",
        "link_sei": "sei.tre-go.jus.br/...2"
    },
    {
        "id": "arp-3",
        "numero": "03/2024",
        "descricao": "Serviços de Limpeza",
        "fornecedor": "Limpadora Goiania",
        "categoria": "Serviços",
        "valor": 550000.00,
        "validade": "2025-01-31",
        "link_sei": "sei.tre-go.jus.br/...3"
    },
    {
        "id": "arp-4",
        "numero": "18/2024",
        "descricao": "Cadeiras Ergonômicas",
        "fornecedor": "Móveis Office",
        "categoria": "Mobiliário",
        "valor": 45000.00,
        "validade": "2026-08-15",
        "link_sei": "sei.tre-go.jus.br/...4"
    }
]

# Dispensa de licitação limits (2024 values)
LIMITE_DISPENSA_OBRAS_SERVICOS_ENG = 119812.02
LIMITE_DISPENSA_COMPRAS_SERVICOS = 59906.02


async def search_arp_tool(codigo_catalogo: str, palavra_chave: str, valor_estimado: float) -> Dict[str, Any]:
    """
    Search for Atas de Registro de Preços (ARPs) based on a catalog code (CATMAT/CATSERV)
    and a keyword, and evaluate if the estimated value fits within the low-value procurement limits.
    
    Args:
        codigo_catalogo (str): The CATMAT or CATSERV code to search for.
        palavra_chave (str): A keyword related to the product or service.
        valor_estimado (float): The total estimated value of the procurement in BRL.
        
    Returns:
        Dict: A dictionary containing the found ARPs, limit evaluation, and suggested ETP fields.
    """
    logger.info(f"[Tool] Executing search_arp_tool for: {palavra_chave} (Code: {codigo_catalogo})")
    
    # 1. Search ARPs (Mock logic - filter by keyword)
    atas_encontradas = [
        arp for arp in MOCK_ARPS 
        if palavra_chave.lower() in arp["descricao"].lower() or palavra_chave.lower() in arp["categoria"].lower()
    ]
    
    # 2. Evaluate limits
    # Assuming standard purchases/services for now unless it's engineering
    limite = LIMITE_DISPENSA_COMPRAS_SERVICOS
    if "engenharia" in palavra_chave.lower() or "obra" in palavra_chave.lower():
        limite = LIMITE_DISPENSA_OBRAS_SERVICOS_ENG
        
    enquadra_dispensa = valor_estimado <= limite
    
    # 3. Generate preliminary ETP fields based on findings
    campos_etp_sugeridos = {
        "levantamento_mercado": f"Foi realizado um levantamento de mercado focado em Atas de Registro de Preços. Encontrou-se {len(atas_encontradas)} ARP(s) compatíveis com o objeto '{palavra_chave}'.",
        "viabilidade_contratacao": "A contratação mostra-se viável tècnicamente. " +
            ("Além disso, o valor estimado enquadra-se nos limites de dispensa de licitação conforme Art. 75, II da Lei 14.133/2021." if enquadra_dispensa else "O valor ultrapassa o limite de dispensa, exigindo processo licitatório regular ou adesão à ARP."),
        "estimativa_valor": f"O valor estimado inicial é de R$ {valor_estimado:,.2f}. O limite para dispensa aplicável é R$ {limite:,.2f}."
    }
    
    result = {
        "atas_encontradas": atas_encontradas,
        "enquadra_dispensa_licitacao": enquadra_dispensa,
        "limite_dispensa_aplicado": limite,
        "valor_estimado_informado": valor_estimado,
        "campos_etp_sugeridos": campos_etp_sugeridos
    }
    
    return result

# Schema definition for OpenRouter/OpenAI tool calling
SEARCH_ARP_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "search_arp_tool",
        "description": "Searches for existing Atas de Registro de Preços (ARPs) for piggybacking (carona) and evaluates if the procurement value falls under the 'dispensa de licitação' (low value) limits. Call this tool when the user has provided all 4 crucial ETP points AND agreed on a CATMAT/CATSERV code.",
        "parameters": {
            "type": "object",
            "properties": {
                "codigo_catalogo": {
                    "type": "string",
                    "description": "The CATMAT or CATSERV code (e.g., '12345' or 'Serviço de Limpeza')."
                },
                "palavra_chave": {
                    "type": "string",
                    "description": "The main keyword or descriptor of the item/service to search for."
                },
                "valor_estimado": {
                    "type": "number",
                    "description": "The total estimated value of the procurement in BRL. E.g., 50000.00."
                }
            },
            "required": ["codigo_catalogo", "palavra_chave", "valor_estimado"]
        }
    }
}
