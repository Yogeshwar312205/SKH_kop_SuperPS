const logger = require('../utils/logger');

/**
 * Noise words for Mandi Name matching (reused from traders logic)
 */
const NOISE = new Set([
  'apmc', 'market', 'markets', 'wholesale', 'main', 'central', 'committee',
  'produce', 'agricultural', 'agriculture', 'krushi', 'krishi', 'utpanna',
  'utpann', 'bazar', 'bajar', 'samiti', 'samati', 'yard', 'mandi', 'hub',
  'pvt', 'ltd', 'limited', 'private', 'co', 'op', 'dist', 'tal', 'the', 'and',
]);

const ALIASES = [
  ['mumbai', 'vashi', 'turbhe', 'navi'],
  ['nasik', 'nashik'],
  ['sambhajinagar', 'aurangabad'],
  ['ahilyanagar', 'ahmednagar'],
  ['dharashiv', 'osmanabad'],
  ['pune', 'gultekdi'],
  ['kopargaon', 'kopergaon'],
];

const significantWords = (name = '') =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z\s]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !NOISE.has(word));

const expand = (words) => {
  const out = new Set(words);
  for (const group of ALIASES) {
    if (words.some((word) => group.includes(word))) group.forEach((alias) => out.add(alias));
  }
  return out;
};

const sameMandi = (a, b) => {
  const left = expand(significantWords(a));
  const right = significantWords(b);
  if (!left.size || !right.length) return false;
  return right.some((word) => left.has(word));
};

// Known valid APMC mandis in Maharashtra / key agricultural regions
const KNOWN_APMC_MANDIS = [
  'Mumbai APMC', 'Vashi APMC', 'Pune APMC', 'Nashik APMC', 'Kopargaon APMC',
  'Solapur APMC', 'Nagpur APMC', 'Kolhapur APMC', 'Latur APMC', 'Amravati APMC',
  'Sangli APMC', 'Jalgaon APMC', 'Nanded APMC', 'Ahmednagar APMC', 'Satara APMC',
  'Aurangabad APMC', 'Dharashiv APMC', 'Akola APMC', 'Ratnagiri APMC', 'Shrirampur APMC'
];

const isMandiResolvable = (mandiName) => {
  if (!mandiName) return false;
  return KNOWN_APMC_MANDIS.some(known => sameMandi(mandiName, known));
};

/**
 * Assess a buyer posting for potential data integrity risks / scam signals.
 * 
 * Heuristics assist, never judge. A posting marked past threshold auto-opens
 * a ticket for a human admin. It is NEVER auto-removed.
 * 
 * @param {Object} posting - { cropName, mandiName, pricePerKg, ... }
 * @param {Object} context - { agmarknetModalPerKg, buyerUser, postingCount24h }
 * @returns {Object} { score, autoTicket, signals }
 */
const assessBuyerPosting = async (posting, context = {}) => {
  const signals = [];
  let score = 0;

  const price = Number(posting.pricePerKg || posting.offeredPricePerKg || 0);
  const mandiName = posting.mandiName || '';
  const agmarknetModal = Number(context.agmarknetModalPerKg || 0);

  // 1. Rate Deviation vs Agmarknet Modal
  if (price > 0 && agmarknetModal > 0) {
    const deviationRatio = Math.abs(price - agmarknetModal) / agmarknetModal;
    const isHigher = price > agmarknetModal;
    
    if (deviationRatio >= 0.40) { // >= 40% deviation
      score += 2; // High severity
      signals.push({
        code: 'PRICE_DEVIATION_HIGH',
        severity: 'high',
        detail: `Offered rate (₹${price}/kg) is ${Math.round(deviationRatio * 100)}% ${isHigher ? 'above' : 'below'} Agmarknet modal rate (₹${agmarknetModal}/kg)`,
      });
    } else if (deviationRatio >= 0.20) { // >= 20% deviation
      score += 1; // Medium severity
      signals.push({
        code: 'PRICE_DEVIATION_MEDIUM',
        severity: 'medium',
        detail: `Offered rate (₹${price}/kg) deviates by ${Math.round(deviationRatio * 100)}% from Agmarknet modal rate (₹${agmarknetModal}/kg)`,
      });
    }
  }

  // 2. Unresolvable Mandi Check
  if (mandiName && !isMandiResolvable(mandiName)) {
    score += 1; // Medium severity
    signals.push({
      code: 'UNRESOLVED_MANDI',
      severity: 'medium',
      detail: `Mandi '${mandiName}' could not be resolved to a recognized APMC market yard`,
    });
  }

  // 3. New Account Check (created within 48h)
  if (context.buyerUser && context.buyerUser.createdAt) {
    const accountAgeMs = Date.now() - new Date(context.buyerUser.createdAt).getTime();
    const accountAgeHours = accountAgeMs / (1000 * 60 * 60);
    
    if (accountAgeHours < 48) {
      score += 1; // Medium severity
      signals.push({
        code: 'NEW_BUYER_ACCOUNT',
        severity: 'medium',
        detail: `Posting created by a newly registered buyer account (${Math.round(accountAgeHours)} hours old)`,
      });
    }
  }

  // 4. High Posting Velocity (> 5 postings in last 24h)
  const postingVelocity = Number(context.postingCount24h || 0);
  if (postingVelocity >= 5) {
    score += 2; // High severity
    signals.push({
      code: 'HIGH_POSTING_VELOCITY',
      severity: 'high',
      detail: `High creation frequency: buyer posted ${postingVelocity} offers in the last 24 hours`,
    });
  }

  const autoTicket = score >= 2;

  logger.info(`[TrustSignals] Evaluated posting '${posting.cropName || 'posting'}' (Score: ${score}, Signals: ${signals.length}, AutoTicket: ${autoTicket})`);

  return {
    score,
    autoTicket,
    signals,
  };
};

module.exports = {
  assessBuyerPosting,
  sameMandi,
  isMandiResolvable,
};
