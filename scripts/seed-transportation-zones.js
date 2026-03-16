import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function seedTransportationZones() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding transportation zones...\n');

    // First, get company codes for reference
    const companyCodesResult = await client.query('SELECT id, code FROM company_codes LIMIT 5');
    const companyCodes = companyCodesResult.rows;
    
    // Get shipping points if they exist
    let shippingPoints = [];
    try {
      const shippingPointsResult = await client.query('SELECT id, code FROM shipping_points LIMIT 5');
      shippingPoints = shippingPointsResult.rows;
    } catch (e) {
      console.log('⚠ Shipping points table not found, skipping shipping point references');
    }

    // Sample transportation zones data
    const sampleZones = [
      {
        code: 'US-EAST',
        name: 'United States - East Coast',
        description: 'Transportation zone covering the eastern United States',
        region: 'East Coast',
        country: 'USA',
        zone_type: 'domestic',
        transit_time: 3,
        shipping_multiplier: 1.00,
        postal_code_from: '01000',
        postal_code_to: '29999',
        company_code_id: companyCodes[0]?.id || null,
        base_freight_rate: 25.00,
        currency: 'USD',
        transportation_type: 'standard',
        distance_km: 1500.00,
        shipping_point_id: shippingPoints[0]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'US-WEST',
        name: 'United States - West Coast',
        description: 'Transportation zone covering the western United States',
        region: 'West Coast',
        country: 'USA',
        zone_type: 'domestic',
        transit_time: 5,
        shipping_multiplier: 1.15,
        postal_code_from: '90000',
        postal_code_to: '99999',
        company_code_id: companyCodes[0]?.id || null,
        base_freight_rate: 35.00,
        currency: 'USD',
        transportation_type: 'standard',
        distance_km: 2500.00,
        shipping_point_id: shippingPoints[0]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'US-CENTRAL',
        name: 'United States - Central',
        description: 'Transportation zone covering the central United States',
        region: 'Central',
        country: 'USA',
        zone_type: 'domestic',
        transit_time: 4,
        shipping_multiplier: 1.05,
        postal_code_from: '30000',
        postal_code_to: '69999',
        company_code_id: companyCodes[0]?.id || null,
        base_freight_rate: 30.00,
        currency: 'USD',
        transportation_type: 'standard',
        distance_km: 2000.00,
        shipping_point_id: shippingPoints[0]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'CA-ONT',
        name: 'Canada - Ontario',
        description: 'Transportation zone for Ontario, Canada',
        region: 'Ontario',
        country: 'CAN',
        zone_type: 'international',
        transit_time: 7,
        shipping_multiplier: 1.25,
        postal_code_from: 'K0A',
        postal_code_to: 'P9A',
        company_code_id: companyCodes[0]?.id || null,
        base_freight_rate: 45.00,
        currency: 'CAD',
        transportation_type: 'standard',
        distance_km: 800.00,
        shipping_point_id: shippingPoints[1]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'UK-LONDON',
        name: 'United Kingdom - London',
        description: 'Transportation zone for London and surrounding areas',
        region: 'London',
        country: 'GBR',
        zone_type: 'international',
        transit_time: 10,
        shipping_multiplier: 1.50,
        postal_code_from: 'E1',
        postal_code_to: 'SW20',
        company_code_id: companyCodes[1]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 60.00,
        currency: 'GBP',
        transportation_type: 'express',
        distance_km: 50.00,
        shipping_point_id: shippingPoints[1]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'DE-BERLIN',
        name: 'Germany - Berlin',
        description: 'Transportation zone for Berlin, Germany',
        region: 'Berlin',
        country: 'DEU',
        zone_type: 'international',
        transit_time: 8,
        shipping_multiplier: 1.30,
        postal_code_from: '10001',
        postal_code_to: '14199',
        company_code_id: companyCodes[1]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 55.00,
        currency: 'EUR',
        transportation_type: 'standard',
        distance_km: 200.00,
        shipping_point_id: shippingPoints[1]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'IN-MUMBAI',
        name: 'India - Mumbai',
        description: 'Transportation zone for Mumbai, India',
        region: 'Mumbai',
        country: 'IND',
        zone_type: 'international',
        transit_time: 12,
        shipping_multiplier: 1.20,
        postal_code_from: '400001',
        postal_code_to: '400099',
        company_code_id: companyCodes[2]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 30.00,
        currency: 'INR',
        transportation_type: 'standard',
        distance_km: 100.00,
        shipping_point_id: shippingPoints[2]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'IN-DELHI',
        name: 'India - Delhi',
        description: 'Transportation zone for Delhi, India',
        region: 'Delhi',
        country: 'IND',
        zone_type: 'international',
        transit_time: 10,
        shipping_multiplier: 1.15,
        postal_code_from: '110001',
        postal_code_to: '110099',
        company_code_id: companyCodes[2]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 28.00,
        currency: 'INR',
        transportation_type: 'standard',
        distance_km: 150.00,
        shipping_point_id: shippingPoints[2]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'AU-SYDNEY',
        name: 'Australia - Sydney',
        description: 'Transportation zone for Sydney, Australia',
        region: 'Sydney',
        country: 'AUS',
        zone_type: 'international',
        transit_time: 14,
        shipping_multiplier: 1.60,
        postal_code_from: '2000',
        postal_code_to: '2999',
        company_code_id: companyCodes[3]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 75.00,
        currency: 'AUD',
        transportation_type: 'express',
        distance_km: 300.00,
        shipping_point_id: shippingPoints[3]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'JP-TOKYO',
        name: 'Japan - Tokyo',
        description: 'Transportation zone for Tokyo, Japan',
        region: 'Tokyo',
        country: 'JPN',
        zone_type: 'international',
        transit_time: 9,
        shipping_multiplier: 1.40,
        postal_code_from: '100-0001',
        postal_code_to: '179-0074',
        company_code_id: companyCodes[4]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 65.00,
        currency: 'JPY',
        transportation_type: 'express',
        distance_km: 250.00,
        shipping_point_id: shippingPoints[4]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'US-EXPRESS',
        name: 'United States - Express',
        description: 'Express shipping zone for urgent deliveries in the US',
        region: 'Nationwide',
        country: 'USA',
        zone_type: 'domestic',
        transit_time: 1,
        shipping_multiplier: 2.00,
        postal_code_from: '00000',
        postal_code_to: '99999',
        company_code_id: companyCodes[0]?.id || null,
        base_freight_rate: 100.00,
        currency: 'USD',
        transportation_type: 'express',
        distance_km: 0.00,
        shipping_point_id: shippingPoints[0]?.id || null,
        block_indicator: false,
        is_active: true
      },
      {
        code: 'EU-CENTRAL',
        name: 'Europe - Central',
        description: 'Central European transportation zone',
        region: 'Central Europe',
        country: 'EUR',
        zone_type: 'international',
        transit_time: 6,
        shipping_multiplier: 1.35,
        postal_code_from: '00000',
        postal_code_to: '99999',
        company_code_id: companyCodes[1]?.id || companyCodes[0]?.id || null,
        base_freight_rate: 50.00,
        currency: 'EUR',
        transportation_type: 'standard',
        distance_km: 1000.00,
        shipping_point_id: shippingPoints[1]?.id || null,
        block_indicator: false,
        is_active: true
      }
    ];

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing transportation zones...');
    await client.query('DELETE FROM transportation_zones');

    // Insert sample data
    console.log('📦 Inserting sample transportation zones...\n');
    
    for (const zone of sampleZones) {
      try {
        const result = await client.query(`
          INSERT INTO transportation_zones (
            code, name, description, region, country, zone_type, transit_time,
            shipping_multiplier, postal_code_from, postal_code_to, company_code_id,
            base_freight_rate, currency, transportation_type, distance_km,
            shipping_point_id, block_indicator, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id, code, name
        `, [
          zone.code,
          zone.name,
          zone.description,
          zone.region,
          zone.country,
          zone.zone_type,
          zone.transit_time,
          zone.shipping_multiplier,
          zone.postal_code_from,
          zone.postal_code_to,
          zone.company_code_id,
          zone.base_freight_rate,
          zone.currency,
          zone.transportation_type,
          zone.distance_km,
          zone.shipping_point_id,
          zone.block_indicator,
          zone.is_active
        ]);
        
        console.log(`✅ Created: ${result.rows[0].code} - ${result.rows[0].name}`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Skipped (already exists): ${zone.code} - ${zone.name}`);
        } else {
          console.error(`❌ Error inserting ${zone.code}:`, error.message);
        }
      }
    }

    // Verify the data
    const countResult = await client.query('SELECT COUNT(*) as count FROM transportation_zones');
    const count = countResult.rows[0].count;
    
    console.log(`\n✅ Successfully seeded ${count} transportation zones!`);
    console.log('\n📊 Sample zones created:');
    console.log('   - US East Coast, West Coast, Central');
    console.log('   - Canada Ontario');
    console.log('   - UK London');
    console.log('   - Germany Berlin');
    console.log('   - India Mumbai, Delhi');
    console.log('   - Australia Sydney');
    console.log('   - Japan Tokyo');
    console.log('   - US Express');
    console.log('   - Europe Central');

  } catch (error) {
    console.error('❌ Error seeding transportation zones:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTransportationZones();

