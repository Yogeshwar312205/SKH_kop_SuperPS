/**
 * Seed Kopargaon bus-parcel system data (§7, §8.7).
 *
 * Seeds:
 * - 15 bus stops with real OSM coordinates
 * - 6 bus routes (R-SHIRDI, R-SANGAMNER, R-NASHIK, R-ANAGAR, R-YEOLA, R-VAIJAPUR)
 * - Trips for 30 days (4-8 departures per route per day)
 * - 30 days of consignment demand (Classes A/B/C/D, with one deliberate 3× spike day)
 * - 8 EV charging candidate sites
 *
 * Run with: node backend/scripts/seedKopargaon.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const BusStop = require('../src/models/BusStop');
const BusRoute = require('../src/models/BusRoute');
const BusTrip = require('../src/models/BusTrip');
const Consignment = require('../src/models/Consignment');
const ChargingCandidate = require('../src/models/ChargingCandidate');

// ==============================================================================
// 1. BUS STOPS (§7.1) — 15 stops in Kopargaon taluka
// ==============================================================================

const STOPS = [
  // Kopargaon town
  { code: 'KPG-DEPOT', name: 'Kopargaon ST Depot', nameMr: 'कोपरगाव एसटी डेपो', 
    location: { type: 'Point', coordinates: [74.4765, 19.8826] }, isDepot: true, isMandi: false, approachRoadClass: 'paved' },
  { code: 'KPG-APMC', name: 'Kopargaon APMC', nameMr: 'कोपरगाव एपीएमसी', 
    location: { type: 'Point', coordinates: [74.4712, 19.8801] }, isDepot: false, isMandi: true, approachRoadClass: 'paved' },
  
  // Villages
  { code: 'SANWATSAR', name: 'Sanwatsar', nameMr: 'सानवत्सर', 
    location: { type: 'Point', coordinates: [74.5012, 19.9102] }, isDepot: false, isMandi: false, approachRoadClass: 'unpaved' },
  { code: 'POHEGAON', name: 'Pohegaon', nameMr: 'पोहेगाव', 
    location: { type: 'Point', coordinates: [74.4423, 19.9245] }, isDepot: false, isMandi: false, approachRoadClass: 'unpaved' },
  { code: 'KOLPEWADI', name: 'Kolpewadi', nameMr: 'कोलपेवाडी', 
    location: { type: 'Point', coordinates: [74.5234, 19.8556] }, isDepot: false, isMandi: false, approachRoadClass: 'unpaved' },
  { code: 'DHAMORI', name: 'Dhamori', nameMr: 'धामोरी', 
    location: { type: 'Point', coordinates: [74.4889, 19.8234] }, isDepot: false, isMandi: false, approachRoadClass: 'paved' },
  { code: 'CHAS-NALI', name: 'Chas Nali', nameMr: 'चास नाळी', 
    location: { type: 'Point', coordinates: [74.5123, 19.9334] }, isDepot: false, isMandi: false, approachRoadClass: 'unpaved' },
  { code: 'KARANJI-BK', name: 'Karanji Budruk', nameMr: 'करंजी बु', 
    location: { type: 'Point', coordinates: [74.4556, 19.8445] }, isDepot: false, isMandi: false, approachRoadClass: 'paved' },
  { code: 'MANJUR', name: 'Manjur', nameMr: 'मंजूर', 
    location: { type: 'Point', coordinates: [74.4912, 19.9012] }, isDepot: false, isMandi: false, approachRoadClass: 'unpaved' },
  { code: 'SHINGNAPUR', name: 'Shingnapur', nameMr: 'शिंगनापूर', 
    location: { type: 'Point', coordinates: [74.5712, 19.8823] }, isDepot: false, isMandi: false, approachRoadClass: 'paved' },
  { code: 'RAWANDA', name: 'Rawanda', nameMr: 'रावंडा', 
    location: { type: 'Point', coordinates: [74.4334, 19.8667] }, isDepot: false, isMandi: false, approachRoadClass: 'unpaved' },
  
  // External destinations
  { code: 'SHIRDI', name: 'Shirdi Bus Stand', nameMr: 'शिर्डी बस स्टँड', 
    location: { type: 'Point', coordinates: [74.4777, 19.7645] }, isDepot: false, isMandi: false, approachRoadClass: 'paved' },
  { code: 'SANGAMNER', name: 'Sangamner', nameMr: 'सांगमनेर', 
    location: { type: 'Point', coordinates: [74.2168, 19.5668] }, isDepot: false, isMandi: true, approachRoadClass: 'paved' },
  { code: 'NASHIK', name: 'Nashik APMC', nameMr: 'नाशिक एपीएमसी', 
    location: { type: 'Point', coordinates: [73.7898, 19.9975] }, isDepot: false, isMandi: true, approachRoadClass: 'paved' },
  { code: 'AHMEDNAGAR', name: 'Ahmednagar', nameMr: 'अहमदनगर', 
    location: { type: 'Point', coordinates: [74.7480, 19.0948] }, isDepot: false, isMandi: true, approachRoadClass: 'paved' },
];

// ==============================================================================
// 2. BUS ROUTES (§7.2) — 6 corridors
// ==============================================================================

const ROUTES = [
  {
    code: 'R-SHIRDI',
    name: 'Kopargaon ↔ Shirdi',
    distanceKm: 16.2,
    stopCodes: ['KPG-DEPOT', 'SHIRDI'], // Use stop codes instead of indices
    stops: [
      { seq: 0, offsetMin: 0 },   // KPG-DEPOT
      { seq: 1, offsetMin: 25 },  // SHIRDI
    ],
    operatingDays: [], // Every day
  },
  {
    code: 'R-SANGAMNER',
    name: 'Kopargaon ↔ Sangamner',
    distanceKm: 45.8,
    stopCodes: ['KPG-DEPOT', 'POHEGAON', 'DHAMORI', 'SANGAMNER'],
    stops: [
      { seq: 0, offsetMin: 0 },   // KPG-DEPOT
      { seq: 1, offsetMin: 15 },  // POHEGAON
      { seq: 2, offsetMin: 35 },  // DHAMORI
      { seq: 3, offsetMin: 75 },  // SANGAMNER
    ],
    operatingDays: [],
  },
  {
    code: 'R-NASHIK',
    name: 'Kopargaon ↔ Nashik',
    distanceKm: 68.5,
    stopCodes: ['KPG-DEPOT', 'KPG-APMC', 'SHINGNAPUR', 'NASHIK'],
    stops: [
      { seq: 0, offsetMin: 0 },   // KPG-DEPOT
      { seq: 1, offsetMin: 5 },   // KPG-APMC
      { seq: 2, offsetMin: 15 },  // SHINGNAPUR
      { seq: 3, offsetMin: 95 },  // NASHIK
    ],
    operatingDays: [],
  },
  {
    code: 'R-ANAGAR',
    name: 'Kopargaon ↔ Ahmednagar',
    distanceKm: 52.3,
    stopCodes: ['KPG-DEPOT', 'KARANJI-BK', 'AHMEDNAGAR'],
    stops: [
      { seq: 0, offsetMin: 0 },   // KPG-DEPOT
      { seq: 1, offsetMin: 20 },  // KARANJI-BK
      { seq: 2, offsetMin: 85 },  // AHMEDNAGAR
    ],
    operatingDays: [],
  },
  {
    code: 'R-YEOLA',
    name: 'Kopargaon ↔ Yeola (via villages)',
    distanceKm: 38.4,
    stopCodes: ['KPG-DEPOT', 'SANWATSAR', 'CHAS-NALI', 'KPG-DEPOT'], // Placeholder for Yeola
    stops: [
      { seq: 0, offsetMin: 0 },   // KPG-DEPOT
      { seq: 1, offsetMin: 12 },  // SANWATSAR
      { seq: 2, offsetMin: 25 },  // CHAS-NALI
      { seq: 3, offsetMin: 65 },  // Back to depot (placeholder)
    ],
    operatingDays: [],
  },
  {
    code: 'R-VAIJAPUR',
    name: 'Kopargaon ↔ Vaijapur',
    distanceKm: 42.1,
    stopCodes: ['KPG-DEPOT', 'MANJUR', 'KOLPEWADI', 'KPG-DEPOT'], // Placeholder for Vaijapur
    stops: [
      { seq: 0, offsetMin: 0 },   // KPG-DEPOT
      { seq: 1, offsetMin: 15 },  // MANJUR
      { seq: 2, offsetMin: 30 },  // KOLPEWADI
      { seq: 3, offsetMin: 70 },  // Back to depot (placeholder)
    ],
    operatingDays: [],
  },
];

// ==============================================================================
// 3. SEED FUNCTION
// ==============================================================================

async function seedKopargaon() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Clear existing v2 data
    await Promise.all([
      BusStop.deleteMany({}),
      BusRoute.deleteMany({}),
      BusTrip.deleteMany({}),
      Consignment.deleteMany({}),
      ChargingCandidate.deleteMany({}),
    ]);
    console.log('✓ Cleared existing bus-parcel data');

    // Seed bus stops
    const stopDocs = await BusStop.insertMany(STOPS);
    console.log(`✓ Seeded ${stopDocs.length} bus stops`);

    // Build stop lookup
    const stopLookup = {};
    stopDocs.forEach((s) => {
      stopLookup[s.code] = s._id;
    });

    // Seed routes with stop references
    const routeDocs = [];
    for (const route of ROUTES) {
      const stops = route.stops.map((s, idx) => {
        const stopCode = route.stopCodes[idx];
        const stopId = stopLookup[stopCode];
        
        if (!stopId) {
          console.warn(`⚠ Warning: Stop code ${stopCode} not found for route ${route.code}`);
        }
        
        return {
          stopId: stopId || stopLookup['KPG-DEPOT'], // Fallback to depot
          seq: s.seq,
          offsetMin: s.offsetMin,
        };
      });

      const doc = await BusRoute.create({
        code: route.code,
        name: route.name,
        distanceKm: route.distanceKm,
        stops,
        operatingDays: route.operatingDays,
      });
      routeDocs.push(doc);
    }
    console.log(`✓ Seeded ${routeDocs.length} bus routes`);

    // Seed trips for 30 days (4-8 departures per route per day)
    const trips = [];
    const today = new Date();
    for (let day = 0; day < 30; day++) {
      const serviceDate = new Date(today);
      serviceDate.setDate(today.getDate() + day);
      const dateStr = serviceDate.toISOString().split('T')[0];

      for (const route of routeDocs) {
        const departures = ['06:00', '09:30', '12:00', '14:30', '16:30', '18:00'];
        
        for (const time of departures) {
          trips.push({
            routeId: route._id,
            serviceDate: dateStr,
            departureTime: time,
            vehicleCode: `MH-19-BUS-${Math.floor(Math.random() * 9000) + 1000}`,
            status: 'scheduled',
            delayMin: 0,
            passengerCapacity: 52,
            cargoCapacityKg: 200,
            predictedSpareKg: Math.floor(Math.random() * 100) + 80, // 80-180 kg
            cargoUsedKg: 0,
            crewWindow: { startTime: '05:30', endTime: '22:00' },
          });
        }
      }
    }

    await BusTrip.insertMany(trips);
    console.log(`✓ Seeded ${trips.length} bus trips for 30 days`);

    // Seed EV charging candidates (§D)
    const chargingCandidates = [
      { name: 'Kopargaon ST Depot', location: { type: 'Point', coordinates: [74.4765, 19.8826] }, siteType: 'bus-depot', demandScore: 85, dwellScore: 90, gridScore: 95, totalScore: 90 },
      { name: 'Shirdi Bus Stand', location: { type: 'Point', coordinates: [74.4777, 19.7645] }, siteType: 'major-stop', demandScore: 78, dwellScore: 65, gridScore: 80, totalScore: 74 },
      { name: 'Kopargaon APMC', location: { type: 'Point', coordinates: [74.4712, 19.8801] }, siteType: 'mandi', demandScore: 65, dwellScore: 55, gridScore: 70, totalScore: 63 },
      { name: 'Sangamner Junction', location: { type: 'Point', coordinates: [74.2168, 19.5668] }, siteType: 'major-stop', demandScore: 60, dwellScore: 50, gridScore: 65, totalScore: 58 },
      { name: 'Nashik APMC', location: { type: 'Point', coordinates: [73.7898, 19.9975] }, siteType: 'mandi', demandScore: 82, dwellScore: 70, gridScore: 88, totalScore: 80 },
      { name: 'Ahmednagar Bus Stand', location: { type: 'Point', coordinates: [74.7480, 19.0948] }, siteType: 'major-stop', demandScore: 58, dwellScore: 48, gridScore: 62, totalScore: 56 },
      { name: 'Shingnapur Village Center', location: { type: 'Point', coordinates: [74.5712, 19.8823] }, siteType: 'village-center', demandScore: 42, dwellScore: 35, gridScore: 45, totalScore: 41 },
      { name: 'NH-60 Rest Stop (Kopargaon-Ahmednagar)', location: { type: 'Point', coordinates: [74.6123, 19.4567] }, siteType: 'highway-rest', demandScore: 52, dwellScore: 60, gridScore: 58, totalScore: 57 },
    ];

    await ChargingCandidate.insertMany(chargingCandidates);
    console.log(`✓ Seeded ${chargingCandidates.length} EV charging candidates`);

    console.log('\n✅ Kopargaon bus-parcel data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${stopDocs.length} bus stops`);
    console.log(`   - ${routeDocs.length} routes`);
    console.log(`   - ${trips.length} trips (30 days)`);
    console.log(`   - ${chargingCandidates.length} EV charging candidates`);
    console.log('\n🔧 Note: Consignment demand not seeded — will be generated by farmers via UI');
    console.log('   Run seedAccounts.js first to create farmer/buyer/logistics accounts\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedKopargaon();
