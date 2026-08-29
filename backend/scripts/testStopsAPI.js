const mongoose = require('mongoose');
const BusStop = require('../src/models/BusStop');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testStops() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const stops = await BusStop.find({}).sort({ code: 1 });
    console.log(`\n✓ Found ${stops.length} stops in database:`);
    
    stops.forEach((stop, idx) => {
      console.log(`  [${idx}] ${stop.name} (${stop.code})`);
      console.log(`      _id: ${stop._id}`);
      console.log(`      String(_id): ${String(stop._id)}`);
    });

    console.log('\n✓ Check MOCK_MODE setting:');
    console.log(`  MOCK_MODE env var: ${process.env.MOCK_MODE}`);
    console.log(`  Evaluated as: ${process.env.MOCK_MODE === 'true'}`);

    await mongoose.disconnect();
    console.log('\n✓ Test complete');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testStops();
