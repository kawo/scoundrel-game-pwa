/*
 * Scoundrel: card artwork.
 *
 * Card faces and the card back are illustrations from public/assets/cards/,
 * chosen per card by config.artFor(). Eleven files cover all forty-four cards.
 * The suit outlines drawn inline live in components/Glyph.tsx.
 */
import { ART, ART_BACK, ART_DIR } from './config.ts';

/**
 * Warm the image cache before the first deal.
 *
 * Eleven files cover all forty-four cards, so one pass here means no card
 * ever flips over to an empty rectangle. Failures are ignored on purpose:
 * a missing file should cost you the picture, not the game.
 */
export function preload(): number {
  const seen = new Set([ART_BACK]);
  for (const tiers of Object.values(ART)) {
    for (const [, , file] of tiers) seen.add(ART_DIR + file);
  }
  for (const src of seen) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
  return seen.size;
}
