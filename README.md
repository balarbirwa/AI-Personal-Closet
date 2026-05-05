# Smart Closet — Phase 1 Setup Guide

## What you're building
Upload a photo of a garment → AI tags it → save to your closet → generate outfit suggestions.

---

## Step 1: Get your API keys (15 min)

### OpenAI (required)
1. Go to platform.openai.com → sign up or log in
2. Top right → API keys → Create new secret key
3. Copy it — you'll need it in Step 4

### Supabase (required — free)
1. Go to supabase.com → New project
2. Pick a name like "smart-closet", choose a region close to you
3. Wait ~2 min for it to provision
4. Go to Settings → API
5. Copy "Project URL" and "anon public" key

### OpenWeatherMap (optional for phase 1)
1. openweathermap.org → sign up → API keys tab
2. Copy your default key (takes ~10 min to activate)

---

## Step 2: Set up the database (5 min)

1. In your Supabase project → SQL Editor → New query
2. Copy the entire contents of `supabase_schema.sql`
3. Paste it in and click Run
4. You should see "Success" — your tables and storage bucket are created

---

## Step 3: Set up the backend (10 min)

```bash
cd smart-closet-phase1/api

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Now open `.env` in any text editor and fill in your real keys:
```
OPENAI_API_KEY=sk-...your key...
SUPABASE_URL=https://...your url...
SUPABASE_SERVICE_KEY=...your service key...
```

Start the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see: `Uvicorn running on http://0.0.0.0:8000`

Test it works — open your browser to `http://localhost:8000`
You should see `{"status":"ok","message":"Smart Closet API running"}`

---

## Step 4: Find your Mac's local IP (2 min)

Your iPhone needs to reach your Mac over WiFi.

```bash
ipconfig getifaddr en0
```

You'll see something like `192.168.1.45` — copy this.

Make sure your iPhone is on the **same WiFi network** as your Mac.

---

## Step 5: Set up the mobile app (10 min)

```bash
cd smart-closet-phase1/mobile

# Install dependencies
npm install

# Install Expo Go on your iPhone from the App Store (search "Expo Go")
```

Open `lib/config.ts` and fill in:
```typescript
export const API_BASE_URL = 'http://192.168.1.45:8000';  // your IP from step 4
export const SUPABASE_URL = 'https://...';                 // from step 1
export const SUPABASE_ANON_KEY = '...';                    // from step 1
```

Start the app:
```bash
npx expo start
```

A QR code will appear in your terminal. Open your iPhone camera and scan it.
The app will open in Expo Go on your phone.

---

## Step 6: Test the full loop

1. Tap **Add** tab
2. Tap **Open Camera** and photograph any piece of clothing
3. Wait ~3 seconds for AI analysis
4. You should see the item type, color, and tags
5. Tap **Save to closet**
6. Go to **Closet** tab — your item should appear
7. Add 2-3 more items
8. Tap **Outfits** tab → pick an occasion → **Generate outfits**
9. You should see outfit suggestions with your actual items

---

## Troubleshooting

**"Could not analyze the image"**
→ Is your API running? Check the terminal where you ran `uvicorn`
→ Is your iPhone on the same WiFi as your Mac?
→ Is the IP in `config.ts` correct?

**"Items not saving"**
→ Did you run the SQL schema in Supabase?
→ Check your Supabase URL and anon key in `config.ts`

**App won't open on iPhone**
→ Make sure Expo Go is installed from the App Store
→ Scan the QR code with the iPhone's built-in camera app (not inside Expo Go)

---

## What's next (Phase 2)

- [ ] Add real weather by city using device location
- [ ] Add swipe gesture (react-native-deck-swiper)
- [ ] Add user authentication (Supabase Auth)
- [ ] Save swipe signals to database and learn from them
- [ ] Background removal on garment photos (rembg)
- [ ] Push notifications for daily outfit suggestions
