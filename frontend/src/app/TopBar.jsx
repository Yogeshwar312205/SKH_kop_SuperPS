import React from 'react';
import { Sprout, Bot, User } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { LanguagePicker } from '../shared/LanguagePicker';
import { normaliseRole, ROLES, PROFILE_TAB } from './routes';

/**
 * TopBar Component - Modern glassmorphic header
 */
const ROLE_KEYS = {
  [ROLES.FARMER]: 'roles.farmer',
  [ROLES.BUYER]: 'roles.buyer',
  [ROLES.LOGISTICS]: 'roles.logistics',
};

export const TopBar = () => {
  const activeRole = useAppStore((state) => state.activeRole);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const user = useAppStore((state) => state.user);
  const { t } = useT();

  const role = normaliseRole(activeRole);
  const onProfile = activeTab === PROFILE_TAB;

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur-md shadow-xs">
      {/* Real-time Ticker Bar */}
      <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white text-[11px] py-1 px-4 flex items-center justify-between font-medium tracking-wide">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">AgriTech Live Engine</span>
          <span className="text-slate-300 truncate hidden sm:inline">• Agmarknet Mandi Feed Connected • Passenger Bus Parcel Route Syncing • Direct Buyer Procurement Active</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-slate-300 text-[10px] font-semibold">
          <span>Kopargaon APMC</span>
          <span className="text-emerald-400 font-bold">₹2,850/qtl ▲</span>
        </div>
      </div>

      <div className="flex h-15 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* Wordmark — mobile only */}
        <div className="flex min-w-0 items-center gap-2.5 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest-700 to-forest-800 text-white shadow-sm">
            <Sprout className="h-5 w-5 text-emerald-300" />
          </div>
          <span className="font-display text-2xl font-bold leading-none tracking-tight text-ink">
            Krushi<span className="text-terracotta-500">Flow</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="md:hidden">
            <LanguagePicker compact />
          </div>

          {/* AI Sahayak Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-rag-assistant'))}
            className="flex h-9 items-center gap-2 rounded-full border border-forest-600 bg-gradient-to-r from-forest-700 to-forest-800 px-3.5 text-xs font-bold text-white shadow-sm hover:from-forest-800 hover:to-forest-900 transition-all duration-150 active:scale-95"
            title="Open KrishiFlow AI Sahayak RAG Assistant"
          >
            <Bot className="h-4 w-4 text-emerald-300" />
            <span className="hidden xs:inline sm:inline">AI Sahayak</span>
          </button>

          {/* Role Pill */}
          <span
            className="
              flex h-9 items-center rounded-full border border-slate-200 bg-slate-100/80 px-3.5 text-xs
              font-bold text-slate-700 shadow-2xs
            "
          >
            {t(ROLE_KEYS[role])}
          </span>

          {/* Identity Chip */}
          <button
            type="button"
            onClick={() => setActiveTab(PROFILE_TAB)}
            aria-current={onProfile ? 'page' : undefined}
            aria-label={t('crop.profile.title')}
            className={`
              flex h-9 items-center gap-2 rounded-full border transition-all duration-150 p-1 pr-3
              ${onProfile 
                ? 'border-forest-700 bg-forest-700 text-white shadow-sm' 
                : 'border-slate-200 bg-white text-ink hover:bg-slate-50 hover:border-slate-300'}
            `}
          >
            <span
              className={`
                flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                font-display text-sm font-bold leading-none
                ${onProfile ? 'bg-white text-forest-800' : 'bg-forest-700 text-white'}
              `}
              aria-hidden="true"
            >
              {(user?.name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <span className="hidden truncate text-xs font-bold sm:block">
              {user?.name?.split(' ')[0] || t('crop.profile.title')}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
