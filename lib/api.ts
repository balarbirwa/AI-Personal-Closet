// lib/api.ts
import { API_BASE_URL } from './config';

// ── Tag a garment image ────────────────────────────────────────
export async function tagItem(imageUri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'item.jpg',
    type: 'image/jpeg',
  } as any);

  const res = await fetch(`${API_BASE_URL}/tag-item`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`Tag failed: ${res.status}`);
  return res.json();
}

// ── Generate outfit suggestions ───────────────────────────────
export async function generateOutfits(params: {
  items: any[];
  occasion: string;
  city: string;
}) {
  const res = await fetch(`${API_BASE_URL}/generate-outfits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
  return res.json(); // returns { outfits: Outfit[] }
}

// ── Save a swipe signal ───────────────────────────────────────
export async function recordSwipe(params: {
  outfit_id: string;
  signal: 'liked' | 'disliked' | 'saved';
  item_ids: string[];
}) {
  const res = await fetch(`${API_BASE_URL}/swipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error(`Swipe failed: ${res.status}`);
  return res.json();
}
