import logging

logger = logging.getLogger(__name__)


def format_schema_for_prompt(meta: dict) -> str:
    """Convert Cube.js /meta response into a text description for the system prompt."""
    lines = ["## Schema Disponível no Cube.js\n"]
    cubes = meta.get("cubes", [])
    for cube in cubes:
        name = cube.get("name", "?")
        title = cube.get("title", name)
        desc = cube.get("description", "")
        lines.append(f"### Cube: `{name}` — {title}")
        if desc:
            lines.append(f"_{desc}_\n")

        # Dimensions
        dims = cube.get("dimensions", [])
        if dims:
            lines.append("**Dimensões:**")
            for d in dims:
                d_name = d.get("name", "?")
                d_type = d.get("type", "?")
                d_title = d.get("title", d_name)
                lines.append(f"  - `{name}.{d_name}` ({d_type}) — {d_title}")

        # Measures
        measures = cube.get("measures", [])
        if measures:
            lines.append("**Medidas:**")
            for m in measures:
                m_name = m.get("name", "?")
                m_type = m.get("type", "?")
                m_title = m.get("title", m_name)
                lines.append(f"  - `{name}.{m_name}` ({m_type}) — {m_title}")

        lines.append("")

    return "\n".join(lines)
