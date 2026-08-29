import React from 'react';

/**
 * One row of mutually exclusive panels.
 *
 * This is how the Price screen absorbs four of the old tabs without becoming a
 * wall: instead of stacking forecast, comparison, demand and profitability down
 * one long scroll, exactly one is on screen and the other two are one tap away.
 * The farmer sees three words, not four screens' worth of data.
 *
 * A segmented control rather than a <select> because with three options the
 * choices and the current state are both visible at once — a dropdown hides two
 * of three behind a tap and shows no sense of what else exists.
 */
export const SegmentedToggle = ({ options, value, onChange, className = '' }) => (
  <div
    role="tablist"
    aria-orientation="horizontal"
    className={`flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 gap-1.5 shadow-inner ${className}`}
  >
    {options.map((option) => {
      const Icon = option.icon;
      const isActive = value === option.id;

      return (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-controls={`panel-${option.id}`}
          onClick={() => onChange(option.id)}
          className={`
            flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-2.5
            text-xs sm:text-sm font-bold rounded-xl transition-all duration-150
            ${isActive
              ? 'bg-gradient-to-r from-forest-700 to-forest-800 text-white shadow-sm scale-[1.02]'
              : 'text-slate-600 hover:text-forest-800 hover:bg-white/60'}
          `}
        >
          {Icon && <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} strokeWidth={2.25} aria-hidden="true" />}
          <span className="min-w-0 text-center">{option.label}</span>
        </button>
      );
    })}
  </div>
);

export default SegmentedToggle;
