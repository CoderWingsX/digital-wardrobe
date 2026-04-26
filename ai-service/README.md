# Digital Wardrobe AI Service

A microservice that analyzes clothing images using AI (via [OpenRouter](https://openrouter.ai)) and returns structured metadata for the Digital Wardrobe app.

## Quick Start

### 1. Install dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. Configure API key

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your OpenRouter API key
# Get one at: https://openrouter.ai/settings/keys
```

### 3. Run the server

```bash
python main.py
```

The server starts at `http://localhost:8000`.

- **API docs**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

### 4. Test with curl

```bash
curl -X POST http://localhost:8000/analyze \
  -F "image=@path/to/clothing-photo.jpg"
```

## API Endpoints

### `POST /analyze`

Upload a clothing image, get back structured data.

**Request**: `multipart/form-data` with an `image` file field.

**Response**:
```json
{
  "name": "Navy Blue Oxford Shirt",
  "category": "Tops",
  "description": "A classic navy blue Oxford button-down shirt.",
  "metadata": {
    "Color": "Navy Blue",
    "Size": "",
    "Brand": "",
    "Material": "Cotton"
  },
  "tags": ["formal", "button-down", "oxford", "navy"]
}
```

### `GET /health`

Returns service status and configuration info.

## Changing the AI Model

Edit `OPENROUTER_MODEL` in `.env` to switch models:

```env
# Fast and cheap (default)
OPENROUTER_MODEL=google/gemini-2.0-flash-001

# Higher quality
OPENROUTER_MODEL=anthropic/claude-sonnet-4

# Alternative
OPENROUTER_MODEL=openai/gpt-4o
```

Any vision-capable model on OpenRouter will work.

## Project Structure

```
ai-service/
├── main.py              # FastAPI app, endpoints, CORS
├── analyzer.py          # OpenRouter vision API integration
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variable template
├── .env                 # Your local config (git-ignored)
└── README.md            # This file
```
