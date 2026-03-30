import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Try remove.bg first (paid, best quality)
    const removeBgKey = process.env.REMOVE_BG_API_KEY;
    if (removeBgKey) {
      const result = await tryRemoveBg(removeBgKey, imageFile);
      if (result) return new NextResponse(result, { headers: { 'Content-Type': 'image/png' } });
    }

    // Try free Hugging Face model (no key needed)
    const hfResult = await tryHuggingFace(imageBuffer);
    if (hfResult) return new NextResponse(hfResult, { headers: { 'Content-Type': 'image/png' } });

    // Fallback: return original image
    return new NextResponse(imageBuffer, {
      headers: { 'Content-Type': imageFile.type },
    });
  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json({ error: 'Failed to remove background' }, { status: 500 });
  }
}

async function tryRemoveBg(apiKey: string, imageFile: File): Promise<Buffer | null> {
  try {
    const bgFormData = new FormData();
    bgFormData.append('image_file', imageFile);
    bgFormData.append('size', 'regular');
    bgFormData.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: bgFormData,
    });

    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function tryHuggingFace(imageBuffer: Buffer): Promise<Buffer | null> {
  try {
    // Uses the free BRIA RMBG model on Hugging Face — no API key required
    const response = await fetch(
      'https://api-inference.huggingface.co/models/briaai/RMBG-1.4',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: imageBuffer,
      }
    );

    if (!response.ok) {
      console.error('Hugging Face error:', response.status);
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}
