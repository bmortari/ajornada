"""Router for the Dashboard Builder Pipeline (4-step) + BI Agent dashboard generation."""

import logging

from fastapi import APIRouter, Request

from app.models.pipeline import (
    Step1Response,
    Step2Request,
    Step2Response,
    Step3Request,
    Step3Response,
    Step4Request,
    Step4Response,
    DashboardGenerateRequest,
    ReQueryRequest,
    SelectedFilter,
    SelectedMetric,
)
from app.services.pipeline_service import PipelineService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/step1", response_model=Step1Response)
async def pipeline_step1(req: Request):
    """Step 1: Return available filter dimensions with distinct values."""
    cube_client = req.app.state.cube_client
    service = PipelineService(cube_client=cube_client)
    return await service.get_filter_dimensions()


@router.post("/step2", response_model=Step2Response)
async def pipeline_step2(body: Step2Request, req: Request):
    """Step 2: AI suggests 2 metrics based on selected filters."""
    cube_client = req.app.state.cube_client
    schema_text = req.app.state.agent.schema_text
    service = PipelineService(cube_client=cube_client, schema_text=schema_text)
    return await service.suggest_metrics(body.filters, body.period, model=body.model)


@router.post("/step3", response_model=Step3Response)
async def pipeline_step3(body: Step3Request, req: Request):
    """Step 3: AI suggests chart types based on filters and metrics."""
    cube_client = req.app.state.cube_client
    schema_text = req.app.state.agent.schema_text
    service = PipelineService(cube_client=cube_client, schema_text=schema_text)
    return await service.suggest_chart_types(body.filters, body.metrics, model=body.model)


@router.post("/step4", response_model=Step4Response)
async def pipeline_step4(body: Step4Request, req: Request):
    """Step 4: AI designs dashboard, execute queries, return rendered dashboard."""
    cube_client = req.app.state.cube_client
    schema_text = req.app.state.agent.schema_text
    service = PipelineService(cube_client=cube_client, schema_text=schema_text)
    return await service.generate_dashboard(
        body.filters, body.period, body.metrics,
        chart_types=body.chart_types, model=body.model,
    )


@router.post("/generate", response_model=Step4Response)
async def generate_dashboard(body: DashboardGenerateRequest, req: Request):
    """Generate dashboard from BI Agent's collected spec (workspace_ready event)."""
    cube_client = req.app.state.cube_client
    schema_text = req.app.state.agent.schema_text
    service = PipelineService(cube_client=cube_client, schema_text=schema_text)

    logger.info("[generate] BI Agent spec: filters=%s, metrics=%s, chart_types=%s",
                body.filters, body.metrics, body.chart_types)

    # Convert BI agent filters to SelectedFilter objects for data filtering
    filters = []
    # Also collect dimension_filters for dashboard UI (filters without values)
    dimension_filters = []
    for f in body.filters:
        dim = f.get("dimension", "") if isinstance(f, dict) else str(f)
        title = f.get("title", dim.split(".")[-1].title()) if isinstance(f, dict) else dim
        vals = f.get("values", []) if isinstance(f, dict) else []
        # Normalize dimension name: add cube prefix if missing
        if "." not in dim:
            dim = f"casos_novos.{dim}"
        dimension_filters.append({"dimension": dim, "title": title})
        if vals:
            filters.append(SelectedFilter(
                dimension=dim,
                operator="equals",
                values=vals,
            ))

    metrics = [SelectedMetric(name=m) for m in body.metrics]

    return await service.generate_dashboard(
        filters, body.period, metrics,
        chart_types=body.chart_types, model=body.model,
        dimension_filters=dimension_filters,
    )


@router.post("/requery", response_model=Step4Response)
async def requery_dashboard(body: ReQueryRequest, req: Request):
    """Re-execute dashboard queries with updated filter values."""
    cube_client = req.app.state.cube_client
    schema_text = req.app.state.agent.schema_text
    service = PipelineService(cube_client=cube_client, schema_text=schema_text)

    logger.info("[requery] chart_defs=%d, filters=%s", len(body.chart_defs), body.filters)

    # Convert filter dicts to SelectedFilter objects
    filters = []
    for f in body.filters:
        dim = f.get("dimension", "")
        vals = f.get("values", [])
        if dim and vals:
            filters.append(SelectedFilter(
                dimension=dim,
                operator=f.get("operator", "equals"),
                values=vals,
            ))

    return await service.requery_dashboard(
        chart_defs=body.chart_defs,
        kpi_defs=body.kpi_defs,
        filters=filters,
        period=body.period,
        title=body.title,
    )
