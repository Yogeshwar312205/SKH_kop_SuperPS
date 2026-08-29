import React, { useMemo } from 'react';
import {
  Sprout, Truck, Store, Boxes, ArrowRight, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { LanguagePicker } from '../../shared/LanguagePicker';
import { Button } from '../../design/primitives/Button';
import { MarketStatusStamp } from '../../design/primitives/MarketStatusStamp';
import { useLiveMarket, mandiLabel } from '../../data/useLiveMarket';
import { BOARD_CROPS } from '../../utils/constants';

/**
 * The front of the front door.
 *
 * AuthScreen is a form with a hero panel bolted on; this is the hero on its
 * own, at full scale, before anyone is asked to type anything. It exists so
 * the first thing a visitor sees is the product's own signature — a rate
 * board — rather than an empty email box.
 *
 * The board below is real product mechanics, not decoration: it pulls the
 * same `useLiveMarket` hook the Today/Price screens use, so the number a
 * visitor sees here is the number a signed-in farmer would see — the real
 * Agmarknet feed when it's reachable, falling back to demoMarket.js (see
 * data/demoMarket.js) with the same stamp as everywhere else when it isn't.
 */
const ROLE_ITEMS = [
  { icon: Sprout, labelKey: 'roles.farmer', noteKey: 'landing.roleFarmer' },
  { icon: Store, labelKey: 'roles.buyer', noteKey: 'landing.roleBuyer' },
  { icon: Boxes, labelKey: 'roles.logistics', noteKey: 'landing.roleLogistics' },
];

export const LandingScreen = ({ onEnter }) => {
  const { t, rate } = useT();

  /*
   * Four fixed hooks rather than a loop, because hooks cannot be called from
   * one. They cost nothing extra: all four read the same module-level cache
   * (data/marketCache.js), which App.jsx has already warmed with exactly these
   * crops — so this board renders from memory and the same entries are still
   * warm when the farmer reaches Today and Prices after signing in.
   */
  const [cropA, cropB, cropC, cropD] = BOARD_CROPS;
  const marketA = useLiveMarket(cropA, 100);
  const marketB = useLiveMarket(cropB, 100);
  const marketC = useLiveMarket(cropC, 100);
  const marketD = useLiveMarket(cropD, 100);

  const board = useMemo(
    () => [[cropA, marketA], [cropB, marketB], [cropC, marketC], [cropD, marketD]].map(
      ([crop, state]) => ({
        crop,
        // Highest rate in the state, not highest net: a visitor has no farm on
        // file, so there is no honest haul to subtract. The net-of-freight
        // ranking is the whole point of the app, and it starts the moment they
        // tell us where they are.
        ratePerKg: state.topRate.ratePerKg,
        mandi: mandiLabel(t, state.topRate),
        delta: state.delta,
        status: state.status,
      })
    ),
    [t, cropA, cropB, cropC, cropD, marketA, marketB, marketC, marketD]
  );

  // One stamp for the whole board: still fetching beats "live" beats "demo" —
  // a visitor should see "updating" until every crop has settled, not a stamp
  // that flips from demo to live as each of the four calls happens to land.
  const boardStatus = board.some((row) => row.status === 'loading')
    ? 'loading'
    : board.every((row) => row.status === 'live')
      ? 'live'
      : 'demo';

  return (
    <div className="min-h-full bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white">
      <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14 lg:px-6 lg:py-20">
        <div className="stagger">

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-turmeric-300 to-turmeric-400 text-forest-950 shadow-md">
                <Sprout className="h-6 w-6" />
              </div>
              <span className="font-display text-3xl font-bold leading-none tracking-tight">
                Krushi<span className="text-turmeric-300">Flow</span>
              </span>
            </div>
            <LanguagePicker compact />
          </div>

          {/* The board */}
          <div className="mt-12 sm:mt-16 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-turmeric-300">
                  {t('landing.eyebrow')}
                </span>
                <MarketStatusStamp status={boardStatus} />
              </div>
              <p className="text-xs text-forest-200">{t('landing.boardNote')}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {board.map(({ crop, ratePerKg, mandi, delta }) => {
                const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                const deltaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400';
                return (
                  <div key={crop} className="rounded-2xl bg-white p-4 text-ink shadow-md hover:shadow-lg transition-all duration-200">
                    <p className="truncate text-xs font-bold text-slate-500 uppercase tracking-wider">{t(`crops.${crop}`)}</p>
                    <p className="mt-1 font-display text-3xl font-bold leading-none text-forest-900 sm:text-4xl">{rate(ratePerKg)}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <DeltaIcon className={`h-3.5 w-3.5 shrink-0 ${deltaColor}`} strokeWidth={2.5} aria-hidden="true" />
                      <span className="truncate">{mandi}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-12 max-w-2xl font-display text-4xl font-bold leading-tight sm:mt-16 sm:text-5xl lg:text-6xl text-white">
            {t('landing.headline')}
          </p>
          <p className="mt-4 max-w-xl text-lg text-forest-100/90 sm:text-xl font-normal">
            {t('landing.sub')}
          </p>

          <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6">
            {ROLE_ITEMS.map((role) => {
              const Icon = role.icon;
              return (
                <li key={role.labelKey} className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-turmeric-300 shadow-sm border border-forest-700">
                    <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-bold leading-tight text-white">{t(role.labelKey)}</p>
                    <p className="mt-1 text-xs text-forest-200 leading-relaxed">{t(role.noteKey)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 flex max-w-md flex-col gap-3.5 sm:mt-14">
            <Button variant="accent" icon={ArrowRight} onClick={() => onEnter('login')} className="rounded-xl shadow-lg font-bold">
              {t('auth.login')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onEnter('signup')}
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold"
            >
              {t('auth.signup')}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => onEnter('login')}
            className="lift mt-6 text-sm font-semibold text-forest-200 underline decoration-turmeric-300 underline-offset-4 hover:text-white transition-colors"
          >
            {t('auth.demoTitle')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
