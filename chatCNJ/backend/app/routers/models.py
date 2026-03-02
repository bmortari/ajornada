"""Models router — list available LLM models."""

from fastapi import APIRouter

router = APIRouter()

AVAILABLE_MODELS = [
    {"id": "anthropic/claude-3-haiku", "label": "Anthropic: Claude 3 Haiku", "provider": "Anthropic", "free": False},
    {"id": "meta-llama/llama-3.3-70b-instruct:free", "label": "Meta: Llama 3.3 70B Instruct", "provider": "OpenRouter", "free": True},
    {"id": "mistralai/mistral-small-3.1-24b-instruct:free", "label": "Mistral: Mistral Small 3.1 24B", "provider": "OpenRouter", "free": True},
    {"id": "arcee-ai/trinity-large-preview:free", "label": "Arcee AI: Trinity Large Preview", "provider": "OpenRouter", "free": True},
    {"id": "stepfun/step-3.5-flash:free", "label": "StepFun: Step 3.5 Flash", "provider": "OpenRouter", "free": True},
    {"id": "z-ai/glm-4.5-air:free", "label": "Z.ai: GLM 4.5 Air", "provider": "OpenRouter", "free": True},
    {"id": "nvidia/nemotron-3-nano-30b-a3b:free", "label": "NVIDIA: Nemotron 3 Nano 30B A3B", "provider": "OpenRouter", "free": True},
    {"id": "openai/gpt-oss-120b:free", "label": "OpenAI: gpt-oss-120b", "provider": "OpenRouter", "free": True},
    {"id": "upstage/solar-pro-3:free", "label": "Upstage: Solar Pro 3", "provider": "OpenRouter", "free": True},
    {"id": "arcee-ai/trinity-mini:free", "label": "Arcee AI: Trinity Mini", "provider": "OpenRouter", "free": True},
    {"id": "nvidia/nemotron-nano-9b-v2:free", "label": "NVIDIA: Nemotron Nano 9B V2", "provider": "OpenRouter", "free": True},
    {"id": "nvidia/nemotron-nano-12b-v2-vl:free", "label": "NVIDIA: Nemotron Nano 12B V2 VL", "provider": "OpenRouter", "free": True},
    {"id": "openai/gpt-oss-20b:free", "label": "OpenAI: gpt-oss-20b", "provider": "OpenRouter", "free": True},
    {"id": "qwen/qwen3-coder:free", "label": "Qwen: Qwen3 Coder", "provider": "OpenRouter", "free": True},
    {"id": "qwen/qwen3-next-80b-a3b-instruct:free", "label": "Qwen: Qwen3 Next 80B A3B Instruct", "provider": "OpenRouter", "free": True},
    {"id": "google/gemma-3-27b-it:free", "label": "Google: Gemma 3 27B", "provider": "OpenRouter", "free": True},
    {"id": "qwen/qwen3-4b:free", "label": "Qwen: Qwen3 4B", "provider": "OpenRouter", "free": True},
]


@router.get("/api/models")
async def list_models():
    """List available LLM models."""
    return {"models": AVAILABLE_MODELS}
