const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';
const RULEBOOK_PATH = path.join(__dirname, '../../config/rulebook.yaml');

// POST /api/v2/rules/evaluate — evaluate a consignment against trips
const evaluateRules = async (req, res) => {
  try {
    const { consignment, tripIds } = req.body || {};

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        decision: {
          consignmentId: consignment?.id || 'cons-mock',
          decision: 'ASSIGNED',
          trace: [
            { rule: 'SAF-01', result: 'PASS', detail: 'Commodity not hazardous' },
            { rule: 'PHY-01', result: 'PASS', detail: 'Weight within limit' },
            { rule: 'CAP-01', result: 'PASS', tripId: tripIds?.[0], detail: 'Capacity available' },
          ],
          chosen: tripIds?.[0] || 'trip-001',
          summary: 'Consignment approved for bus transport. Capacity and safety checks passed.',
        },
      });
    }

    // TODO: P3 implements the actual rule engine here
    // For now, return a stub that signals real implementation is needed

    return res.json({
      success: true,
      source: 'stub',
      message: 'Rule evaluation endpoint ready. Awaiting P3 implementation.',
      decision: null,
    });
  } catch (error) {
    logger.error(`Evaluate rules failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not evaluate rules.' });
  }
};

// GET /api/v2/rules/book — read the rulebook (read-only)
const getRulebook = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        rulebook: {
          version: '1.0',
          hardRules: [
            {
              id: 'SAF-01',
              description: 'Flammable / hazardous goods',
              basis: 'Passenger safety',
              type: 'hard',
            },
            {
              id: 'PHY-01',
              description: 'Single piece > 50 kg',
              basis: 'MSRTC luggage ceiling',
              type: 'hard',
            },
          ],
          softRules: [
            {
              id: 'WX-01',
              description: 'Rain probability on route × non-waterproof packaging',
              type: 'soft',
              penalty: 40,
            },
          ],
        },
      });
    }

    const content = await fs.readFile(RULEBOOK_PATH, 'utf8');
    const rulebook = yaml.load(content);

    return res.json({
      success: true,
      source: 'file',
      rulebook,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, message: 'Rulebook file not found. Run seed script first.' });
    }
    logger.error(`Get rulebook failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load rulebook.' });
  }
};

module.exports = { evaluateRules, getRulebook };
