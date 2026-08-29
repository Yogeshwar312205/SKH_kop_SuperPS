import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { tabsForRole } from './routes';

/**
 * BottomNav Component - Modern mobile navigation bar
 */
export const BottomNav = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeRole = useAppStore((state) => state.activeRole);
  const { t } = useT();

  const tabs = tabsForRole(activeRole);

  return (
    <nav
      aria-label={t('roles.label')}
      className="
        sticky bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md
        pb-[env(safe-area-inset-bottom)] shadow-lg rounded-t-2xl
        md:hidden
      "
    >
      <ul className="mx-auto flex max-w-3xl px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  relative w-full min-h-[3.75rem] px-1 py-1.5 rounded-xl
                  flex flex-col items-center justify-center gap-1 transition-all duration-150
                  ${isActive 
                    ? 'bg-gradient-to-br from-forest-700 to-forest-800 text-white shadow-sm' 
                    : 'bg-transparent text-slate-500 hover:text-forest-800 hover:bg-slate-50'}
                `}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform duration-150 ${isActive ? 'text-emerald-300 scale-110' : 'text-slate-400'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span className={`text-[11px] leading-none text-center ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                  {t(tab.labelKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
