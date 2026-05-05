# api/main.py
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import openai
import base64
import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Smart Closet API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before production
    allow_methods=["*"],
    allow_headers=["*"],
)

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
OPENWEATHER_KEY = os.getenv("OPENWEATHER_API_KEY")


# ── /tag-item ──────────────────────────────────────────────────
@app.post("/tag-item")
async def tag_item(file: UploadFile):
    """Analyze a garment photo and return structured tags."""
    image_data = await file.read()
    b64 = base64.b64encode(image_data).decode()

    prompt = """You are analyzing a clothing item photo. Return ONLY a valid JSON object.
No explanation, no markdown, just the raw JSON.

{
  "type": "specific item name e.g. 'slim-fit navy chinos' or 'white Oxford shirt'",
  "primary_color": "main color e.g. 'navy blue', 'off-white', 'charcoal grey'",
  "secondary_colors": ["list of accent colors if any"],
  "fabric": "best guess e.g. 'cotton', 'wool blend', 'denim', 'leather'",
  "fit": "one of: slim / regular / relaxed / oversized",
  "formality": 3,
  "occasions": ["casual", "office", "smart-casual", "outdoor", "athletic", "formal"],
  "seasons": ["spring", "summer", "fall", "winter"],
  "pattern": "one of: solid / stripe / check / floral / graphic / none",
  "style_tags": ["2-4 style descriptors e.g. minimalist, preppy, streetwear, classic"]
}

For formality: 1=gym clothes, 2=weekend casual, 3=smart casual, 4=business casual, 5=formal.
Only include seasons and occasions that genuinely apply."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": prompt}
                ]
            }],
            max_tokens=400,
            temperature=0.2,
            timeout=30,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if model includes them
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Could not parse model response: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /generate-outfits ──────────────────────────────────────────
class GenerateRequest(BaseModel):
    items: List[dict]
    occasion: str
    city: str

@app.post("/generate-outfits")
async def generate_outfits(req: GenerateRequest):
    """Generate outfit suggestions from the user's wardrobe."""

    # Get weather for the city
    weather = await fetch_weather(req.city)

    # Build compact wardrobe list (keep tokens low)
    wardrobe = "\n".join([
        f"- id:{item['id']} | {item['type']} | {item['primary_color']} | "
        f"formality:{item.get('formality',3)}/5 | occasions:{','.join(item.get('occasions',[]))}"
        for item in req.items
    ])

    system = """You are a personal stylist AI. You suggest outfits using items from a real wardrobe.
Rules:
- Only use item IDs that exist in the wardrobe list
- Never mix formality levels more than 1 step apart
- Always consider the weather
- Each outfit needs at least 2 items, ideally 3-4
Return ONLY a valid JSON array. No explanation, no markdown."""

    user_msg = f"""
Weather in {req.city}: {weather}
Occasion: {req.occasion}

Wardrobe:
{wardrobe}

Generate 4 outfit suggestions. Return this exact JSON structure:
[
  {{
    "outfit_id": "unique-string-1",
    "item_ids": ["id-from-wardrobe", "id-from-wardrobe"],
    "rationale": "1-2 sentences on why this works for today",
    "vibe": "one of: casual / smart-casual / office / elevated-casual / outdoor",
    "weather_score": 4,
    "occasion_score": 5
  }}
]"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=1000,
            temperature=0.7,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        outfits = json.loads(raw)
        return {"outfits": outfits, "weather": weather}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Could not parse outfits: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /swipe ─────────────────────────────────────────────────────
class SwipeRequest(BaseModel):
    outfit_id: str
    signal: str  # 'liked' | 'disliked' | 'saved'
    item_ids: List[str]

@app.post("/swipe")
async def record_swipe(req: SwipeRequest):
    """Record a swipe signal. In phase 1 this just logs to console.
    In phase 2, write this to your swipe_log table in Supabase."""
    print(f"[SWIPE] outfit:{req.outfit_id} signal:{req.signal} items:{req.item_ids}")
    # TODO phase 2: save to Supabase swipe_log table
    return {"ok": True}


# ── Weather helper ─────────────────────────────────────────────
async def fetch_weather(city: str) -> str:
    if not OPENWEATHER_KEY:
        return "68°F, partly cloudy"  # fallback if no API key yet
    try:
        async with httpx.AsyncClient() as http:
            res = await http.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"q": city, "appid": OPENWEATHER_KEY, "units": "imperial"},
                timeout=5,
            )
        data = res.json()
        temp = round(data["main"]["temp"])
        desc = data["weather"][0]["description"]
        wind = round(data["wind"]["speed"])
        return f"{temp}°F, {desc}, wind {wind}mph"
    except Exception:
        return "68°F, partly cloudy"  # graceful fallback


# ── Health check ───────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "message": "Smart Closet API running"}
