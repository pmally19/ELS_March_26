import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Get shipments
router.get('/shipments', async (req, res) => {
  try {
    const shipments = [
      {
        id: 1,
        shipment_number: 'SH-2025-001',
        order_number: 'SO-2025-0006',
        carrier: 'FedEx',
        service_type: 'Ground',
        tracking_number: '1Z999AA1234567890',
        status: 'in_transit',
        origin: 'Denver, CO',
        destination: 'Phoenix, AZ',
        ship_date: '2025-07-02T08:00:00Z',
        estimated_delivery: '2025-07-05T18:00:00Z',
        weight: 15.5,
        shipping_cost: 29.99,
        dimensions: '12x8x6 in'
      },
      {
        id: 2,
        shipment_number: 'SH-2025-002',
        order_number: 'SO-2025-0005',
        carrier: 'UPS',
        service_type: 'Next Day Air',
        tracking_number: '400110047594',
        status: 'delivered',
        origin: 'Chicago, IL',
        destination: 'Atlanta, GA',
        ship_date: '2025-06-30T16:00:00Z',
        estimated_delivery: '2025-07-01T12:00:00Z',
        weight: 8.2,
        shipping_cost: 45.99,
        dimensions: '10x6x4 in'
      }
    ];

    res.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ message: 'Failed to fetch shipments' });
  }
});

// Get carriers
router.get('/carriers', async (req, res) => {
  try {
    const carriers = [
      {
        id: 1,
        name: 'FedEx',
        code: 'FEDEX',
        services: ['Ground', 'Express', 'Overnight'],
        tracking_url: 'https://www.fedex.com/fedextrack/?trackingnumber=',
        active: true
      },
      {
        id: 2,
        name: 'UPS',
        code: 'UPS',
        services: ['Ground', 'Next Day Air', '2nd Day Air'],
        tracking_url: 'https://www.ups.com/track?tracknum=',
        active: true
      },
      {
        id: 3,
        name: 'USPS',
        code: 'USPS',
        services: ['Priority Mail', 'Express Mail', 'Ground'],
        tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=',
        active: true
      },
      {
        id: 4,
        name: 'DHL',
        code: 'DHL',
        services: ['Express', 'Ground'],
        tracking_url: 'https://www.dhl.com/en/express/tracking.html?AWB=',
        active: false
      }
    ];

    res.json(carriers);
  } catch (error) {
    console.error('Error fetching carriers:', error);
    res.status(500).json({ message: 'Failed to fetch carriers' });
  }
});

// Get routes
router.get('/routes', async (req, res) => {
  try {
    const routes = [
      {
        id: 1,
        route_code: 'ROUTE-001',
        route_name: 'West Coast Express',
        origin: 'Denver, CO',
        destination: 'Los Angeles, CA',
        stops: ['Phoenix, AZ', 'Las Vegas, NV'],
        distance_miles: 1015,
        estimated_duration_hours: 18,
        carrier_id: 1,
        active: true
      },
      {
        id: 2,
        route_code: 'ROUTE-002',
        route_name: 'East Coast Standard',
        origin: 'Chicago, IL',
        destination: 'New York, NY',
        stops: ['Cleveland, OH', 'Pittsburgh, PA'],
        distance_miles: 790,
        estimated_duration_hours: 14,
        carrier_id: 2,
        active: true
      },
      {
        id: 3,
        route_code: 'ROUTE-003',
        route_name: 'Southern Express',
        origin: 'Atlanta, GA',
        destination: 'Houston, TX',
        stops: ['Birmingham, AL', 'Jackson, MS'],
        distance_miles: 790,
        estimated_duration_hours: 12,
        carrier_id: 1,
        active: true
      }
    ];

    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ message: 'Failed to fetch routes' });
  }
});

// Create shipment
router.post('/shipments', async (req, res) => {
  try {
    const { order_number, carrier_id, service_type, destination, weight } = req.body;
    
    const newShipment = {
      id: Date.now(),
      shipment_number: `SH-${new Date().getFullYear()}-${String(Date.now()).slice(-3).padStart(3, '0')}`,
      order_number,
      carrier: 'FedEx', // Look up from carrier_id
      service_type,
      tracking_number: `TRK${Date.now()}`,
      status: 'pending',
      origin: 'Denver, CO',
      destination,
      ship_date: new Date().toISOString(),
      estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      weight,
      cost: weight * 2.5 // Simple calculation
    };

    res.json({
      success: true,
      message: 'Shipment created successfully',
      shipment: newShipment
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ message: 'Failed to create shipment' });
  }
});

// Optimize route
router.post('/optimize-route', async (req, res) => {
  try {
    const { shipments, constraints } = req.body;
    
    // Simulate route optimization
    const optimizedRoute = {
      route_id: Date.now(),
      total_distance: 1250,
      total_time_hours: 22,
      fuel_cost: 187.50,
      optimized_stops: [
        { location: 'Denver, CO', order: 1, arrival_time: '2025-07-02T08:00:00Z' },
        { location: 'Phoenix, AZ', order: 2, arrival_time: '2025-07-02T15:30:00Z' },
        { location: 'Los Angeles, CA', order: 3, arrival_time: '2025-07-03T06:00:00Z' }
      ],
      savings: {
        distance_saved: 125,
        time_saved_hours: 2.5,
        cost_saved: 35.25
      }
    };

    res.json({
      success: true,
      message: 'Route optimized successfully',
      optimization: optimizedRoute
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({ message: 'Failed to optimize route' });
  }
});

// Track shipment
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    const trackingInfo = {
      tracking_number: trackingNumber,
      status: 'in_transit',
      current_location: 'Phoenix, AZ Distribution Center',
      last_update: new Date().toISOString(),
      estimated_delivery: '2025-07-05T18:00:00Z',
      events: [
        {
          timestamp: '2025-07-02T14:30:00Z',
          location: 'Phoenix, AZ',
          status: 'In Transit',
          description: 'Package is on its way to the next facility'
        },
        {
          timestamp: '2025-07-02T08:15:00Z',
          location: 'Denver, CO',
          status: 'Departed Facility',
          description: 'Package has left the sorting facility'
        },
        {
          timestamp: '2025-07-01T22:45:00Z',
          location: 'Denver, CO',
          status: 'Arrived at Facility',
          description: 'Package arrived at sorting facility'
        }
      ]
    };

    res.json(trackingInfo);
  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({ message: 'Failed to track shipment' });
  }
});

// Get logistics dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const stats = {
      total_shipments: 156,
      in_transit: 24,
      delivered_today: 8,
      pending_pickup: 12,
      avg_delivery_time_hours: 48,
      on_time_delivery_rate: 94.5,
      total_shipping_cost: 15420.75,
      carrier_performance: [
        { carrier: 'FedEx', on_time_rate: 96.2, volume: 45 },
        { carrier: 'UPS', on_time_rate: 94.8, volume: 38 },
        { carrier: 'USPS', on_time_rate: 91.5, volume: 23 }
      ]
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching logistics stats:', error);
    res.status(500).json({ message: 'Failed to fetch logistics stats' });
  }
});

export default router;