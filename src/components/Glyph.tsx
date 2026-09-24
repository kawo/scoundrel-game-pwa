import type { ReactNode } from 'react';
import type { Suit } from '../game/types.ts';

/*
 * Suit outlines — built from primitives (triangle, circles, trapezoid) rather
 * than one smooth glyph, which is what gives them the engraved, drafted look
 * of an old deck back. Stroked with currentColor, so the small suit marks in
 * the pips, the weapon panel and the chronicle take their colour from CSS and
 * stay sharp at any size.
 */
const SUIT_SHAPE: Record<Suit, ReactNode> = {
  '♦': <path d="M50 3 97 50 50 97 3 50Z" />,
  '♥': <path d="M50 95S5 65 5 38A22.5 22.5 0 0 1 50 28 22.5 22.5 0 0 1 95 38c0 27-45 57-45 57Z" />,
  '♣': (
    <>
      <circle cx="50" cy="29" r="23" />
      <circle cx="26" cy="57" r="23" />
      <circle cx="74" cy="57" r="23" />
      <path d="M41 69h18l6 27H35Z" />
    </>
  ),
  '♠': (
    <>
      <path d="M50 3 89 57H11Z" />
      <circle cx="29" cy="62" r="22" />
      <circle cx="71" cy="62" r="22" />
      <path d="M42 74h16l5 22H37Z" />
    </>
  ),
};

/** An inline suit glyph for cards, the HUD and the log. */
export function Glyph({ suit, size = 14 }: { suit: Suit; size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g>{SUIT_SHAPE[suit]}</g>
    </svg>
  );
}

/** The spade brand mark in the HUD. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
        <path d="M50 10 86 58H14Z" />
        <circle cx="31" cy="63" r="19" />
        <circle cx="69" cy="63" r="19" />
        <path d="M42 76h16l5 20H37Z" />
      </g>
    </svg>
  );
}
