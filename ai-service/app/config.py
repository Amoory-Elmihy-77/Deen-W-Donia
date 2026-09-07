import os
from dotenv import load_dotenv

load_dotenv()

AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "")
PORT = int(os.getenv("PORT", "8000"))

# Model name constants — never hardcoded per call site
# Groq deprecated the Llama 3.1/3.3 developer-tier models on 2026-08-16.
# Keep model choices centralised so the provider catalog can be updated safely.
MODEL_FAST = "openai/gpt-oss-20b"             # Smart Add, suggest-free-time
MODEL_BALANCED = "openai/gpt-oss-120b"        # decompose-goal, analyze-week
MODEL_BEST = "openai/gpt-oss-120b"           # opt-in "Best" tier

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

AI_TIMEOUT_SECONDS = 15
MAX_INPUT_CHARS = 500
