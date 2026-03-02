"""
Sistema LIA - Router de Configuração (API)
============================================
Expõe configurações de artefatos e campos como JSON
para consumo pelo frontend React.
"""

from fastapi import APIRouter
from app.models.artefatos import ARTEFATO_MAP

router = APIRouter()


@router.get("/artefatos")
async def listar_config_artefatos():
    """
    Retorna a configuração de todos os tipos de artefato
    (títulos, siglas, ícones, cores, dependências, campos).
    Usado pelo frontend para renderizar formulários dinamicamente.
    """
    resultado = {}
    for tipo, config in ARTEFATO_MAP.items():
        # Serializar campos_config (remover referências ao model)
        campos = {}
        for campo_nome, campo_cfg in config.get("config", {}).items():
            campos[campo_nome] = {
                k: v for k, v in campo_cfg.items()
                if k != "model"  # Excluir referências Python
            }

        resultado[tipo] = {
            "tipo": tipo,
            "titulo": config.get("titulo", tipo),
            "sigla": config.get("sigla", tipo.upper()),
            "icone": config.get("icone", "file-text"),
            "cor": config.get("cor", "#666"),
            "requer": config.get("requer", []),
            "ordem": config.get("ordem", 99),
            "fluxo": config.get("fluxo"),
            "virtual": config.get("virtual", False),
            "condicional": config.get("condicional"),
            "campos_config": campos,
        }

    return resultado
