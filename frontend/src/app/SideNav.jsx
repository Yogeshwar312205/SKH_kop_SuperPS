import React from 'react';
import { Sprout } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { tabsForRole } from './routes';
import { LanguagePicker } from '../shared/LanguagePicker';

/**
 * SideNav Component - Modern desktop navigation sidebar
 */
export const SideNav = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeRole = useAppStore((state) => state.activeRole);
  const { t } = useT();

  const tabs = tabsForRole(activeRole);

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">

      {/* Wordmark */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest-700 to-forest-800 text-white shadow-sm">
          <Sprout className="h-5 w-5 text-emerald-300" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-2xl font-bold leading-none tracking-tight text-ink">
            Krushi<span className="text-terracotta-500">Flow</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">AgriTech Engine</span>
        </div>
      </div>

      <nav aria-label={t('roles.label')} className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
        <ul className="space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    group relative flex w-full items-center gap-3 px-3.5 py-3 text-left rounded-xl
                    transition-all duration-150
                    ${isActive
                      ? 'bg-gradient-to-r from-forest-700 to-forest-800 text-white shadow-md shadow-forest-900/10'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-forest-800'}
                  `}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform duration-150 ${isActive ? 'text-emerald-300 scale-105' : 'text-slate-400 group-hover:text-forest-700 group-hover:scale-110'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  <span className={`text-sm leading-none ${isActive ? 'font-bold text-white' : 'font-semibold'}`}>
                    {t(tab.labelKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-100 p-3.5 bg-slate-50/50">
        <LanguagePicker />
      </div>
    </aside>
  );
};

export default SideNav;
