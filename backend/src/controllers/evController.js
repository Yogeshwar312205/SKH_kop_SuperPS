const ChargingCandidate = require('../models/ChargingCandidate');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// GET /api/v2/ev/candidates
const getCandidates = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        count: 3,
        candidates: [
          {
            id: 'cand-001',
            name: 'Kopargaon ST Depot',
            location: { type: 'Point', coordinates: [74.4765, 19.8826] },
            siteType: 'bus-depot',
            demandScore: 85,
            dwellScore: 90,
            gridScore: 95,
            totalScore: 90,
            selected: true,
          },
          {
            id: 'cand-002',
            name: 'Shirdi Bus Stand',
            location: { type: 'Point', coordinates: [74.4777, 19.7645] },
            siteType: 'major-stop',
            demandScore: 78,
            dwellScore: 65,
            gridScore: 80,
            totalScore: 74,
            selected: true,
          },
          {
            id: 'cand-003',
            name: 'Kopargaon APMC',
            location: { type: 'Point', coordinates: [74.4712, 19.8801] },
            siteType: 'mandi',
            demandScore: 65,
            dwellScore: 55,
            gridScore: 70,
            totalScore: 63,
            selected: false,
          },
        ],
      });
    }

    const candidates = await ChargingCandidate.find({}).sort({ totalScore: -1 });

    return res.json({
      success: true,
      source: 'database',
      count: candidates.length,
      candidates: candidates.map((c) => ({
        id: String(c._id),
        name: c.name,
        location: c.location,
        siteType: c.siteType,
        demandScore: c.demandScore,
        dwellScore: c.dwellScore,
        gridScore: c.gridScore,
        totalScore: c.totalScore,
        selected: c.selected,
      })),
    });
  } catch (error) {
    logger.error(`Get EV candidates failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load charging candidates.' });
  }
};

// POST /api/v2/ev/optimize
const optimizeSiting = async (req, res) => {
  try {
    const { k } = req.body || {};

    if (!k || k < 1) {
      return res.status(400).json({ success: false, message: 'k (number of sites) must be >= 1.' });
    }

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        selected: ['cand-001', 'cand-002'],
        coverageBefore: 42,
        coverageAfter: 78,
        scoreBreakdown: {
          demandWeight: 0.5,
          dwellWeight: 0.3,
          gridWeight: 0.2,
        },
      });
    }

    // TODO: P3 implements EV siting algorithm (calls ai-engine /solve/ev-siting)

    return res.json({
      success: true,
      source: 'stub',
      message: 'EV siting endpoint ready. Awaiting P3 implementation.',
    });
  } catch (error) {
    logger.error(`Optimize EV siting failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not optimize siting.' });
  }
};

// List of Rural Maharashtra Corridor EV Charging Stations
const EV_CHARGING_STATIONS = [
  {
    id: 'ev-kpg-depot',
    name: 'Kopargaon ST Depot EV Fast Charger',
    code: 'KPG-DEPOT',
    coordinates: [74.4765, 19.8826],
    chargerKw: 60,
    portsAvailable: 3,
    totalPorts: 4,
    connectorType: 'CCS2 / Type 2',
    costPerKwhRs: 14.50,
  },
  {
    id: 'ev-shirdi-solar',
    name: 'Shirdi Solar Microgrid Charging Hub',
    code: 'SHIRDI',
    coordinates: [74.4777, 19.7645],
    chargerKw: 50,
    portsAvailable: 2,
    totalPorts: 4,
    connectorType: 'CCS2 Fast',
    costPerKwhRs: 12.00,
  },
  {
    id: 'ev-apmc-mandi',
    name: 'Kopargaon APMC Mandi Green Station',
    code: 'KPG-APMC',
    coordinates: [74.4712, 19.8801],
    chargerKw: 30,
    portsAvailable: 4,
    totalPorts: 6,
    connectorType: 'Type 2 / Bharat AC',
    costPerKwhRs: 11.50,
  },
  {
    id: 'ev-rahata-junction',
    name: 'Rahata Express EV Station',
    code: 'RAHATA',
    coordinates: [74.4842, 19.8052],
    chargerKw: 50,
    portsAvailable: 2,
    totalPorts: 2,
    connectorType: 'CCS2',
    costPerKwhRs: 15.00,
  },
  {
    id: 'ev-nashik-hub',
    name: 'Nashik CBS Central EV Terminal',
    code: 'NASHIK',
    coordinates: [73.7898, 19.9975],
    chargerKw: 120,
    portsAvailable: 5,
    totalPorts: 8,
    connectorType: 'CCS2 Ultra-Fast',
    costPerKwhRs: 16.00,
  },
];

// POST /api/v2/ev/route-optimize
const optimizeEVRoute = async (req, res) => {
  try {
    const {
      batteryCapacityKwh = 40,
      currentSoc = 45,
      cargoWeightKg = 1200,
      distanceKm = 68.5,
      originCode = 'KPG-DEPOT',
      destCode = 'NASHIK',
    } = req.body || {};

    const capacity = Number(batteryCapacityKwh) || 40;
    const soc = Math.min(100, Math.max(5, Number(currentSoc) || 45));
    const cargoWeight = Number(cargoWeightKg) || 1200;
    const distance = Number(distanceKm) || 68.5;

    // Energy consumption model: 0.22 kWh/km base + 0.04 kWh/km per 1,000 kg cargo
    const consumptionRateKwhPerKm = 0.22 + (cargoWeight / 1000) * 0.04;
    const totalEnergyRequiredKwh = distance * consumptionRateKwhPerKm;
    const currentEnergyKwh = (soc / 100) * capacity;

    const remainingEnergyAtDestKwh = currentEnergyKwh - totalEnergyRequiredKwh;
    const predictedSocAtDest = Math.round((remainingEnergyAtDestKwh / capacity) * 100);

    const requiresChargingStop = predictedSocAtDest < 20;

    let selectedStation = null;
    let chargingTimeMin = 0;
    let chargedEnergyKwh = 0;
    let postChargeSoc = predictedSocAtDest;

    if (requiresChargingStop) {
      // Pick best charging station near origin or mid-corridor
      selectedStation = EV_CHARGING_STATIONS.find((s) => s.code === originCode) || EV_CHARGING_STATIONS[0];
      
      // Charge up to 85% SoC
      const targetSoc = 85;
      const targetKwh = (targetSoc / 100) * capacity;
      chargedEnergyKwh = Math.max(0, targetKwh - currentEnergyKwh);
      chargingTimeMin = Math.round((chargedEnergyKwh / selectedStation.chargerKw) * 60);
      
      const updatedEnergyAtDest = (targetKwh - totalEnergyRequiredKwh);
      postChargeSoc = Math.round((updatedEnergyAtDest / capacity) * 100);
    }

    // CO2 Savings compared to diesel pickup (0.265 kg CO2/km)
    const co2SavedKg = Math.round(distance * 0.265 * 10) / 10;
    const fuelCostSavedRs = Math.round(distance * 6.5); // Diesel cost diff

    return res.json({
      success: true,
      vehicleType: 'E-Pickup',
      batteryCapacityKwh: capacity,
      initialSoc: soc,
      cargoWeightKg: cargoWeight,
      distanceKm: distance,
      consumptionRateKwhPerKm: Math.round(consumptionRateKwhPerKm * 100) / 100,
      totalEnergyRequiredKwh: Math.round(totalEnergyRequiredKwh * 10) / 10,
      predictedSocWithoutCharge: predictedSocAtDest,
      requiresChargingStop,
      chargingStop: requiresChargingStop ? {
        station: selectedStation,
        chargedEnergyKwh: Math.round(chargedEnergyKwh * 10) / 10,
        dwellTimeMin: chargingTimeMin,
        postChargeSocAtDest: Math.max(25, postChargeSoc),
      } : null,
      co2SavedKg,
      fuelCostSavedRs,
      allStations: EV_CHARGING_STATIONS,
    });
  } catch (error) {
    logger.error(`EV Route Optimization failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to calculate EV route optimization.' });
  }
};

module.exports = { getCandidates, optimizeSiting, optimizeEVRoute, EV_CHARGING_STATIONS };
