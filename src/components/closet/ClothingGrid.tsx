'use client';

import { ClothingItem } from '@/lib/types';
import Link from 'next/link';

interface EmptyAction {
  label: string;
  href: string;
}

interface ClothingGridProps {
  items: ClothingItem[];
  loading: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyAction;
}

export default function ClothingGrid({
  items,
  loading,
  emptyIcon = '👗',
  emptyTitle = 'No items yet',
  emptyDescription = 'Tap the + button to add your first clothing item',
  emptyAction,
}: ClothingGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 px-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="text-5xl mb-4">{emptyIcon}</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">{emptyTitle}</h3>
        <p className="text-gray-400 text-center text-sm mb-4">{emptyDescription}</p>
        {emptyAction && (
          <a
            href={emptyAction.href}
            className="px-6 py-2.5 bg-clossie-600 text-white rounded-xl text-sm font-semibold active:scale-95 transition"
          >
            {emptyAction.label}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/closet/${item.id}`}
          className="group relative aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          {/* Image */}
          <img
            src={item.image_url}
            alt={item.category}
            className="w-full h-full object-cover"
          />

          {/* Favorite badge */}
          {item.is_favorite && (
            <div className="absolute top-1.5 right-1.5 text-sm">&#x2764;&#xFE0F;</div>
          )}

          {/* Wishlist badge */}
          {item.is_wishlist && (
            <div className="absolute top-1.5 left-1.5 bg-clossie-100 text-clossie-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
              Want
            </div>
          )}

          {/* Laundry badge */}
          {!item.is_wishlist && item.in_laundry && (
            <div className="absolute top-1.5 left-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
              Wash
            </div>
          )}

          {/* Color dot */}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: item.color }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
