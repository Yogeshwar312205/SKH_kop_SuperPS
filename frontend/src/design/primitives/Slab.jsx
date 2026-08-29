import React from 'react';

/**
 * The signature element: a full-bleed painted rate board.
 *
 * Deliberately breaks out of the page gutter and carries no radius, no shadow,
 * and no border — it is a painted surface, not a card. Colour alone answers
 * the question before any word is read, and the two tones differ in lightness
 * as well as hue so they stay distinguishable under colour-blindness:
 *
 *   go   — dark forest ground, white text   (sell / act now)
 *   wait — light turmeric ground, ink text  (hold / do nothing yet)
 */
const TONES = {
  go: {
    surface: 'bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900 text-white shadow-xl border border-forest-600/30',
    label: 'text-emerald-300 font-bold uppercase tracking-widest text-xs',
    sub: 'text-forest-100',
  },
  wait: {
    surface: 'bg-gradient-to-br from-amber-300 via-turmeric-300 to-amber-400 text-ink shadow-xl border border-amber-400/40',
    label: 'text-amber-950 font-bold uppercase tracking-widest text-xs',
    sub: 'text-amber-900',
  },
};

export const Slab = ({ tone = 'go', label, headline, children, className = '' }) => {
  const palette = TONES[tone] || TONES.go;

  return (
    <section
      className={`slab-enter slab-paint rounded-3xl px-6 sm:px-8 lg:px-10 py-7 sm:py-9 ${palette.surface} ${className}`}
    >
      {label && (
        <p className={`eyebrow mb-3 ${palette.label}`}>{label}</p>
      )}

      {headline && (
        <h1 className="font-display text-slab-sm sm:text-slab">{headline}</h1>
      )}

      {children}
    </section>
  );
};

export default Slab;
