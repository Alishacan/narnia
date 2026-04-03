import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  // Verify the authenticated user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Require confirmation text
  const { confirmation } = await request.json();
  if (confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });
  }

  try {
    // Delete in dependency order: children first, then parents
    // 1. Wear logs
    await supabase.from('wear_log').delete().eq('user_id', user.id);

    // 2. Outfit items (via outfit IDs)
    const { data: userOutfits } = await supabase.from('outfits').select('id').eq('user_id', user.id);
    if (userOutfits && userOutfits.length > 0) {
      await supabase.from('outfit_items').delete().in('outfit_id', userOutfits.map(o => o.id));
    }

    // 3. Outfits
    await supabase.from('outfits').delete().eq('user_id', user.id);

    // 4. Storage files
    const { data: imageFiles } = await supabase.storage.from('clothing-images').list(user.id);
    if (imageFiles && imageFiles.length > 0) {
      await supabase.storage.from('clothing-images').remove(imageFiles.map(f => `${user.id}/${f.name}`));
    }

    // 5. Clothing items
    await supabase.from('clothing_items').delete().eq('user_id', user.id);

    // 6. Delete auth user (requires service role)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
      await adminClient.auth.admin.deleteUser(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
