require('dotenv').config();
const mongoose = require('mongoose');
const BusRoute = require('../src/models/BusRoute');
const BusStop = require('../src/models/BusStop');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Get stops
    const stops = await BusStop.find({});
    console.log('Available Stops:');
    stops.forEach(s => console.log(`  - ${s.name} (${s.code}): ${s._id}`));
    
    const kpgDepot = stops.find(s => s.code === 'KPG-DEPOT');
    const shirdi = stops.find(s => s.code === 'SHIRDI');
    
    console.log('\n=== Testing Route Between ===');
    console.log(`Origin: ${kpgDepot?.name} - ID: ${kpgDepot?._id}`);
    console.log(`Dest: ${shirdi?.name} - ID: ${shirdi?._id}`);
    
    // Get routes with populated stops
    const routes = await BusRoute.find({}).populate('stops.stopId');
    console.log(`\n=== Routes Found: ${routes.length} ===`);
    
    routes.forEach(route => {
      console.log(`\nRoute: ${route.code} - ${route.name}`);
      console.log(`Distance: ${route.distanceKm} km`);
      console.log(`Stops (${route.stops.length}):`);
      route.stops.forEach(s => {
        const stop = s.stopId;
        const stopId = stop?._id || s.stopId;
        console.log(`  [${s.seq}] ${stop?.name || 'Unknown'} (${stop?.code || 'N/A'}) - ${stopId} - offset: ${s.offsetMin} min`);
      });
      
      // Check if this route has both stops
      const hasOrigin = route.stops.some(s => String(s.stopId._id || s.stopId) === String(kpgDepot._id));
      const hasDest = route.stops.some(s => String(s.stopId._id || s.stopId) === String(shirdi._id));
      
      if (hasOrigin && hasDest) {
        console.log(`  ✓ This route connects KPG-DEPOT and SHIRDI!`);
        
        // Check order
        const originIdx = route.stops.findIndex(s => String(s.stopId._id || s.stopId) === String(kpgDepot._id));
        const destIdx = route.stops.findIndex(s => String(s.stopId._id || s.stopId) === String(shirdi._id));
        
        if (originIdx < destIdx) {
          console.log(`  ✓ Correct order: origin at position ${originIdx}, dest at position ${destIdx}`);
        } else {
          console.log(`  ✗ Wrong order: origin at position ${originIdx}, dest at position ${destIdx}`);
        }
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
