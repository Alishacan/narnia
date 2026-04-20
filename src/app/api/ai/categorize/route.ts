import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const VALID_CATEGORIES = ['tops','bottoms','dresses','outerwear','shoes','bags','accessories','jewelry','activewear','other'];
const VALID_SEASONS = ['spring','summer','fall','winter','all-season'];
const VALID_OCCASIONS = ['casual','work','going-out','formal','athletic','lounge'];

const PROMPT = `Categorize this clothing item. Return a JSON object with EXACTLY these fields using ONLY the allowed values listed below.

ALLOWED VALUES:
- "category": MUST be one of: "tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "jewelry", "activewear", "other"
- "subcategory": specific type like "hawaiian shirt", "cargo shorts", "midi skirt", "bomber jacket", "crossbody bag"
- "color": CSS color name like "black", "navy", "coral", "olive", "cream", "khaki", "beige"
- "secondary_color": second color or null
- "season": MUST be one of: "spring", "summer", "fall", "winter", "all-season"
- "occasion": MUST be one of: "casual", "work", "going-out", "formal", "athletic", "lounge"

EXAMPLES:
A blue t-shirt: {"category":"tops","subcategory":"t-shirt","color":"blue","secondary_color":null,"season":"summer","occasion":"casual"}
Black jeans: {"category":"bottoms","subcategory":"jeans","color":"black","secondary_color":null,"season":"all-season","occasion":"casual"}
Red cocktail dress: {"category":"dresses","subcategory":"cocktail dress","color":"red","secondary_color":null,"season":"all-season","occasion":"going-out"}

If you see multiple items, categorize the MOST PROMINENT clothing item.
DO NOT invent category names. Use ONLY the values listed above.`;

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }
    if (imageBase64.length > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    // Use Ollama (free, local, no rate limits)
    const raw = await callOllama(imageBase64);
    if (!raw) {
      return NextResponse.json({ error: 'Ollama not running — start it with: brew services start ollama' }, { status: 500 });
    }

    // Validate AI output — clamp to known values
    const categorization = {
      category: VALID_CATEGORIES.includes(raw.category as string) ? raw.category : 'other',
      subcategory: typeof raw.subcategory === 'string' ? raw.subcategory.slice(0, 100) : null,
      color: typeof raw.color === 'string' ? raw.color.slice(0, 30) : '#808080',
      secondary_color: typeof raw.secondary_color === 'string' ? raw.secondary_color.slice(0, 30) : null,
      season: VALID_SEASONS.includes(raw.season as string) ? raw.season : 'all-season',
      occasion: VALID_OCCASIONS.includes(raw.occasion as string) ? raw.occasion : 'casual',
    };

    console.log('[Categorize] Result:', JSON.stringify(categorization));
    return NextResponse.json(categorization);
  } catch (error) {
    console.error('AI categorization error:', error);
    return NextResponse.json({ error: 'Failed to categorize item' }, { status: 500 });
  }
}

/**
 * Parse a JSON string robustly — handles markdown fences, single quotes,
 * unquoted keys, trailing commas, comments, and preamble text.
 */
function parseJsonRobust(content: string): Record<string, unknown> | null {
  let s = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = s.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  s = jsonMatch[0];
  s = s.replace(/\/\/[^\n]*/g, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/'/g, '"');
  s = s.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(s);
  } catch {
    console.error('[Categorize] Failed to parse cleaned JSON:', s.substring(0, 300));
    return null;
  }
}

/**
 * Call Llama 3.2 Vision 11B via Ollama (local, free, no rate limits).
 * Runs on the user's M3 Pro MacBook Pro.
 */
async function callOllama(imageBase64: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s for local model
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2-vision:11b',
        prompt: PROMPT + '\n\nCategorize this clothing item.',
        images: [imageBase64],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          num_predict: 300,
        },
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error('[Categorize] Ollama HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.response;
    if (!text) {
      console.error('[Categorize] Ollama returned no response');
      return null;
    }

    console.log('[Categorize] Ollama raw:', text.substring(0, 300));

    // Ollama with format:'json' should return clean JSON, but parse robustly
    try {
      return JSON.parse(text);
    } catch {
      return parseJsonRobust(text);
    }
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error('[Categorize] Ollama timed out after 60s');
    } else {
      console.error('[Categorize] Ollama not available:', (err as Error).message);
    }
    return null;
  }
}
