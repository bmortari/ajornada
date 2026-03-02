import asyncio
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/cube/meta")
async def cube_meta(req: Request):
    """Debug endpoint — returns Cube.js schema metadata."""
    try:
        cube_client = req.app.state.cube_client
        meta = await cube_client.get_meta()
        return meta
    except Exception as e:
        return {"error": str(e)}


# ── Dimension keys we want to show sample values for ──
_SAMPLE_DIMS = [
    "casos_novos.grau",
    "casos_novos.nome_ultima_classe",
    "casos_novos.nome_orgao",
    "casos_novos.procedimento",
    "casos_novos.formato",
    "datamart.competencia_grupo",
    "datamart.situacao",
]

_SUGGESTED_QUESTIONS = [
    "Quantos casos novos foram registrados no último trimestre?",
    "Qual o tempo médio de baixa dos processos por grau?",
    "Mostre a evolução mensal de sentenças em 2024",
    "Quais classes processuais têm mais casos pendentes?",
    "Compare casos novos e baixados por órgão julgador",
    "Qual o valor médio de causa no datamart?",
    "Quantos casos pendentes têm mais de 15 anos?",
    "Distribuição de casos novos por procedimento",
]


@router.get("/api/cube/schema-summary")
async def cube_schema_summary(req: Request):
    """Return a structured summary of available cubes, measures, dimensions
    and sample dimension values — used by the frontend ContextPanel."""
    try:
        cube_client = req.app.state.cube_client
        meta = await cube_client.get_meta()

        cubes_raw = meta.get("cubes", [])
        cubes_out = []

        for cube in cubes_raw:
            name = cube.get("name", "")
            title = cube.get("title", name)
            measures = [
                {
                    "name": m.get("name", ""),
                    "title": m.get("title", ""),
                    "shortTitle": m.get("shortTitle", m.get("title", "")),
                    "type": m.get("type", ""),
                }
                for m in cube.get("measures", [])
            ]
            dimensions = [
                {
                    "name": d.get("name", ""),
                    "title": d.get("title", ""),
                    "shortTitle": d.get("shortTitle", d.get("title", "")),
                    "type": d.get("type", ""),
                }
                for d in cube.get("dimensions", [])
                if d.get("type") != "time"  # skip time dims from listing
            ]
            time_dimensions = [
                {
                    "name": d.get("name", ""),
                    "title": d.get("title", ""),
                    "shortTitle": d.get("shortTitle", d.get("title", "")),
                }
                for d in cube.get("dimensions", [])
                if d.get("type") == "time"
            ]
            cubes_out.append(
                {
                    "name": name,
                    "title": title,
                    "measures": measures,
                    "dimensions": dimensions,
                    "timeDimensions": time_dimensions,
                }
            )

        # Fetch sample values for key dimensions (parallel)
        async def _fetch_values(dim: str):
            try:
                parts = dim.split(".")
                measure = f"{parts[0]}.count"
                result = await cube_client.query(
                    {
                        "measures": [measure],
                        "dimensions": [dim],
                        "order": {measure: "desc"},
                        "limit": 8,
                    }
                )
                rows = result.get("data", [])
                return dim, [row.get(dim, "") for row in rows if row.get(dim)]
            except Exception:
                return dim, []

        tasks = [_fetch_values(d) for d in _SAMPLE_DIMS]
        results = await asyncio.gather(*tasks)
        sample_values = {dim: vals for dim, vals in results if vals}

        return {
            "cubes": cubes_out,
            "sampleValues": sample_values,
            "suggestedQuestions": _SUGGESTED_QUESTIONS,
        }
    except Exception as e:
        return {"error": str(e)}
