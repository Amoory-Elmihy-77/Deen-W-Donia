from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.internal import router as internal_router

app = FastAPI(
    title="دين ودنيا — AI Service",
    description="Internal FastAPI AI service (Groq BYOK). Not publicly accessible.",
    version="1.0.0",
    docs_url="/docs",  # disable in production
)

# Only allow calls from the Node server (same internal network)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(internal_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}
