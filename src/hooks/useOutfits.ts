'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Outfit, ClothingItem } from '@/lib/types';

export function useOutfits() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  const fetchOutfits = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get outfits
    const { data: outfitData } = await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!outfitData) {
      setLoading(false);
      return;
    }

    // Get outfit items for all outfits
    const outfitIds = outfitData.map((o) => o.id);
    const { data: outfitItems } = await supabase
      .from('outfit_items')
      .select('outfit_id, clothing_item_id')
      .in('outfit_id', outfitIds);

    // Get all referenced clothing items
    const clothingIds = [...new Set((outfitItems || []).map((oi) => oi.clothing_item_id))];
    const { data: clothingData } = await supabase
      .from('clothing_items')
      .select('*')
      .in('id', clothingIds.length > 0 ? clothingIds : ['none']);

    const clothingMap = new Map((clothingData || []).map((c) => [c.id, c as ClothingItem]));

    // Assemble outfits with items
    const assembled = outfitData.map((outfit) => ({
      ...outfit,
      items: (outfitItems || [])
        .filter((oi) => oi.outfit_id === outfit.id)
        .map((oi) => clothingMap.get(oi.clothing_item_id))
        .filter(Boolean) as ClothingItem[],
    })) as Outfit[];

    setOutfits(assembled);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOutfits();
  }, [fetchOutfits]);

  const createOutfit = async (
    name: string,
    itemIds: string[],
    occasion?: string,
    season?: string
  ) => {
    if (!user) return null;

    const { data: outfit, error } = await supabase
      .from('outfits')
      .insert({
        user_id: user.id,
        name,
        occasion: occasion || null,
        season: season || null,
        is_favorite: false,
      })
      .select()
      .single();

    if (error || !outfit) return null;

    // Add outfit items
    const outfitItemRows = itemIds.map((itemId) => ({
      outfit_id: outfit.id,
      clothing_item_id: itemId,
    }));

    await supabase.from('outfit_items').insert(outfitItemRows);

    await fetchOutfits();
    return outfit;
  };

  const deleteOutfit = async (id: string) => {
    await supabase.from('outfit_items').delete().eq('outfit_id', id);
    await supabase.from('outfits').delete().eq('id', id);
    setOutfits((prev) => prev.filter((o) => o.id !== id));
  };

  const logWear = async (outfitId: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    await supabase.from('wear_log').insert({
      user_id: user.id,
      outfit_id: outfitId,
      worn_date: today,
    });

    // Update wear counts for items in this outfit
    const outfit = outfits.find((o) => o.id === outfitId);
    if (outfit?.items) {
      for (const item of outfit.items) {
        await supabase
          .from('clothing_items')
          .update({
            wear_count: item.wear_count + 1,
            last_worn_at: today,
          })
          .eq('id', item.id);
      }
    }

    await fetchOutfits();
  };

  return { outfits, loading, fetchOutfits, createOutfit, deleteOutfit, logWear };
}
