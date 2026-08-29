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
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * TrustScreen - Data Integrity & Transparency Portal
 * 
 * Three sections:
 * 1. Provenance cards - "How we know what we show is true"
 * 2. Report form - "Report something that looks wrong"
 * 3. Worked examples - Live demo of flagged content (added in M3)
 */
export const TrustScreen = ({ onExit }) => {
  const { t } = useT();
  const [provenance, setProvenance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  // Fetch provenance on mount
  useEffect(() => {
    fetchProvenance();
  }, []);

  const fetchProvenance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/trust/provenance`);
      if (response.data.success) {
        setProvenance(response.data.provenance);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportForm.reason.trim()) {
      alert(t('trust.report.reasonRequired'));
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
      alert(t('trust.report.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">{t('common.back')}</span>
          </button>
          <div className="flex-1 flex items-center gap-3">
            <BadgeCheck className="h-7 w-7 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t('trust.title')}</h1>
              <p className="text-sm text-slate-600">{t('trust.subtitle')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-12">
        
        {/* Intro */}
        <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-start gap-4">
            <ShieldAlert className="h-8 w-8 text-emerald-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">{t('trust.intro.title')}</h2>
              <p className="text-slate-700 leading-relaxed">{t('trust.intro.description')}</p>
            </div>
          </div>
        </section>

        {/* Section 1: Provenance - "How we know what we show is true" */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">{t('trust.provenance.title')}</h2>
          </div>

          {loading && (
            <div className="text-center py-12 text-slate-500">{t('common.loading')}</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <AlertCircle className="h-5 w-5 inline mr-2" />
              {t('trust.provenance.loadError')}
            </div>
          )}

          {provenance && (
            <div className="grid gap-6">
              
              {/* 1. Government Feed */}
              <ProvenanceCard
                icon={Database}
                iconColor="text-blue-600"
                title={t('trust.source.govFeed.title')}
                badge={provenance.governmentFeed.isLive ? t('trust.source.govFeed.live') : t('trust.source.govFeed.offline')}
                badgeColor={provenance.governmentFeed.isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}
              >
                <SourceDetail label={t('trust.source.govFeed.authority')} value={provenance.governmentFeed.authority} />
                <SourceDetail label={t('trust.source.govFeed.resourceId')} value={provenance.governmentFeed.resourceId} />
                <SourceDetail label={t('trust.source.govFeed.refresh')} value={provenance.governmentFeed.refreshCadence} />
                <SourceDetail label={t('trust.source.govFeed.method')} value={provenance.governmentFeed.method} />
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-900 font-medium mb-1">{t('trust.source.govFeed.whatWeShow')}</p>
                  <p className="text-sm text-blue-800">{provenance.governmentFeed.whatWeShow}</p>
                  <p className="text-sm text-blue-900 font-medium mt-2 mb-1">{t('trust.source.govFeed.whatWeDontDo')}</p>
                  <p className="text-sm text-blue-800">{provenance.governmentFeed.whatWeDontDo}</p>
                </div>

                <a
                  href={provenance.governmentFeed.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  {t('trust.source.verifyAtSource')} <ExternalLink className="h-4 w-4" />
                </a>
              </ProvenanceCard>

              {/* 2. Sell/Hold Advice */}
              <ProvenanceCard
                icon={Brain}
                iconColor="text-amber-600"
                title={t('trust.source.advice.title')}
                badge={t('trust.source.advice.badge')}
                badgeColor="bg-amber-100 text-amber-800"
              >
                <SourceDetail label={t('trust.source.advice.method')} value={provenance.sellHoldAdvice.method} />
                
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">{t('trust.source.advice.inputs')}</p>
                  <ul className="space-y-1">
                    {provenance.sellHoldAdvice.inputs.map((input, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {input}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm text-amber-900 font-medium mb-1">{t('trust.source.advice.whatWeWithhold')}</p>
                  <ul className="space-y-1">
                    {provenance.sellHoldAdvice.whatWeWithhold.map((item, i) => (
                      <li key={i} className="text-sm text-amber-800">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-sm text-slate-700 italic">{provenance.sellHoldAdvice.disclaimer}</p>
                </div>
              </ProvenanceCard>

              {/* 3. Price Forecast */}
              {provenance.priceForecast.health !== 'offline' && (
                <ProvenanceCard
                  icon={Brain}
                  iconColor="text-purple-600"
                  title={t('trust.source.forecast.title')}
                  badge={`${t('trust.source.forecast.health')}: ${provenance.priceForecast.health}`}
                  badgeColor={provenance.priceForecast.health === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}
                >
                  <SourceDetail label={t('trust.source.forecast.algorithm')} value={provenance.priceForecast.algorithm} />
                  <SourceDetail label={t('trust.source.forecast.trainedOn')} value={provenance.priceForecast.trainedOn} />
                  <SourceDetail label={t('trust.source.forecast.geography')} value={provenance.priceForecast.geography} />
                  <SourceDetail label={t('trust.source.forecast.horizon')} value={provenance.priceForecast.horizon} />
                  
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-900 font-medium mb-1">{t('trust.source.forecast.whatWeWithhold')}</p>
                    <ul className="space-y-1">
                      {provenance.priceForecast.whatWeWithhold.map((item, i) => (
                        <li key={i} className="text-sm text-purple-800">• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                    <p className="text-sm text-slate-700"><strong>{t('trust.source.forecast.safetyTitle')}:</strong> {provenance.priceForecast.safetyMeasure}</p>
                  </div>
                </ProvenanceCard>
              )}

              {/* 4. Spoilage Model */}
              <ProvenanceCard
                icon={Leaf}
                iconColor="text-emerald-600"
                title={t('trust.source.spoilage.title')}
                badge={t('trust.source.spoilage.badge')}
                badgeColor="bg-emerald-100 text-emerald-800"
              >
                <SourceDetail label={t('trust.source.spoilage.method')} value={provenance.spoilageModel.method} />
                
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">{t('trust.source.spoilage.inputs')}</p>
                  <ul className="space-y-1">
                    {provenance.spoilageModel.inputs.map((input, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {input}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-sm text-emerald-900 font-medium mb-1">{t('trust.source.spoilage.whatWeWithhold')}</p>
                  <ul className="space-y-1">
                    {provenance.spoilageModel.whatWeWithhold.map((item, i) => (
                      <li key={i} className="text-sm text-emerald-800">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-sm text-slate-700 italic">{provenance.spoilageModel.disclaimer}</p>
                </div>
              </ProvenanceCard>

              {/* 5. Government Schemes */}
              <ProvenanceCard
                icon={FileText}
                iconColor="text-indigo-600"
                title={t('trust.source.schemes.title')}
                badge={t('trust.source.schemes.badge')}
                badgeColor="bg-indigo-100 text-indigo-800"
              >
                <div className="space-y-3">
                  <p className="text-sm text-slate-700">
                    <strong>{t('trust.source.schemes.approach')}:</strong> {provenance.governmentSchemes.approach}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>{t('trust.source.schemes.whatWeDo')}:</strong> {provenance.governmentSchemes.whatWeDo}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>{t('trust.source.schemes.whatWeDontDo')}:</strong> {provenance.governmentSchemes.whatWeDontDo}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {provenance.governmentSchemes.schemes.map((scheme, i) => (
                    <a
                      key={i}
                      href={scheme.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors group"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{scheme.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {t('trust.source.schemes.lastChecked')}: {scheme.lastChecked}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                    </a>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-900 font-medium">{provenance.governmentSchemes.disclaimer}</p>
                </div>
              </ProvenanceCard>
            </div>
          )}
        </section>

        {/* Section 2: Report Form */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-slate-900">{t('trust.report.title')}</h2>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('trust.report.submitted')}</h3>
                <p className="text-slate-600 mb-4">{t('trust.report.ticketId')}: <strong className="font-mono">{submitted}</strong></p>
                <p className="text-sm text-slate-500 mb-6">{t('trust.report.reviewMessage')}</p>
                <button
                  onClick={() => setSubmitted(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  {t('trust.report.submitAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('trust.report.category')}
                  </label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="price_dispute">{t('trust.report.categories.priceDispute')}</option>
                    <option value="scam_posting">{t('trust.report.categories.scamPosting')}</option>
                    <option value="scheme_rumor">{t('trust.report.categories.schemeRumor')}</option>
                    <option value="treatment_claim">{t('trust.report.categories.treatmentClaim')}</option>
                    <option value="other">{t('trust.report.categories.other')}</option>
                  </select>
                </div>

                {/* What did you see */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('trust.report.whatDidYouSee')}
                  </label>
                  <input
                    type="text"
                    value={reportForm.subjectLabel}
                    onChange={(e) => setReportForm({ ...reportForm, subjectLabel: e.target.value })}
                    placeholder={t('trust.report.whatDidYouSeePlaceholder')}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Why it looks wrong */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('trust.report.whyWrong')} *
                  </label>
                  <textarea
                    value={reportForm.reason}
                    onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                    placeholder={t('trust.report.whyWrongPlaceholder')}
                    rows={4}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Optional: Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('trust.report.yourName')} ({t('trust.report.optional')})
                  </label>
                  <input
                    type="text"
                    value={reportForm.reporterName}
                    onChange={(e) => setReportForm({ ...reportForm, reporterName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Optional: Contact */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('trust.report.yourContact')} ({t('trust.report.optional')})
                  </label>
                  <input
                    type="text"
                    value={reportForm.reporterContact}
                    onChange={(e) => setReportForm({ ...reportForm, reporterContact: e.target.value })}
                    placeholder={t('trust.report.yourContactPlaceholder')}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
                >
                  <Send className="h-5 w-5" />
                  {submitting ? t('trust.report.submitting') : t('trust.report.submit')}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Section 3: Worked Examples (M3 - placeholder for now) */}
        <section className="space-y-6">
          <div className="bg-slate-100 rounded-xl p-8 text-center border-2 border-dashed border-slate-300">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">{t('trust.examples.placeholder')}</p>
          </div>
        </section>

      </main>
    </div>
  );
};

// Helper Components

const ProvenanceCard = ({ icon: Icon, iconColor, title, badge, badgeColor, children }) => (
  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${iconColor}`} />
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
  <div className="flex items-start gap-2">
    <span className="text-sm font-medium text-slate-700 min-w-[120px]">{label}:</span>
    <span className="text-sm text-slate-600">{value}</span>
  </div>
);
