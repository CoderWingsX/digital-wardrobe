# ai-service/analyzer.py
"""
Clothing image analysis using OpenRouter's vision API.
Sends images to a vision model via OpenRouter and extracts structured clothing data.
"""

import base64
import json
import httpx
import os
from typing import Optional

# Valid categories that match the mobile app's CATEGORIES constant
VALID_CATEGORIES = [
    "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
    "Dresses", "Activewear", "Sleepwear", "Underwear", "Other"
]

ANALYSIS_PROMPT = """You are a clothing analysis expert. Analyze this image of a clothing item and extract structured data.

Return ONLY a valid JSON object with these exact fields:

{
  "name": "A short, descriptive name for this clothing item (e.g. 'Navy Blue Oxford Shirt')",
  "category": "One of: Tops, Bottoms, Outerwear, Footwear, Accessories, Dresses, Activewear, Sleepwear, Underwear, Other",
  "description": "A brief 1-2 sentence description of the item",
  "metadata": {
    "Color": "Primary color(s) of the item",
    "Size": "Size if visible on a label, otherwise empty string",
    "Brand": "Brand name if visible, otherwise empty string",
    "Material": "Best guess at the material (e.g. Cotton, Polyester, Denim, Leather)"
  },
  "tags": ["array", "of", "relevant", "tags", "for", "this", "item"]
}

Rules:
- "category" MUST be exactly one of: Tops, Bottoms, Outerwear, Footwear, Accessories, Dresses, Activewear, Sleepwear, Underwear, Other
- "tags" should include style descriptors (casual, formal, sporty), patterns (striped, plaid), season (summer, winter), and any other relevant attributes
- Keep "name" concise (2-5 words)
- If you cannot determine Size or Brand from the image, use an empty string ""
- Return ONLY the JSON object, no markdown formatting, no code blocks, no explanation
"""


async def analyze_clothing_image(
    image_bytes: bytes,
    content_type: str = "image/jpeg",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> dict:
    """
    Analyze a clothing image using OpenRouter's vision API.
    
    Args:
        image_bytes: Raw image bytes
        content_type: MIME type of the image (image/jpeg, image/png, etc.)
        api_key: OpenRouter API key (falls back to env var)
        model: OpenRouter model identifier (falls back to env var)
    
    Returns:
        Dict with keys: name, category, description, metadata, tags
    
    Raises:
        ValueError: If API key is missing or response is unparseable
        httpx.HTTPStatusError: If OpenRouter returns an error
    """
    api_key = api_key or os.getenv("OPENROUTER_API_KEY")
    model = model or os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")

    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is required")

    # Encode image to base64 data URI
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{content_type};base64,{base64_image}"

    # Build OpenAI-compatible request with vision content
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri},
                    },
                    {
                        "type": "text",
                        "text": ANALYSIS_PROMPT,
                    },
                ],
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/CoderWingsX/digital-wardrobe",
        "X-OpenRouter-Title": "Digital Wardrobe AI",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()

    result = response.json()
    raw_content = result["choices"][0]["message"]["content"]

    # Parse the JSON from the model's response
    parsed = _parse_ai_response(raw_content)
    return parsed


def _parse_ai_response(raw: str) -> dict:
    """
    Parse and validate the AI model's JSON response.
    Handles cases where the model wraps JSON in markdown code blocks.
    """
    text = raw.strip()

    # Strip markdown code block wrappers if present
    if text.startswith("```"):
        # Remove opening ```json or ```
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
        # Remove closing ```
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse AI response as JSON: {e}\nRaw: {raw[:500]}")

    # Validate and sanitize category
    category = data.get("category", "Other")
    if category not in VALID_CATEGORIES:
        # Try case-insensitive match
        match = next((c for c in VALID_CATEGORIES if c.lower() == category.lower()), None)
        data["category"] = match or "Other"

    # Ensure required fields exist with defaults
    data.setdefault("name", "Unknown Item")
    data.setdefault("description", "")
    data.setdefault("metadata", {})
    data.setdefault("tags", [])

    # Ensure metadata has the expected keys
    meta = data["metadata"]
    for key in ["Color", "Size", "Brand", "Material"]:
        meta.setdefault(key, "")

    # Ensure tags is a list of strings
    if not isinstance(data["tags"], list):
        data["tags"] = []
    data["tags"] = [str(t) for t in data["tags"]]

    return data
