'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import {
  ClothingCategory,
  Season,
  Occasion,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  SEASON_LABELS,
  OCCASION_LABELS,
} from '@/lib/types';

type Step = 'capture' | 'processing' | 'confirm';

interface AiTags {
  category: ClothingCategory;
  subcategory: string | null;
  color: string;
  secondary_color: string | null;
  season: Season;
  occasion: Occasion;
}

export default function AddItemPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('capture');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [tags, setTags] = useState<AiTags | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Extra optional fields
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show original image
    const reader = new FileReader();
    reader.onload = () => setOriginalImage(reader.result as string);
    reader.readAsDataURL(file);

    setStep('processing');
    setStatusMessage('Removing background...');

    try {
      // Background removal
      const { removeBg } = await import('@/lib/background-removal');
      const resultBlob = await removeBg(file as File);
      setProcessedBlob(resultBlob);

      // Convert to display URL
      const url = URL.createObjectURL(resultBlob);
      setProcessedImage(url);

      // AI categorization
      setStatusMessage('Analyzing clothing...');
      const base64 = await blobToBase64(resultBlob);
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (res.ok) {
        const aiTags = await res.json();
        setTags(aiTags);
      } else {
        // Default tags if AI fails
        setTags({
          category: 'other',
          subcategory: null,
          color: '#808080',
          secondary_color: null,
          season: 'all-season',
          occasion: 'casual',
        });
      }

      setStep('confirm');
    } catch (err) {
      console.error('Processing error:', err);
      setStatusMessage('Something went wrong. Try again.');
      setStep('capture');
    }
  };

  const handleSave = async () => {
    if (!user || !processedBlob || !tags) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const fileName = `${user.id}/${Date.now()}.png`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('clothing-images')
        .upload(fileName, processedBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clothing-images')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from('clothing_items').insert({
        user_id: user.id,
        image_url: publicUrl,
        thumbnail_url: publicUrl,
        category: tags.category,
        subcategory: tags.subcategory,
        color: tags.color,
        secondary_color: tags.secondary_color,
        season: tags.season,
        occasion: tags.occasion,
        brand: brand || null,
        size: size || null,
        price: price ? parseFloat(price) : null,
        notes: notes || null,
        is_favorite: isFavorite,
        in_laundry: false,
        wear_count: 0,
      });

      if (dbError) throw dbError;

      router.push('/closet');
    } catch (err) {
      console.error('Save error:', err);
      setSaving(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Add Item</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Step: Capture */}
      {step === 'capture' && (
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-48 h-48 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-2">Take a Photo</h2>
          <p className="text-gray-400 text-center text-sm mb-8">
            Snap a pic of your clothing item. We&apos;ll remove the background and categorize it automatically!
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              className="px-6 py-3 bg-narnia-600 text-white rounded-xl font-semibold active:scale-95 transition"
            >
              Take Photo
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:scale-95 transition"
            >
              Choose Photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center px-6 py-20">
          {originalImage && (
            <div className="w-48 h-48 rounded-3xl overflow-hidden mb-6 opacity-50">
              <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="w-10 h-10 border-4 border-narnia-200 border-t-narnia-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">{statusMessage}</p>
          <p className="text-gray-400 text-sm mt-1">This may take a moment...</p>
        </div>
      )}

      {/* Step: Confirm tags */}
      {step === 'confirm' && tags && (
        <div className="px-4 py-4 space-y-6">
          {/* Processed image */}
          <div className="flex justify-center">
            <div className="w-52 h-52 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-2">
              {processedImage && (
                <img src={processedImage} alt="Processed" className="w-full h-full object-contain" />
              )}
            </div>
          </div>

          {/* AI Tags - editable */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-semibold text-gray-800">AI Detected Tags</h3>
            <p className="text-xs text-gray-400">Tap to change if anything is wrong</p>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(Object.keys(CATEGORY_LABELS) as ClothingCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTags({ ...tags, category: cat })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      tags.category === cat ? 'bg-narnia-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Season */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Season</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(Object.keys(SEASON_LABELS) as Season[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTags({ ...tags, season: s })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      tags.season === s ? 'bg-narnia-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {SEASON_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Occasion</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(Object.keys(OCCASION_LABELS) as Occasion[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setTags({ ...tags, occasion: o })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      tags.occasion === o ? 'bg-narnia-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {OCCASION_LABELS[o]}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={tags.color.startsWith('#') ? tags.color : '#808080'}
                  onChange={(e) => setTags({ ...tags, color: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={tags.color}
                  onChange={(e) => setTags({ ...tags, color: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-semibold text-gray-800">Extra Details (Optional)</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mt-1 text-gray-900 bg-white"
                  placeholder="Nike, Zara..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Size</label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mt-1 text-gray-900 bg-white"
                  placeholder="S, M, 8..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Price Paid</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mt-1 text-gray-900 bg-white"
                  placeholder="$29.99"
                />
              </div>
              <div className="flex items-end pb-1">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    isFavorite ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isFavorite ? '\u2764\uFE0F Favorite' : '\u2661 Favorite'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mt-1 text-gray-900 bg-white"
                rows={2}
                placeholder="Runs small, dry clean only..."
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-narnia-600 text-white rounded-xl font-semibold text-lg active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add to Closet'}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper: Convert blob to base64 (without the data:... prefix)
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
