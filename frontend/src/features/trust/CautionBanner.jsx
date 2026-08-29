import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle, Info } from 'lucide-react';
import { useT } from '../../i18n/useT';

/**
 * CautionBanner - Terracotta / Status strip for moderated content
 * 
 * Displays public moderation verdicts ("verified", "disputed", "misleading", "removed")
 * on items across KrushiFlow (worked examples now, live screens as documented follow-up).
 */
export const CautionBanner = ({ flag, verdict: propVerdict, at, note: propNote, by, compact = false, className = '' }) => {
  const { t } = useT();

  const verdict = flag?.verdict || propVerdict;
  const note = flag?.note || propNote;
  const dateStr = flag?.at || at;
  const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : '';

  if (!verdict) return null;

  const CONFIG = {
    verified: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
      badgeBg: 'bg-emerald-700 text-white',
      icon: CheckCircle2,
      labelKey: 'trust.verdict.verified',
      defaultLabel: 'Verified Accurate',
    },
    disputed: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-950',
      badgeBg: 'bg-amber-600 text-white',
      icon: AlertTriangle,
      labelKey: 'trust.verdict.disputed',
      defaultLabel: 'Disputed Claim',
    },
    misleading: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-950',
      badgeBg: 'bg-rose-600 text-white',
      icon: ShieldAlert,
      labelKey: 'trust.verdict.misleading',
      defaultLabel: 'Potentially Misleading',
    },
    removed: {
      bg: 'bg-slate-900 border-slate-700 text-slate-100',
      badgeBg: 'bg-red-600 text-white',
      icon: XCircle,
      labelKey: 'trust.verdict.removed',
      defaultLabel: 'Removed by Moderator',
    },
  };

  const style = CONFIG[verdict] || CONFIG.disputed;
  const Icon = style.icon;
  const labelText = t(style.labelKey) || style.defaultLabel;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${style.bg} ${className}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{labelText}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3.5 shadow-xs transition-all ${style.bg} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${style.badgeBg}`}>
              {labelText}
            </span>
            {formattedDate && (
              <span className="text-[11px] opacity-75 font-medium">
                {formattedDate} {by ? `• by ${by}` : ''}
              </span>
            )}
          </div>
          {note && (
            <p className="font-semibold leading-relaxed mt-1">
              "{note}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CautionBanner;
