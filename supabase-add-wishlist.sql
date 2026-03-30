-- Add wishlist column to clothing_items
ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS is_wishlist boolean NOT NULL DEFAULT false;
