"""
Thin Groq client wrapper using the OpenAI SDK pointed at Groq's base_url.
The api_key is NEVER stored here — it's passed per-request from the Node API.
"""
import json
from openai import OpenAI, AuthenticationError, RateLimitError, APITimeoutError

from app.config import GROQ_BASE_URL, AI_TIMEOUT_SECONDS


def get_groq_client(api_key: str) -> OpenAI:
    """Create a fresh OpenAI client pointed at Groq — stateless, no key caching."""
    return OpenAI(
        api_key=api_key,
        base_url=GROQ_BASE_URL,
        timeout=AI_TIMEOUT_SECONDS,
    )


def run_structured(api_key: str, model: str, system_prompt: str, user_text: str) -> dict:
    """
    Call Groq and return a parsed JSON dict.
    Forces response_format=json_object — never parse free text for DB-bound data.
    """
    client = get_groq_client(api_key)
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1024,
        )
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)
    except AuthenticationError:
        raise ValueError("AI_KEY_INVALID")
    except RateLimitError:
        raise ValueError("AI_RATE_LIMITED")
    except APITimeoutError:
        raise ValueError("AI_TIMEOUT")
    except Exception as e:
        raise ValueError(f"AI_UPSTREAM_ERROR: {str(e)}")
