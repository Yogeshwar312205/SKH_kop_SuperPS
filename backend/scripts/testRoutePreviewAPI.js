const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BusStop = require('../src/models/BusStop');
const BusRoute = require('../src/models/BusRoute');
const { validateRoute, getRoutePreview } = require('../src/services/routeValidator');

async function testRoutePreview() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get KPG-DEPOT and SHIRDI stops
    const kpgDepot = await BusStop.findOne({ code: 'KPG-DEPOT' });
    const shirdi = await BusStop.findOne({ code: 'SHIRDI' });

    if (!kpgDepot || !shirdi) {
      console.error('✗ Required stops not found');
      process.exit(1);
    }

    console.log('=== STOPS FOUND ===');
    console.log(`Origin: ${kpgDepot.name} (${kpgDepot.code})`);
    console.log(`  _id: ${kpgDepot._id}`);
    console.log(`  String(_id): ${String(kpgDepot._id)}`);
    console.log(`\nDestination: ${shirdi.name} (${shirdi.code})`);
    console.log(`  _id: ${shirdi._id}`);
    console.log(`  String(_id): ${String(shirdi._id)}`);

    // Test validateRoute function
    console.log('\n=== TESTING validateRoute() ===');
    const validation = await validateRoute(
      String(kpgDepot._id),
      String(shirdi._id)
    );

    console.log(JSON.stringify(validation, null, 2));

    if (validation.isValid) {
      console.log('\n✓ Route validation SUCCESSFUL');
      console.log(`  Found ${validation.routes.length} route(s)`);
      validation.routes.forEach((route, idx) => {
        console.log(`  [${idx}] ${route.routeName} (${route.routeCode})`);
        console.log(`      Distance: ${route.segmentDistanceKm}km`);
        console.log(`      Travel Time: ${route.estimatedTravelTime}`);
      });
    } else {
      console.log('\n✗ Route validation FAILED');
      console.log(`  Error: ${validation.error}`);
      console.log(`  Code: ${validation.code}`);
    }

    // Test getRoutePreview function
    console.log('\n=== TESTING getRoutePreview() ===');
    const today = new Date().toISOString().split('T')[0];
    const preview = await getRoutePreview(
      String(kpgDepot._id),
      String(shirdi._id),
      today,
      0
    );

    if (preview.isValid) {
      console.log('\n✓ Route preview SUCCESSFUL');
      console.log(`  Date: ${preview.serviceDate}`);
      console.log(`  Day: ${preview.dayOfWeek}`);
      console.log(`  Available Trips: ${preview.totalAvailableTrips}`);
      console.log(`  Recommendation: ${preview.recommendation}`);
    } else {
      console.log('\n✗ Route preview FAILED');
      console.log(`  Error: ${preview.error}`);
    }

    // Check the route in database
    console.log('\n=== DATABASE ROUTES CHECK ===');
    const routes = await BusRoute.find({}).populate('stops.stopId');
    console.log(`Total routes in database: ${routes.length}`);
    
    routes.forEach((route) => {
      const hasKpg = route.stops.some(s => String(s.stopId._id) === String(kpgDepot._id));
      const hasShirdi = route.stops.some(s => String(s.stopId._id) === String(shirdi._id));
      
      if (hasKpg || hasShirdi) {
        console.log(`\nRoute: ${route.name} (${route.code})`);
        console.log(`  Has KPG-DEPOT: ${hasKpg}`);
        console.log(`  Has SHIRDI: ${hasShirdi}`);
        console.log(`  Stops:`);
        route.stops.forEach((stop, idx) => {
          console.log(`    [${idx}] ${stop.stopId.name} (${stop.stopId.code}) - seq:${stop.seq}`);
        });
      }
    });

    await mongoose.disconnect();
    console.log('\n✓ Test complete');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testRoutePreview();
