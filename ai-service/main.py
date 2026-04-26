# ai-service/main.py
"""
Digital Wardrobe AI Microservice
Analyzes clothing images and returns structured metadata.

Usage:
    uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from analyzer import analyze_clothing_image

load_dotenv()

# Maximum upload size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate configuration on startup."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")

    if not api_key or api_key == "sk-or-v1-your-key-here":
        print("\n" + "=" * 60)
        print("⚠️  WARNING: OPENROUTER_API_KEY is not set!")
        print("   Copy .env.example to .env and add your key.")
        print("   Get a key at: https://openrouter.ai/settings/keys")
        print("=" * 60 + "\n")
    else:
        print(f"\n✅ AI Service ready — using model: {model}\n")

    yield


app = FastAPI(
    title="Digital Wardrobe AI Service",
    description="Analyzes clothing images and returns structured metadata",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React Native dev server and any local dev tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    has_key = bool(os.getenv("OPENROUTER_API_KEY"))
    model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
    return {
        "status": "healthy",
        "api_key_configured": has_key,
        "model": model,
    }


@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    """
    Analyze a clothing image and return structured data.
    
    Accepts: JPEG, PNG, WebP, HEIC images up to 10 MB.
    
    Returns:
        JSON with name, category, description, metadata (Color, Size, Brand, Material), and tags.
    """
    # Validate content type
    content_type = image.content_type or "image/jpeg"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {content_type}. "
                   f"Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    # Read and validate file size
    image_bytes = await image.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file.")

    # Analyze the image
    try:
        result = await analyze_clothing_image(image_bytes, content_type)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        # Provide helpful messages for common errors
        if "401" in error_msg:
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenRouter API key. Check your .env file.",
            )
        if "402" in error_msg:
            raise HTTPException(
                status_code=402,
                detail="Insufficient OpenRouter credits. Add credits at openrouter.ai.",
            )
        if "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limited by OpenRouter. Please try again in a moment.",
            )
        raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg}")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
