import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None

def get_genai_client():
    global client
    if client is None:
        try:
            if not GENAI_API_KEY:
                raise ValueError("Chave de API não encontrada. Verifique seu .env")
            client = genai.Client(api_key=GENAI_API_KEY)
        except Exception as e:
            print(f"Erro ao criar cliente GenAI: {e}")
            raise
    return client
