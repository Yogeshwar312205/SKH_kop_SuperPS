const logger = require('../utils/logger');

/**
 * Commodity Classification Service (§3.1, §3.2)
 * 
 * Normalizes commodity names and classifies them into categories:
 * - HAZARDOUS: Cannot be transported on passenger buses
 * - AGRICULTURAL: Bus-eligible agricultural products (Class A)
 * - GENERAL: General parcels (Class B)
 * - INSTITUTIONAL: Institutional cargo (Class C)
 * - FRAGILE: Requires special handling
 * - FLAMMABLE: Fire risk
 */

// Hazardous materials database
const HAZARDOUS_KEYWORDS = [
  'poison', 'pesticide', 'insecticide', 'herbicide', 'fungicide',
  'chemical', 'acid', 'alkali', 'caustic', 'corrosive',
  'explosive', 'firework', 'detonator', 'ammunition',
  'flammable', 'fuel', 'diesel', 'petrol', 'gasoline', 'kerosene',
  'gas', 'lpg', 'cng', 'propane', 'butane',
  'toxic', 'hazardous', 'dangerous',
  'bleach', 'ammonia', 'chlorine',
  'paint thinner', 'solvent', 'alcohol' // industrial alcohol
];

// Agricultural products
const AGRICULTURAL_KEYWORDS = [
  'seed', 'seeds', 'grain', 'wheat', 'rice', 'corn', 'maize',
  'soybean', 'soya', 'chickpea', 'lentil', 'pulse',
  'onion', 'potato', 'tomato', 'vegetable', 'fruit',
  'cotton', 'sugarcane', 'jaggery', 'gur',
  'fertilizer', 'manure', 'compost', // non-chemical fertilizers
  'fodder', 'hay', 'straw',
  'milk', 'dairy', 'ghee', 'butter', 'paneer'
];

// Fragile items
const FRAGILE_KEYWORDS = [
  'glass', 'bottle', 'jar', 'container',
  'ceramic', 'pottery', 'earthenware',
  'mirror', 'frame',
  'egg', 'eggs'
];

// General parcels
const GENERAL_KEYWORDS = [
  'cloth', 'fabric', 'textile', 'garment',
  'book', 'paper', 'document', 'file',
  'tool', 'equipment', 'spare', 'part',
  'plastic', 'rubber', 'metal',
  'package', 'parcel', 'box', 'carton'
];

/**
 * Normalize commodity string
 */
function normalizeCommodity(commodity) {
  if (!commodity || typeof commodity !== 'string') {
    return '';
  }
  
  return commodity
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Check if commodity matches any keyword in a list
 */
function matchesKeywords(normalized, keywords) {
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      return { matched: true, keyword };
    }
  }
  return { matched: false, keyword: null };
}

/**
 * Classify commodity and determine bus eligibility
 * 
 * @param {string} commodity - Raw commodity name from user
 * @returns {Object} Classification result
 */
function classifyCommodity(commodity) {
  const normalized = normalizeCommodity(commodity);
  
  if (!normalized) {
    return {
      input: commodity,
      normalized: '',
      category: 'UNKNOWN',
      subcategory: null,
      confidence: 0,
      busEligible: false,
      cargoClass: 'D',
      reason: 'Empty or invalid commodity name',
      matchedKeyword: null
    };
  }

  // Priority 1: Check for hazardous materials (highest priority)
  const hazardousMatch = matchesKeywords(normalized, HAZARDOUS_KEYWORDS);
  if (hazardousMatch.matched) {
    return {
      input: commodity,
      normalized,
      category: 'HAZARDOUS',
      subcategory: determineHazardousSubcategory(hazardousMatch.keyword),
      confidence: 0.98,
      busEligible: false,
      cargoClass: 'D',
      reason: 'Potentially hazardous material - not allowed on passenger buses',
      matchedKeyword: hazardousMatch.keyword,
      safetyRules: ['SAF-01']
    };
  }

  // Priority 2: Check for fragile items
  const fragileMatch = matchesKeywords(normalized, FRAGILE_KEYWORDS);
  if (fragileMatch.matched) {
    return {
      input: commodity,
      normalized,
      category: 'FRAGILE',
      subcategory: 'FRAGILE_ITEM',
      confidence: 0.92,
      busEligible: true, // Allowed with proper packaging
      cargoClass: 'B',
      reason: 'Fragile item - requires proper packaging and handling',
      matchedKeyword: fragileMatch.keyword,
      safetyRules: ['SAF-02', 'PKG-01'],
      packagingRequirement: 'sealed-box'
    };
  }

  // Priority 3: Check for agricultural products
  const agriMatch = matchesKeywords(normalized, AGRICULTURAL_KEYWORDS);
  if (agriMatch.matched) {
    return {
      input: commodity,
      normalized,
      category: 'AGRICULTURAL',
      subcategory: determineAgriSubcategory(agriMatch.keyword),
      confidence: 0.95,
      busEligible: true,
      cargoClass: 'A',
      reason: 'Agricultural cargo - bus-eligible',
      matchedKeyword: agriMatch.keyword,
      safetyRules: []
    };
  }

  // Priority 4: Check for general parcels
  const generalMatch = matchesKeywords(normalized, GENERAL_KEYWORDS);
  if (generalMatch.matched) {
    return {
      input: commodity,
      normalized,
      category: 'GENERAL',
      subcategory: 'GENERAL_PARCEL',
      confidence: 0.88,
      busEligible: true,
      cargoClass: 'B',
      reason: 'General parcel - bus-eligible',
      matchedKeyword: generalMatch.keyword,
      safetyRules: []
    };
  }

  // Default: Unknown but assume general
  return {
    input: commodity,
    normalized,
    category: 'GENERAL',
    subcategory: 'UNCLASSIFIED',
    confidence: 0.60,
    busEligible: true, // Optimistic assumption
    cargoClass: 'B',
    reason: 'Unclassified commodity - assumed general parcel',
    matchedKeyword: null,
    safetyRules: [],
    warning: 'Commodity not recognized - manual verification recommended'
  };
}

/**
 * Determine hazardous subcategory
 */
function determineHazardousSubcategory(keyword) {
  if (['poison', 'toxic'].includes(keyword)) return 'POISON';
  if (['pesticide', 'insecticide', 'herbicide', 'fungicide'].includes(keyword)) return 'PESTICIDE';
  if (['chemical', 'acid', 'alkali', 'caustic', 'corrosive'].includes(keyword)) return 'CHEMICAL';
  if (['explosive', 'firework', 'detonator', 'ammunition'].includes(keyword)) return 'EXPLOSIVE';
  if (['flammable', 'fuel', 'diesel', 'petrol', 'gasoline', 'kerosene'].includes(keyword)) return 'FLAMMABLE';
  if (['gas', 'lpg', 'cng', 'propane', 'butane'].includes(keyword)) return 'COMPRESSED_GAS';
  return 'HAZARDOUS_MATERIAL';
}

/**
 * Determine agricultural subcategory
 */
function determineAgriSubcategory(keyword) {
  if (['seed', 'seeds'].includes(keyword)) return 'SEEDS';
  if (['grain', 'wheat', 'rice', 'corn', 'maize'].includes(keyword)) return 'GRAINS';
  if (['onion', 'potato', 'tomato', 'vegetable'].includes(keyword)) return 'VEGETABLES';
  if (['fruit'].includes(keyword)) return 'FRUITS';
  if (['fertilizer', 'manure', 'compost'].includes(keyword)) return 'FERTILIZER';
  if (['milk', 'dairy', 'ghee', 'butter', 'paneer'].includes(keyword)) return 'DAIRY';
  return 'AGRICULTURAL';
}

/**
 * Get packaging recommendation based on classification
 */
function getPackagingRecommendation(classification) {
  if (classification.category === 'HAZARDOUS') {
    return null; // Not allowed on bus
  }
  
  if (classification.category === 'FRAGILE') {
    return {
      recommended: ['sealed-box', 'cardboard-box', 'wooden-crate'],
      avoid: ['loose', 'jute-sack'],
      reason: 'Fragile items require rigid, cushioned packaging'
    };
  }
  
  if (classification.subcategory === 'SEEDS' || classification.subcategory === 'GRAINS') {
    return {
      recommended: ['jute-sack', 'plastic-sack', 'hdpe-bag'],
      avoid: ['loose'],
      reason: 'Seeds and grains require moisture-resistant packaging'
    };
  }
  
  if (classification.subcategory === 'VEGETABLES' || classification.subcategory === 'FRUITS') {
    return {
      recommended: ['plastic-crate', 'ventilated-box', 'net-bag'],
      avoid: ['sealed-box'],
      reason: 'Fresh produce requires ventilation'
    };
  }
  
  if (classification.subcategory === 'DAIRY') {
    return {
      recommended: ['sealed-container', 'insulated-box'],
      avoid: ['loose', 'jute-sack'],
      reason: 'Dairy products require sealed, temperature-controlled packaging'
    };
  }
  
  return {
    recommended: ['jute-sack', 'plastic-sack', 'cardboard-box'],
    avoid: ['loose'],
    reason: 'Standard packaging suitable for this commodity'
  };
}

/**
 * Validate commodity for bus transport
 * 
 * Returns detailed validation result with rule references
 */
function validateCommodityForBus(commodity, packaging, weightKg, pieceCount) {
  const classification = classifyCommodity(commodity);
  const packagingRec = getPackagingRecommendation(classification);
  
  const validation = {
    classification,
    packagingRecommendation: packagingRec,
    isValid: true,
    errors: [],
    warnings: [],
    rules: []
  };
  
  // Rule SAF-01: Hazardous material check
  if (classification.category === 'HAZARDOUS') {
    validation.isValid = false;
    validation.errors.push({
      rule: 'SAF-01',
      severity: 'ERROR',
      message: `${classification.subcategory}: ${classification.reason}`,
      recommendation: 'Use dedicated fleet transport for hazardous materials'
    });
    validation.rules.push({
      code: 'SAF-01',
      result: 'FAIL',
      detail: `Commodity "${commodity}" classified as ${classification.subcategory}`
    });
  } else {
    validation.rules.push({
      code: 'SAF-01',
      result: 'PASS',
      detail: `Commodity "${commodity}" is not classified as hazardous`
    });
  }
  
  // Rule SAF-02: Fragile/sharp item check
  if (classification.category === 'FRAGILE') {
    if (!packaging || !['sealed-box', 'cardboard-box', 'wooden-crate'].includes(packaging)) {
      validation.warnings.push({
        rule: 'SAF-02',
        severity: 'WARNING',
        message: 'Fragile item requires protective packaging',
        recommendation: `Use ${packagingRec.recommended.join(' or ')}`
      });
      validation.rules.push({
        code: 'SAF-02',
        result: 'WARN',
        detail: 'Fragile item with inadequate packaging'
      });
    } else {
      validation.rules.push({
        code: 'SAF-02',
        result: 'PASS',
        detail: 'Fragile item has appropriate protective packaging'
      });
    }
  }
  
  // Rule PKG-01: Packaging adequacy
  if (packagingRec && packaging) {
    if (packagingRec.avoid && packagingRec.avoid.includes(packaging)) {
      validation.warnings.push({
        rule: 'PKG-01',
        severity: 'WARNING',
        message: `Packaging type "${packaging}" not recommended for ${classification.category}`,
        recommendation: `Use ${packagingRec.recommended.join(' or ')}: ${packagingRec.reason}`
      });
      validation.rules.push({
        code: 'PKG-01',
        result: 'WARN',
        detail: `Packaging "${packaging}" not optimal for commodity`
      });
    } else if (packagingRec.recommended.includes(packaging)) {
      validation.rules.push({
        code: 'PKG-01',
        result: 'PASS',
        detail: `Packaging "${packaging}" is appropriate for commodity`
      });
    }
  }
  
  // Add confidence warning for low-confidence classifications
  if (classification.confidence < 0.70) {
    validation.warnings.push({
      rule: 'CLASSIFIER',
      severity: 'INFO',
      message: `Commodity classification confidence is low (${Math.round(classification.confidence * 100)}%)`,
      recommendation: 'Manual verification recommended before booking'
    });
  }
  
  return validation;
}

module.exports = {
  classifyCommodity,
  validateCommodityForBus,
  getPackagingRecommendation,
  normalizeCommodity
};
