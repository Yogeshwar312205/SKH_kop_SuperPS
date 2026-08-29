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
  { icon: Sprout, labelKey: 'roles.farmer', noteKey: 'landing.roleFarmer', badge: 'शेतकरी मोफत', color: 'emerald' },
  { icon: Store, labelKey: 'roles.buyer', noteKey: 'landing.roleBuyer', badge: 'व्यापारी थेट व्यवहार', color: 'amber' },
  { icon: Boxes, labelKey: 'roles.logistics', noteKey: 'landing.roleLogistics', badge: 'वाहनांचे स्मार्ट नियोजन', color: 'sky' },
];

export const LandingScreen = ({ onEnter }) => {
  const { t, rate } = useT();
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
      
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20">
              <Sprout className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display text-2xl font-extrabold tracking-tight text-forest-950">
                Krushi<span className="text-emerald-600">Flow</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Kopargaon APMC & Logistics
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguagePicker compact />
            <button
              onClick={() => onEnter('login')}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-emerald-700 px-3 py-2 rounded-xl transition-colors"
            >
              {t('auth.login')}
            </button>
            <Button
              variant="primary"
              onClick={() => onEnter('signup')}
              className="rounded-xl shadow-md shadow-emerald-700/20 font-bold px-4 py-2 text-sm bg-forest-900 text-white hover:bg-forest-800"
            >
              {t('landing.ctaAccount')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8 sm:py-12 lg:px-8">
        
        {/* HERO SECTION - Light Theme */}
        <section className="grid lg:grid-cols-12 gap-12 items-center py-6 lg:py-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 shadow-sm">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {t('landing.heroEyebrow')}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.12] text-slate-900 tracking-tight">
              {t('landing.heroTitle')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl font-normal">
              {t('landing.heroSub')}
            </p>

            {/* Tech Badges */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-full shadow-xs">
                <Truck className="h-3.5 w-3.5 text-emerald-700" /> {t('landing.badgeVrp')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100/70 border border-amber-300 px-3 py-1.5 rounded-full shadow-xs">
                <Zap className="h-3.5 w-3.5 text-amber-700" /> {t('landing.badgeEv')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 bg-sky-100/70 border border-sky-300 px-3 py-1.5 rounded-full shadow-xs">
                <Package className="h-3.5 w-3.5 text-sky-700" /> {t('landing.badgeBus')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 bg-purple-100/70 border border-purple-300 px-3 py-1.5 rounded-full shadow-xs">
                <Bot className="h-3.5 w-3.5 text-purple-700" /> {t('landing.badgeAi')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <Button
                variant="primary"
                icon={ArrowRight}
                onClick={() => onEnter('signup')}
                className="rounded-2xl bg-forest-900 text-white hover:bg-forest-800 px-7 py-3.5 text-base font-bold shadow-lg shadow-forest-900/20 justify-center"
              >
                {t('landing.ctaAccount')}
              </Button>
              <button
                type="button"
                onClick={() => onEnter('login')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-100/80 hover:bg-slate-200/80 px-6 py-3.5 text-base font-bold text-slate-800 transition-all shadow-xs"
              >
                <Compass className="h-5 w-5 text-emerald-700" />
                {t('landing.ctaDemo')}
              </button>
            </div>
          </div>

          {/* Right Visual Image - User Provided Illustration */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 shadow-xl overflow-hidden group">
              <img
                src="/images/user_farming_illustration.png"
                alt="KrushiFlow Traditional & Modern Farming Integration"
                className="w-full h-auto max-h-[460px] object-contain rounded-2xl bg-white p-2 transform group-hover:scale-105 transition-transform duration-500"
              />
              
              {/* Floating Stat Badges on White Card */}
              <div className="absolute top-5 left-5 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg flex items-center gap-3 backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Net Realization</p>
                  <p className="text-sm font-extrabold text-slate-900">35% Freight Savings</p>
                </div>
              </div>

              <div className="absolute bottom-5 right-5 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg flex items-center gap-3 backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Green Freight</p>
                  <p className="text-sm font-extrabold text-slate-900">Solar EV Stations</p>
                </div>
              </div>
            </div>
          </div>

        </section>

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
                <h2 className="text-2xl font-extrabold text-white font-display">Live Agmarknet APMC Rates</h2>
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
                    <span className="text-[10px] text-slate-400 font-normal">/ kg</span>
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
              Integrated Technology Built for Rural Supply Chains
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
                    <Truck className="h-3.5 w-3.5 text-emerald-700" /> Capacitated VRP Algorithm
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
                <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">Kopargaon Corridor Routing</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">Shared Freight Pooling</span>
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
                    <Package className="h-3.5 w-3.5 text-sky-700" /> MSRTC Bus Transit Network
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
                <span className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 px-3 py-1 rounded-lg">Under 200kg Express Freight</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">Depot-to-Depot Tracking</span>
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
                    <Zap className="h-3.5 w-3.5 text-amber-700" /> Solar Green Logistics
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
                <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">KPG Depot Fast Chargers</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">Zero Emission Fleet</span>
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
                    <Bot className="h-3.5 w-3.5 text-purple-700" /> Marathi Voice AI Copilot
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
                <span className="text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg">"आज कांद्याचा काय भाव आहे?"</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">Agmarknet RAG Search</span>
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
              Tailored Dashboards for Every Stakeholder
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
                        {role.badge}
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
                    <span>Access Portal</span>
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
              Transforming agricultural trade across Kopargaon, Rahata, Shirdi & Nashik.
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
              Got Questions? We Have Answers.
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

        {/* CALL TO ACTION BOTTOM BANNER */}
        <section className="mt-20 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-forest-900 p-8 sm:p-12 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">
              Ready to Maximize Your Harvest Income?
            </h2>
            <p className="text-emerald-100 text-base font-medium">
              Join hundreds of farmers, traders, and logistics providers in Kopargaon today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              variant="primary"
              onClick={() => onEnter('signup')}
              className="rounded-2xl bg-white text-emerald-950 hover:bg-slate-100 px-6 py-3.5 font-bold shadow-lg"
            >
              {t('auth.signup')}
            </Button>
            <button
              onClick={() => onEnter('login')}
              className="font-bold text-white underline underline-offset-4 hover:opacity-90 text-sm px-4 py-2"
            >
              {t('auth.login')}
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-200 bg-slate-50 py-10 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-700" />
            <span className="font-display font-bold text-slate-900 text-base">KrushiFlow</span>
            <span className="text-slate-500">— AgriTech & Rural Logistics Ecosystem</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-500">Coverage: Kopargaon, Shirdi, Rahata, Sangamner, Nashik</span>
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
