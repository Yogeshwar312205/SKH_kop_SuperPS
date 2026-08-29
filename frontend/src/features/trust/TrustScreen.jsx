import React, { useState, useEffect } from 'react';
import { 
  BadgeCheck, 
  ShieldAlert, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Brain,
  Leaf,
  FileText,
  Send,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
  TrendingUp,
  Tag,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import axios from 'axios';
import { io } from 'socket.io-client';
import { CautionBanner } from './CautionBanner';
import { AdminPanel } from './AdminPanel';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATIC_PROVENANCE = {
  governmentFeed: {
    name: 'Agmarknet APMC Price Data',
    authority: 'Ministry of Agriculture & Farmers Welfare, Government of India',
    resourceId: '35985678-0d79-46b4-9ed6-6f13308a1d24',
    refreshCadence: 'Every 6 hours',
    method: 'Direct API integration',
    isLive: true,
    whatWeShow: 'Government-published modal price per kg',
    whatWeDontDo: 'We do not compute or modify the government price',
    verifyUrl: 'https://data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24',
  },
  sellHoldAdvice: {
    name: 'Sell or Hold Recommendation',
    method: 'Rule-based decision system',
    inputs: [
      'Current Agmarknet modal price',
      'Price momentum (14-day trailing average)',
      'OpenWeather current conditions',
      'Crop-specific weather profiles',
    ],
    whatWeShow: 'Binary advice: sell now or wait',
    whatWeWithhold: [
      'Exact weights and thresholds',
      'Scoring algorithm details',
      'Weather profile parameters',
    ],
    disclaimer: 'This is advice, not a guarantee. Market conditions can change rapidly.',
  },
  priceForecast: {
    name: '7-Period Price Forecast',
    algorithm: 'XGBoost',
    trainedOn: 'Historical APMC data (2020-2024)',
    geography: 'Maharashtra',
    horizon: '7 periods ahead',
    health: 'online',
    whatWeShow: 'Predicted price when within ±35% of training range',
    whatWeWithhold: [
      'Feature engineering details',
      'Hyperparameters',
      'Training data splits',
    ],
    safetyMeasure: 'Forecast withheld when price exceeds training distribution bounds',
  },
  spoilageModel: {
    name: 'Spoilage Risk Estimate',
    method: 'Q10 exponential decay model',
    inputs: [
      'Crop type',
      'Hours since harvest',
      'Temperature (°C)',
      'Refrigeration status',
    ],
    whatWeShow: 'Estimated percentage of commodity spoiled',
    whatWeWithhold: [
      'Q10 temperature coefficients per crop',
      'Decay rate constants',
    ],
    disclaimer: 'Estimate based on standard storage conditions. Actual spoilage may vary.',
  },
  governmentSchemes: {
    name: 'Government Scheme References',
    approach: 'Outbound links only',
    whatWeDo: 'Link to official government pages with verification dates',
    whatWeDontDo: 'We never restate scheme terms or eligibility criteria',
    schemes: [
      { name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)', url: 'https://pmkisan.gov.in/', lastChecked: '2026-08-15' },
      { name: 'PM Fasal Bima Yojana (Crop Insurance)', url: 'https://pmfby.gov.in/', lastChecked: '2026-08-15' },
      { name: 'e-NAM (National Agriculture Market)', url: 'https://www.enam.gov.in/', lastChecked: '2026-08-15' },
    ],
    disclaimer: 'Always verify scheme details directly on official government websites',
  },
};

const WORKED_EXAMPLES = [
  {
    type: 'price',
    id: 'sample_onion_01',
    label: 'Onion Modal Price — Kopergaon APMC',
    displayedValue: '₹1,850 / qtl (₹18.50 / kg)',
    source: 'Agmarknet API (Feed ID: 35985678-0d79-46b4-9ed6-6f13308a1d24)',
    category: 'price_dispute',
  },
  {
    type: 'advice',
    id: 'sample_advice_01',
    label: 'Sell / Hold Decision — Tomato Crop Corridor',
    displayedValue: 'RECOMMENDATION: HOLD (Expected +8% gain over 4 days)',
    source: 'Rule Engine (Agmarknet 14d Momentum + OpenWeather Humidity)',
    category: 'treatment_claim',
  },
  {
    type: 'posting',
    id: 'sample_buyer_01',
    label: 'Buyer Procurement Offer — Soyabean Grade A',
    displayedValue: '₹58.00 / kg (Offered by Sahyadri Traders)',
    source: 'Platform Buyer Posting (Unverified Direct Buyer)',
    category: 'scam_posting',
  },
];

/**
 * TrustScreen - Data Integrity & Transparency Portal
 * 
 * Three sections:
 * 1. Provenance cards - "How we know what we show is true"
 * 2. Report form - "Report something that looks wrong"
 * 3. Worked examples - Live demo of flagged content with CautionBanner
 */
export const TrustScreen = ({ onExit }) => {
  const { t } = useT();
  const [provenance, setProvenance] = useState(STATIC_PROVENANCE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Flags state for worked examples
  const [flagsMap, setFlagsMap] = useState({});

  // Admin panel state
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Report form state
  const [reportForm, setReportForm] = useState({
    category: 'price_dispute',
    subjectType: 'price',
    subjectLabel: '',
    displayedValue: '',
    reason: '',
    reporterName: '',
    reporterContact: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  // Fetch provenance & content flags on mount
  useEffect(() => {
    fetchProvenance();
    fetchFlags();
  }, []);

  // Listen for socket real-time verdict updates
  useEffect(() => {
    const socket = io(API_BASE_URL);

    socket.on('trust:verdict', (data) => {
      if (data && data.subjectType && data.subjectId) {
        setFlagsMap(prev => ({
          ...prev,
          [`${data.subjectType}:${data.subjectId}`]: data,
        }));
      } else {
        fetchFlags();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchProvenance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/trust/provenance`);
      if (response.data.success && response.data.provenance) {
        setProvenance({
          ...STATIC_PROVENANCE,
          ...response.data.provenance,
          governmentFeed: { ...STATIC_PROVENANCE.governmentFeed, ...response.data.provenance.governmentFeed },
          sellHoldAdvice: { ...STATIC_PROVENANCE.sellHoldAdvice, ...response.data.provenance.sellHoldAdvice },
          priceForecast: { ...STATIC_PROVENANCE.priceForecast, ...response.data.provenance.priceForecast },
          spoilageModel: { ...STATIC_PROVENANCE.spoilageModel, ...response.data.provenance.spoilageModel },
          governmentSchemes: { ...STATIC_PROVENANCE.governmentSchemes, ...response.data.provenance.governmentSchemes },
        });
      }
    } catch (err) {
      console.warn('[TrustScreen] Provenance live fetch warning, using static fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlags = async () => {
    try {
      const subjectsParam = WORKED_EXAMPLES.map(ex => `${ex.type}:${ex.id}`).join(',');
      const res = await axios.get(`${API_BASE_URL}/api/trust/flags`, {
        params: { subjects: subjectsParam }
      });
      if (res.data.success && Array.isArray(res.data.flags)) {
        const map = {};
        res.data.flags.forEach(f => {
          map[`${f.subjectType}:${f.subjectId}`] = f;
        });
        setFlagsMap(map);
      }
    } catch (err) {
      console.warn('[TrustScreen] Failed to fetch flags:', err.message);
    }
  };

  const handlePreFillReport = (example) => {
    setReportForm({
      category: example.category,
      subjectType: example.type,
      subjectLabel: example.label,
      displayedValue: example.displayedValue,
      reason: `Disputing accuracy of ${example.label}`,
      reporterName: '',
      reporterContact: '',
    });
    // Scroll to report section
    const el = document.getElementById('report-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportForm.reason.trim()) {
      alert(t('trust.report.reasonRequired') || 'Please state why this information looks wrong');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(`${API_BASE_URL}/api/trust/report`, {
        category: reportForm.category,
        subject: {
          type: reportForm.subjectType,
          label: reportForm.subjectLabel,
          displayedValue: reportForm.displayedValue,
        },
        reason: reportForm.reason,
        reporterName: reportForm.reporterName || undefined,
        reporterContact: reportForm.reporterContact || undefined,
      });

      if (response.data.success) {
        setSubmitted(response.data.ticketId);
        // Reset form
        setReportForm({
          category: 'price_dispute',
          subjectType: 'price',
          subjectLabel: '',
          displayedValue: '',
          reason: '',
          reporterName: '',
          reporterContact: '',
        });
      }
    } catch (err) {
      alert(t('trust.report.submitError') || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAdmin = (forceOpen = false) => {
    const nextState = forceOpen ? true : !showAdmin;
    setShowAdmin(nextState);
    if (nextState) {
      setTimeout(() => {
        const el = document.getElementById('admin-panel-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">{t('common.back')}</span>
            </button>
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-7 w-7 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('trust.title') || 'Data Authenticity & Trust'}</h1>
                <p className="text-sm text-slate-600">{t('trust.subtitle') || 'KrishiFlow is a reference point, not an arbiter'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleToggleAdmin()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>{showAdmin ? 'Hide Moderation Admin' : 'Admin Review Console'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-12">

        {/* Modal/Toggle Admin Review Panel */}
        {showAdmin && (
          <section id="admin-panel-section" className="animate-in fade-in slide-in-from-top-4 duration-300">
            <AdminPanel onClose={() => setShowAdmin(false)} />
          </section>
        )}
        
        {/* Core Principles Banner */}
        <section className="bg-gradient-to-br from-forest-950 via-forest-900 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-start gap-4">
            <ShieldAlert className="h-8 w-8 text-emerald-400 shrink-0 mt-1" />
            <div className="space-y-3">
              <h2 className="text-xl font-bold font-display text-white">
                {t('trust.intro.title') || 'KrishiFlow Data Integrity Commitment'}
              </h2>
              <p className="text-slate-200 text-sm leading-relaxed">
                {t('trust.intro.description') || 'KrishiFlow is a reference point, not an arbiter. We do not stamp claims about the world "true" or "false" — a wrong automated verdict on a farmer\'s screen is worse than none, and it would be gamed.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-emerald-300 block mb-0.5">1. Provenance is Checkable</span>
                  Every figure names its source, fetch time, method, and deliberately withheld weights.
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-emerald-300 block mb-0.5">2. Anyone Can Dispute</span>
                  Reports create audit tickets carrying server snapshots, not unmoderated comment boxes.
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-emerald-300 block mb-0.5">3. Moderation is Public</span>
                  Admin verdicts carry who, when and why, and show transparently on the item.
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-emerald-300 block mb-0.5">4. Heuristics Never Judge</span>
                  Outlier postings auto-open a ticket for human review. Content is never auto-removed.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Provenance - "How we know what we show is true" */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">{t('trust.provenance.title') || 'How We Know What We Show Is True'}</h2>
          </div>

          {loading && (
            <div className="text-center py-12 text-slate-500">{t('common.loading')}</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <AlertCircle className="h-5 w-5 inline mr-2" />
              {t('trust.provenance.loadError') || 'Unable to load provenance'}
            </div>
          )}

          {provenance && (
            <div className="grid gap-6">
              
              {/* 1. Government Feed */}
              {provenance.governmentFeed && (
                <ProvenanceCard
                  icon={Database}
                  iconColor="text-blue-600"
                  title={t('trust.source.govFeed.title') || 'Live Government Price Feed (Agmarknet)'}
                  badge={provenance.governmentFeed.isLive ? 'Live API Feed' : 'Offline'}
                  badgeColor={provenance.governmentFeed.isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}
                >
                  <SourceDetail label="Authority" value={provenance.governmentFeed.authority} />
                  <SourceDetail label="Resource ID" value={provenance.governmentFeed.resourceId} />
                  <SourceDetail label="Refresh Cadence" value={provenance.governmentFeed.refreshCadence} />
                  <SourceDetail label="Integration" value={provenance.governmentFeed.method} />
                  
                  <div className="mt-4 p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-xs sm:text-sm">
                    <p className="text-blue-900 font-bold mb-0.5">What We Show:</p>
                    <p className="text-blue-800">{provenance.governmentFeed.whatWeShow}</p>
                    <p className="text-blue-900 font-bold mt-2.5 mb-0.5">What We Do Not Do:</p>
                    <p className="text-blue-800">{provenance.governmentFeed.whatWeDontDo}</p>
                  </div>

                  <a
                    href={provenance.governmentFeed.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-800 font-bold text-sm"
                  >
                    Verify directly at data.gov.in <ExternalLink className="h-4 w-4" />
                  </a>
                </ProvenanceCard>
              )}

              {/* 2. Sell/Hold Advice */}
              {provenance.sellHoldAdvice && (
                <ProvenanceCard
                  icon={Brain}
                  iconColor="text-amber-600"
                  title={t('trust.source.advice.title') || 'Sell or Hold Recommendation (Rule Engine)'}
                  badge="Rule-Based"
                  badgeColor="bg-amber-100 text-amber-800"
                >
                  <SourceDetail label="Method" value={provenance.sellHoldAdvice.method} />
                  
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Evaluated Inputs:</p>
                    <ul className="space-y-1">
                      {provenance.sellHoldAdvice.inputs?.map((input, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {input}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 p-3.5 bg-amber-50 rounded-xl border border-amber-100 text-xs sm:text-sm">
                    <p className="text-amber-900 font-bold mb-1">Deliberately Withheld Parameters:</p>
                    <ul className="space-y-1">
                      {provenance.sellHoldAdvice.whatWeWithhold?.map((item, i) => (
                        <li key={i} className="text-amber-800">• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-700 italic">{provenance.sellHoldAdvice.disclaimer}</p>
                  </div>
                </ProvenanceCard>
              )}

              {/* 3. Price Forecast */}
              {provenance.priceForecast && provenance.priceForecast.health !== 'offline' && (
                <ProvenanceCard
                  icon={Brain}
                  iconColor="text-purple-600"
                  title={t('trust.source.forecast.title') || '7-Period Price Forecast (Trained Model)'}
                  badge={`AI Health: ${provenance.priceForecast.health}`}
                  badgeColor={provenance.priceForecast.health === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}
                >
                  <SourceDetail label="Algorithm" value={provenance.priceForecast.algorithm} />
                  <SourceDetail label="Trained On" value={provenance.priceForecast.trainedOn} />
                  <SourceDetail label="Geography" value={provenance.priceForecast.geography} />
                  <SourceDetail label="Horizon" value={provenance.priceForecast.horizon} />
                  
                  <div className="mt-4 p-3.5 bg-purple-50 rounded-xl border border-purple-100 text-xs sm:text-sm">
                    <p className="text-purple-900 font-bold mb-1">Withheld Proprietary Specs:</p>
                    <ul className="space-y-1">
                      {provenance.priceForecast.whatWeWithhold?.map((item, i) => (
                        <li key={i} className="text-purple-800">• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-700"><strong>Safety Guard:</strong> {provenance.priceForecast.safetyMeasure}</p>
                  </div>
                </ProvenanceCard>
              )}

              {/* 4. Spoilage Model */}
              {provenance.spoilageModel && (
                <ProvenanceCard
                  icon={Leaf}
                  iconColor="text-emerald-600"
                  title={t('trust.source.spoilage.title') || 'Spoilage Risk Model (Q10 Decay)'}
                  badge="Exponential Decay"
                  badgeColor="bg-emerald-100 text-emerald-800"
                >
                  <SourceDetail label="Method" value={provenance.spoilageModel.method} />
                  
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Inputs:</p>
                    <ul className="space-y-1">
                      {provenance.spoilageModel.inputs?.map((input, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {input}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-xs sm:text-sm">
                    <p className="text-emerald-900 font-bold mb-1">Withheld Constants:</p>
                    <ul className="space-y-1">
                      {provenance.spoilageModel.whatWeWithhold?.map((item, i) => (
                        <li key={i} className="text-emerald-800">• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-700 italic">{provenance.spoilageModel.disclaimer}</p>
                  </div>
                </ProvenanceCard>
              )}

              {/* 5. Government Schemes */}
              {provenance.governmentSchemes && (
                <ProvenanceCard
                  icon={FileText}
                  iconColor="text-indigo-600"
                  title={t('trust.source.schemes.title') || 'Government Schemes (Outbound Links Only)'}
                  badge="Reference Only"
                  badgeColor="bg-indigo-100 text-indigo-800"
                >
                  <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                    <p><strong>Approach:</strong> {provenance.governmentSchemes.approach}</p>
                    <p><strong>What We Do:</strong> {provenance.governmentSchemes.whatWeDo}</p>
                    <p><strong>What We Do Not Do:</strong> {provenance.governmentSchemes.whatWeDontDo}</p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {provenance.governmentSchemes.schemes?.map((scheme, i) => (
                      <a
                        key={i}
                        href={scheme.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{scheme.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Last Checked: {scheme.lastChecked}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                      </a>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                    {provenance.governmentSchemes.disclaimer}
                  </div>
                </ProvenanceCard>
              )}
            </div>
          )}
        </section>

        {/* Section 2: Worked Examples Strip with Live CautionBanner */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="h-6 w-6 text-emerald-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Worked Examples &amp; Live Caution Banners</h2>
                <p className="text-xs text-slate-600">Demonstrating transparent moderation verdicts in action</p>
              </div>
            </div>
            <button
              onClick={() => handleToggleAdmin(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
            >
              Test with Admin Panel &rarr;
            </button>
          </div>

          <div className="grid gap-6">
            {WORKED_EXAMPLES.map((ex) => {
              const flag = flagsMap[`${ex.type}:${ex.id}`];
              return (
                <div key={ex.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                        {ex.type}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{ex.label}</h3>
                    </div>
                    <button
                      onClick={() => handlePreFillReport(ex)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Report This Item
                    </button>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Displayed Platform Value</p>
                    <p className="font-mono text-base font-bold text-slate-900">{ex.displayedValue}</p>
                    <p className="text-xs text-slate-500 mt-2"><strong>Provenance Source:</strong> {ex.source}</p>
                  </div>

                  {/* Caution Banner showing moderation verdict if flagged */}
                  {flag ? (
                    <CautionBanner flag={flag} />
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      No moderation verdict set for this sample item yet. Use the Admin Review Console above to set a verdict and see the CautionBanner appear live.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Report Form */}
        <section id="report-section" className="space-y-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-slate-900">{t('trust.report.title') || 'Report Something That Looks Wrong'}</h2>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Report Submitted to Audit Trail</h3>
                <p className="text-slate-600 mb-4">Ticket Reference ID: <strong className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{submitted}</strong></p>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">An administrator will review the server-captured snapshot and determine whether to publish a public verdict badge.</p>
                <button
                  onClick={() => setSubmitted(null)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
                >
                  Submit Another Report
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Report Category
                  </label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="price_dispute">Mandi Price Dispute / Unrealistic Rate</option>
                    <option value="scam_posting">Unverified or Fraudulent Buyer Posting</option>
                    <option value="scheme_rumor">Government Scheme Misinformation</option>
                    <option value="treatment_claim">Unverified Crop Treatment / Advisory Claim</option>
                    <option value="other">Other Data Integrity Concern</option>
                  </select>
                </div>

                {/* What did you see */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    What item did you see?
                  </label>
                  <input
                    type="text"
                    value={reportForm.subjectLabel}
                    onChange={(e) => setReportForm({ ...reportForm, subjectLabel: e.target.value })}
                    placeholder="e.g. Onion price at Kopergaon mandi or Buyer offer from Sahyadri Traders"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Why it looks wrong */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Why does it look wrong or inaccurate? *
                  </label>
                  <textarea
                    value={reportForm.reason}
                    onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                    placeholder="Provide details (e.g. actual mandi rate today was ₹1400, or buyer phone number is unreachable)"
                    rows={4}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Optional: Name */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={reportForm.reporterName}
                      onChange={(e) => setReportForm({ ...reportForm, reporterName: e.target.value })}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Contact Phone / Email (Optional)
                    </label>
                    <input
                      type="text"
                      value={reportForm.reporterContact}
                      onChange={(e) => setReportForm({ ...reportForm, reporterContact: e.target.value })}
                      placeholder="e.g. 98220XXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Creating Audit Ticket...' : 'Submit Report to Audit Queue'}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

// Helper Components

const ProvenanceCard = ({ icon: Icon, iconColor, title, badge, badgeColor, children }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
        {badge}
      </span>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const SourceDetail = ({ label, value }) => (
  <div className="flex items-start gap-2 text-xs sm:text-sm">
    <span className="font-bold text-slate-700 min-w-[130px]">{label}:</span>
    <span className="text-slate-600 font-medium">{value}</span>
  </div>
);

export default TrustScreen;
