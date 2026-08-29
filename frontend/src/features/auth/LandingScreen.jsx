import React, { useState, useMemo } from 'react';
import {
  Sprout, Truck, Store, Boxes, ArrowRight, TrendingUp, TrendingDown, Minus,
  Zap, Package, Bot, MapPin, ShieldCheck, ChevronDown, ChevronUp, CheckCircle2,
  Sparkles, Award, Phone, Compass, Activity, ArrowUpRight, Leaf
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { LanguagePicker } from '../../shared/LanguagePicker';
import { Button } from '../../design/primitives/Button';
import { MarketStatusStamp } from '../../design/primitives/MarketStatusStamp';
import { useLiveMarket, mandiLabel } from '../../data/useLiveMarket';
import { BOARD_CROPS } from '../../utils/constants';

/**
 * White & Light Theme Modern Aesthetic Home Page for KrushiFlow.
 * 
 * Features:
 * - Pure White & Crisp Light Aesthetic (bg-white & subtle slate/emerald gradients)
 * - User-Provided Authentic Farming & Agriculture Imagery:
 *   1. user_farming_illustration.png (Hero & Traditional to Smart Farming)
 *   2. user_tractor_silhouette.jpg (Mechanized Fleet & Route Optimization)
 *   3. user_paddy_farmer.jpg (Field Harvest & Bus Parcel Dispatch)
 * - Live Agmarknet APMC Mandi Rate Board
 * - VRP Route Optimization, Solar EV Network, Bus Micro-Parcel & Multilingual AI Copilot
 * - Role Portals, Statistics, & Interactive FAQ
 */

const ROLE_ITEMS = [
  { icon: Sprout, labelKey: 'roles.farmer', noteKey: 'landing.roleFarmer', badgeKey: 'landing.roleFarmerBadge', color: 'emerald' },
  { icon: Store, labelKey: 'roles.buyer', noteKey: 'landing.roleBuyer', badgeKey: 'landing.roleBuyerBadge', color: 'amber' },
  { icon: Boxes, labelKey: 'roles.logistics', noteKey: 'landing.roleLogistics', badgeKey: 'landing.roleLogisticsBadge', color: 'sky' },
];

export const LandingScreen = ({ onEnter }) => {
  const { t, rate, lang } = useT();
  const [openFaq, setOpenFaq] = useState(null);

  // Live market board crops
  const [cropA, cropB, cropC, cropD] = BOARD_CROPS;
  const marketA = useLiveMarket(cropA, 100);
  const marketB = useLiveMarket(cropB, 100);
  const marketC = useLiveMarket(cropC, 100);
  const marketD = useLiveMarket(cropD, 100);

  const board = useMemo(
    () => [[cropA, marketA], [cropB, marketB], [cropC, marketC], [cropD, marketD]].map(
      ([crop, state]) => ({
        crop,
        ratePerKg: state.topRate.ratePerKg,
        mandi: mandiLabel(t, state.topRate),
        delta: state.delta,
        status: state.status,
      })
    ),
    [t, cropA, cropB, cropC, cropD, marketA, marketB, marketC, marketD]
  );

  const boardStatus = board.some((row) => row.status === 'loading')
    ? 'loading'
    : board.every((row) => row.status === 'live')
      ? 'live'
      : 'demo';

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqItems = [
    { qKey: 'landing.faq1Q', aKey: 'landing.faq1A' },
    { qKey: 'landing.faq2Q', aKey: 'landing.faq2A' },
    { qKey: 'landing.faq3Q', aKey: 'landing.faq3A' },
    { qKey: 'landing.faq4Q', aKey: 'landing.faq4A' },
    { qKey: 'landing.faq5Q', aKey: 'landing.faq5A' },
  ];

  return (
    <div className="min-h-full bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">

      {/* Sticky Navigation Header - Green Background */}
      <header className="sticky top-0 z-50 bg-forest-900 backdrop-blur-md border-b border-forest-950/40 shadow-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-950/30">
              <Sprout className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display text-2xl font-extrabold tracking-tight text-white">
                Krushi<span className="text-emerald-400">Flow</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest bg-forest-950/60 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                {t('landing.apmcBadge')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguagePicker compact />
            <button
              onClick={() => onEnter('login')}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-white/90 hover:text-white px-3 py-2 rounded-xl transition-colors"
            >
              {t('auth.login')}
            </button>
            <Button
              variant="primary"
              full={false}
              onClick={() => onEnter('signup')}
              className="rounded-xl shadow-md shadow-emerald-950/40 font-bold px-4 py-2 text-sm bg-forest-950 text-white hover:bg-forest-800 border border-emerald-700/60"
            >
              {t('landing.ctaAccount')}
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION WITH FULL BACKGROUND VIDEO */}
      <div className="relative w-full overflow-hidden bg-slate-950">
        {/* AGRI.mp4 Background Video Layer - Full Visibility with Dark Gradient Scrim */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover object-center"
          >
            <source src="/videos/AGRI.mp4" type="video/mp4" />
            <source src="/AGRI.mp4" type="video/mp4" />
          </video>

          {/* Left-focused dark gradient overlay for crystal clear font contrast while keeping video on right visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          
          {/* Subtle bottom fade so it transitions cleanly into the lower page content */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Hero Section Container - Matched to Reference Design */}
        <section className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-8 sm:py-12 lg:py-14">

          {/* Top Row: Eyebrow Brand Tag on Left, Metric Badges on Right */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 sm:pb-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sprout className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-display text-sm font-black uppercase tracking-widest text-white">
                  KRUSHIFLOW CONNECT
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {t('landing.heroEyebrow')}
                </p>
              </div>
            </div>

            {/* Right Metric Glass Cards */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-md px-3.5 py-2 shadow-lg">
                <Leaf className="h-4 w-4 text-emerald-400" />
                <div className="text-left">
                  <p className="text-[11px] font-black text-white leading-none">35%</p>
                  <p className="text-[9px] font-medium text-slate-300 leading-none">{t('landing.metricFreight')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-md px-3.5 py-2 shadow-lg">
                <Zap className="h-4 w-4 text-amber-400" />
                <div className="text-left">
                  <p className="text-[11px] font-black text-white leading-none">Solar EV</p>
                  <p className="text-[9px] font-medium text-slate-300 leading-none">{t('landing.metricStations')}</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-md px-3.5 py-2 shadow-lg">
                <Truck className="h-4 w-4 text-sky-400" />
                <div className="text-left">
                  <p className="text-[11px] font-black text-white leading-none">AI Powered</p>
                  <p className="text-[9px] font-medium text-slate-300 leading-none">{t('landing.metricLogistics')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Column Content Block (leaves farmer visual on the right clear) */}
          <div className="max-w-2xl space-y-6 text-left">

            {/* Main Headline - Uppercase Two-Tone Color */}
            {lang === 'en' ? (
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-black uppercase leading-[1.08] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                <span className="text-white">EMPOWERING RURAL FARMERS </span>
                <br />
                <span className="text-white">WITH </span>
                <span className="text-emerald-400">REAL-TIME APMC MANDI RATES, </span>
                <br />
                <span className="text-emerald-400">VRP FLEET OPTIMIZATION &amp; </span>
                <br />
                <span className="text-emerald-400">SOLAR EV </span>
                <span className="text-white">STATIONS</span>
              </h1>
            ) : lang === 'hi' ? (
              <h1 className="font-display text-2xl sm:text-3xl lg:text-[38px] font-black leading-[1.18] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                <span className="text-white">लाइव एपीएमसी मंडी भाव, </span>
                <span className="text-emerald-400">वीआरपी रूट ऑप्टिमाइजेशन </span>
                <br />
                <span className="text-white">और </span>
                <span className="text-emerald-400">सोलर ईव्ही चार्जिंग स्टेशन </span>
                <span className="text-white">से किसान सशक्तिकरण</span>
              </h1>
            ) : (
              <h1 className="font-display text-2xl sm:text-3xl lg:text-[38px] font-black leading-[1.18] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                <span className="text-white">लाइव्ह एपीएमसी बाजारभाव, </span>
                <span className="text-emerald-400">व्हीआरपी मार्ग नियोजन </span>
                <br />
                <span className="text-white">आणि </span>
                <span className="text-emerald-400">सौर ईव्ही चार्जिंग स्टेशनद्वारे </span>
                <span className="text-white">शेतकरी सक्षमीकरण</span>
              </h1>
            )}

            {/* Subtitle - Clean Paragraph */}
            <p className="text-sm sm:text-base text-slate-100 font-normal leading-relaxed max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {t('landing.heroSub')}
            </p>

            {/* 4 Feature Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/15 max-w-2xl">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Truck className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white">{t('landing.badgeVrp')}</p>
                <p className="text-[10px] text-slate-300 font-medium leading-tight">{t('landing.featVrpSub')}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white">{t('landing.badgeEv')}</p>
                <p className="text-[10px] text-slate-300 font-medium leading-tight">{t('landing.featEvSub')}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Package className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white">{t('landing.badgeBus')}</p>
                <p className="text-[10px] text-slate-300 font-medium leading-tight">{t('landing.featBusSub')}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white">{t('landing.badgeAi')}</p>
                <p className="text-[10px] text-slate-300 font-medium leading-tight">{t('landing.featAiSub')}</p>
              </div>
            </div>

            {/* Action Buttons - Side by Side */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="primary"
                full={false}
                icon={ArrowRight}
                onClick={() => onEnter('signup')}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-forest-950 px-7 py-3 text-sm font-black uppercase tracking-wider shadow-lg shadow-emerald-950/40 transition-all hover:scale-105"
              >
                {t('landing.ctaAccount')}
              </Button>
              <button
                type="button"
                onClick={() => onEnter('login')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 hover:bg-slate-900 text-white px-7 py-3 text-sm font-bold uppercase tracking-wider transition-all shadow-md backdrop-blur-md hover:scale-105"
              >
                <Compass className="h-4 w-4 text-emerald-400" />
                {t('landing.ctaDemo')}
              </button>
            </div>

          </div>

        </section>
      </div>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 pb-12 sm:pb-16 lg:px-8">

        {/* LIVE MANDI RATES BOARD - Crisp Modern Card */}
        <section className="mt-12 sm:mt-16 rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-400">
                  {t('landing.eyebrow')}
                </span>
                <h2 className="text-2xl font-extrabold text-white font-display">{t('landing.boardTitle')}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MarketStatusStamp status={boardStatus} />
              <p className="hidden sm:block text-xs text-slate-300 font-medium">{t('landing.boardNote')}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {board.map(({ crop, ratePerKg, mandi, delta }) => {
              const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
              const deltaColor = delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-400' : 'text-slate-400';
              return (
                <div key={crop} className="rounded-2xl bg-white p-4 text-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-extrabold text-slate-600 uppercase tracking-wider">{t(`crops.${crop}`)}</p>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Agmarknet
                    </span>
                  </div>
                  <p className="mt-2 font-display text-3xl font-black leading-none text-slate-900 sm:text-4xl">
                    {rate(ratePerKg)}
                  </p>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-1 min-w-0">
                      <DeltaIcon className={`h-3.5 w-3.5 shrink-0 ${deltaColor}`} strokeWidth={2.5} />
                      <span className="truncate">{mandi}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">/ {t('common.kg')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CORE PLATFORM PILLARS (FEATURING USER-PROVIDED IMAGES) */}
        <section className="mt-20">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              {t('landing.pillarTitle')}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900">
              {t('landing.pillarHeading')}
            </h2>
            <p className="text-slate-600 text-base">
              {t('landing.pillarSub')}
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-8">

            {/* PILLAR 1: VRP ROUTE OPTIMIZATION (Using user_tractor_silhouette.jpg) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all group flex flex-col justify-between">
              <div>
                <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-200 bg-slate-50">
                  <img
                    src="/images/user_tractor_silhouette.jpg"
                    alt="Capacitated Vehicle Route Optimization"
                    className="w-full h-52 sm:h-60 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 text-emerald-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-emerald-700" /> {t('landing.badgeVrp')}
                  </div>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-slate-900 mb-2">
                  {t('landing.vrpTitle')}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {t('landing.vrpDesc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">{t('landing.tagCorridor')}</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{t('landing.tagPooling')}</span>
              </div>
            </div>

            {/* PILLAR 2: HARVEST & BUS MICRO-PARCEL (Using user_paddy_farmer.jpg) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all group flex flex-col justify-between">
              <div>
                <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-200 bg-slate-50">
                  <img
                    src="/images/user_paddy_farmer.jpg"
                    alt="MSRTC Bus Micro-Parcel Dispatch"
                    className="w-full h-52 sm:h-60 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 text-sky-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-sky-700" /> {t('landing.badgeBus')}
                  </div>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-slate-900 mb-2">
                  {t('landing.busTitle')}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {t('landing.busDesc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 px-3 py-1 rounded-lg">{t('landing.tagExpress')}</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{t('landing.tagTracking')}</span>
              </div>
            </div>

            {/* PILLAR 3: SOLAR EV CHARGING NETWORK */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all group flex flex-col justify-between">
              <div>
                <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-200 bg-slate-50">
                  <img
                    src="/images/ev_station_network.png"
                    alt="Solar EV Charging Station Network"
                    className="w-full h-52 sm:h-60 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 text-amber-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-700" /> {t('landing.badgeEv')}
                  </div>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-slate-900 mb-2">
                  {t('landing.evTitle')}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {t('landing.evDesc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">{t('landing.tagFastCharger')}</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{t('landing.tagZeroEmission')}</span>
              </div>
            </div>

            {/* PILLAR 4: MULTILINGUAL MARATHI RAG AI COPILOT */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all group flex flex-col justify-between">
              <div>
                <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-200 bg-slate-50">
                  <img
                    src="/images/ai_rag_assistant.png"
                    alt="KrushiFlow RAG AI Multilingual Voice Assistant"
                    className="w-full h-52 sm:h-60 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 text-purple-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-purple-700" /> {t('landing.badgeAi')}
                  </div>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-slate-900 mb-2">
                  {t('landing.aiTitle')}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {t('landing.aiDesc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg">{t('landing.tagVoiceSample')}</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{t('landing.tagRagSearch')}</span>
              </div>
            </div>

          </div>
        </section>

        {/* ROLE SELECTION PORTALS - Light Cards */}
        <section className="mt-20">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              {t('landing.rolesTitle')}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900">
              {t('landing.rolesHeading')}
            </h2>
            <p className="text-slate-600 text-base">
              {t('landing.rolesSub')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {ROLE_ITEMS.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.labelKey}
                  onClick={() => onEnter('signup')}
                  className="cursor-pointer group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20 group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 stroke-[2.25]" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                        {t(role.badgeKey)}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-extrabold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                      {t(role.labelKey)}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {t(role.noteKey)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-emerald-800 group-hover:text-emerald-700">
                    <span>{t('landing.accessPortal')}</span>
                    <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* IMPACT STATISTICS - Vibrant Dark Emerald Highlight Banner */}
        <section className="mt-20 rounded-3xl bg-gradient-to-br from-forest-950 via-forest-900 to-emerald-950 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl font-extrabold text-white">
              {t('landing.statsTitle')}
            </h2>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              {t('landing.statsSub')}
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
              <p className="font-display text-4xl sm:text-5xl font-black text-amber-300">{t('landing.stat1Val')}</p>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mt-2">{t('landing.stat1Lbl')}</p>
            </div>
            <div className="text-center p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
              <p className="font-display text-4xl sm:text-5xl font-black text-emerald-400">{t('landing.stat2Val')}</p>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mt-2">{t('landing.stat2Lbl')}</p>
            </div>
            <div className="text-center p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
              <p className="font-display text-4xl sm:text-5xl font-black text-sky-300">{t('landing.stat3Val')}</p>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mt-2">{t('landing.stat3Lbl')}</p>
            </div>
            <div className="text-center p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
              <p className="font-display text-4xl sm:text-5xl font-black text-purple-300">{t('landing.stat4Val')}</p>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mt-2">{t('landing.stat4Lbl')}</p>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <section className="mt-20 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              {t('landing.faqTitle')}
            </span>
            <h2 className="font-display text-3xl font-extrabold text-slate-900 mt-3">
              {t('landing.faqHeading')}
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-display text-lg font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                  >
                    <span>{t(item.qKey)}</span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-emerald-700 shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {t(item.aKey)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL SIGN UP CTA */}
        <section className="mt-20 rounded-3xl bg-forest-950 text-white p-8 sm:p-12 text-center shadow-xl">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold">
            {t('landing.ctaAccount')}
          </h2>
          <p className="mt-3 text-slate-300 text-sm max-w-xl mx-auto">
            {t('landing.heroSub')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              full={false}
              onClick={() => onEnter('signup')}
              className="rounded-2xl bg-white text-emerald-950 hover:bg-slate-100 px-6 py-3.5 font-bold shadow-lg"
            >
              {t('auth.signup')}
            </Button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-200 bg-slate-50 py-10 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-700" />
            <span className="font-display font-bold text-slate-900 text-base">KrushiFlow</span>
            <span className="text-slate-500">— {t('landing.footerTagline')}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-500">{t('landing.coverage')}</span>
            <button
              onClick={() => onEnter('login')}
              className="text-emerald-700 underline font-bold"
            >
              {t('auth.demoTitle')}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingScreen;
