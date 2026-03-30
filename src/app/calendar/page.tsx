'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { WearLog, Outfit, ClothingItem } from '@/lib/types';

interface WearEntry {
  date: string;
  outfit: Outfit & { items: ClothingItem[] };
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [wearEntries, setWearEntries] = useState<WearEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchWearLog = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('wear_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('worn_date', startDate)
      .lte('worn_date', endDate)
      .order('worn_date', { ascending: true });

    if (!logs || logs.length === 0) {
      setWearEntries([]);
      setLoading(false);
      return;
    }

    const outfitIds = [...new Set(logs.map((l) => l.outfit_id))];
    const { data: outfits } = await supabase
      .from('outfits')
      .select('*')
      .in('id', outfitIds);

    const { data: outfitItems } = await supabase
      .from('outfit_items')
      .select('outfit_id, clothing_item_id')
      .in('outfit_id', outfitIds);

    const clothingIds = [...new Set((outfitItems || []).map((oi) => oi.clothing_item_id))];
    const { data: clothing } = await supabase
      .from('clothing_items')
      .select('*')
      .in('id', clothingIds.length > 0 ? clothingIds : ['none']);

    const clothingMap = new Map((clothing || []).map((c) => [c.id, c as ClothingItem]));

    const entries: WearEntry[] = logs.map((log) => {
      const outfit = (outfits || []).find((o) => o.id === log.outfit_id);
      const items = (outfitItems || [])
        .filter((oi) => oi.outfit_id === log.outfit_id)
        .map((oi) => clothingMap.get(oi.clothing_item_id))
        .filter(Boolean) as ClothingItem[];

      return {
        date: log.worn_date,
        outfit: { ...outfit, items } as WearEntry['outfit'],
      };
    });

    setWearEntries(entries);
    setLoading(false);
  }, [user, currentMonth]);

  useEffect(() => {
    fetchWearLog();
  }, [fetchWearLog]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const getEntryForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return wearEntries.find((e) => e.date === dateStr);
  };

  const selectedEntry = selectedDate ? wearEntries.find((e) => e.date === selectedDate) : null;

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-100 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">What I Wore</h1>
      </div>

      {/* Month navigation */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={prevMonth} className="p-2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-800">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white px-4 pb-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-2 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = getEntryForDate(day);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition relative ${
                  isSelected
                    ? 'bg-narnia-600 text-white'
                    : isToday
                    ? 'bg-narnia-50 text-narnia-600 font-bold'
                    : 'text-gray-700'
                }`}
              >
                {day}
                {entry && !isSelected && (
                  <div className="w-1.5 h-1.5 bg-narnia-400 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="px-4 py-3">
          {selectedEntry ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2">{selectedEntry.outfit.name}</h3>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {selectedEntry.outfit.items.map((item) => (
                  <div key={item.id} className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                    <img src={item.image_url} alt={item.category} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-400 text-sm">No outfit logged for this day</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
