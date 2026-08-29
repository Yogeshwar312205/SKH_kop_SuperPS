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

module.exports = { getCandidates, optimizeSiting };
