import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Customer Portal APIs

// Get customer portal overview
router.get('/overview/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const overview = {
      customer_id: customerId,
      customer_name: 'TechCorp Solutions',
      account_status: 'Active',
      credit_limit: 150000.00,
      credit_used: 85000.00,
      credit_available: 65000.00,
      total_orders: 24,
      pending_orders: 3,
      pending_invoices: 2,
      outstanding_balance: 45000.00,
      last_payment_date: '2025-06-15',
      last_payment_amount: 32000.00,
      loyalty_tier: 'Gold',
      loyalty_points: 1450,
      preferred_payment_method: 'ACH Transfer',
      notifications: [
        {
          id: 1,
          type: 'payment_due',
          message: 'Invoice INV-2025-045 is due in 5 days',
          priority: 'high',
          date: '2025-07-02'
        },
        {
          id: 2,
          type: 'order_shipped',
          message: 'Order SO-2025-0023 has been shipped',
          priority: 'medium',
          date: '2025-07-01'
        }
      ]
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching customer overview:', error);
    res.status(500).json({ message: 'Failed to fetch customer overview' });
  }
});

// Get customer orders
router.get('/orders/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const orders = [
      {
        id: 1,
        order_number: 'SO-2025-0023',
        order_date: '2025-06-28',
        status: 'Shipped',
        total_amount: 15000.00,
        items: 5,
        delivery_date: '2025-07-03',
        tracking_number: '1Z999AA1234567890',
        invoice_number: 'INV-2025-045',
        invoice_status: 'Pending Payment'
      },
      {
        id: 2,
        order_number: 'SO-2025-0019',
        order_date: '2025-06-15',
        status: 'Delivered',
        total_amount: 32000.00,
        items: 8,
        delivery_date: '2025-06-20',
        tracking_number: '400110047594',
        invoice_number: 'INV-2025-038',
        invoice_status: 'Paid'
      },
      {
        id: 3,
        order_number: 'SO-2025-0015',
        order_date: '2025-05-22',
        status: 'Delivered',
        total_amount: 28500.00,
        items: 12,
        delivery_date: '2025-05-28',
        tracking_number: '9102969010383051629184',
        invoice_number: 'INV-2025-029',
        invoice_status: 'Paid'
      }
    ];

    res.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ message: 'Failed to fetch customer orders' });
  }
});

// Get customer invoices
router.get('/invoices/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const invoices = [
      {
        id: 1,
        invoice_number: 'INV-2025-045',
        order_number: 'SO-2025-0023',
        invoice_date: '2025-06-28',
        due_date: '2025-07-28',
        amount: 15000.00,
        status: 'Outstanding',
        days_outstanding: 4,
        payment_terms: 'Net 30',
        description: 'Software licensing and implementation services'
      },
      {
        id: 2,
        invoice_number: 'INV-2025-042',
        order_number: 'SO-2025-0021',
        invoice_date: '2025-06-20',
        due_date: '2025-07-20',
        amount: 30000.00,
        status: 'Outstanding',
        days_outstanding: 12,
        payment_terms: 'Net 30',
        description: 'Professional services and training'
      },
      {
        id: 3,
        invoice_number: 'INV-2025-038',
        order_number: 'SO-2025-0019',
        invoice_date: '2025-06-15',
        due_date: '2025-07-15',
        amount: 32000.00,
        status: 'Paid',
        payment_date: '2025-06-14',
        payment_method: 'ACH Transfer',
        description: 'Hardware delivery and setup'
      }
    ];

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ message: 'Failed to fetch customer invoices' });
  }
});

// Get payment methods
router.get('/payment-methods/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const paymentMethods = [
      {
        id: 1,
        type: 'ACH Transfer',
        account_name: 'TechCorp Business Account',
        account_number: '****1234',
        routing_number: '****9876',
        bank_name: 'Business Bank',
        is_default: true,
        is_verified: true,
        added_date: '2024-01-15'
      },
      {
        id: 2,
        type: 'Credit Card',
        card_type: 'Visa Business',
        card_number: '****4567',
        expiry_month: 12,
        expiry_year: 2027,
        cardholder_name: 'John Smith',
        is_default: false,
        is_verified: true,
        added_date: '2024-03-22'
      },
      {
        id: 3,
        type: 'Wire Transfer',
        account_name: 'TechCorp International',
        account_number: '****5678',
        swift_code: 'BNKAUS33',
        bank_name: 'International Business Bank',
        is_default: false,
        is_verified: true,
        added_date: '2024-02-10'
      }
    ];

    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods' });
  }
});

// Process payment
router.post('/process-payment', async (req, res) => {
  try {
    const { invoice_id, payment_method_id, amount, payment_date } = req.body;

    const paymentResult = {
      success: true,
      payment_id: `PAY-${Date.now()}`,
      transaction_id: `TXN-${Date.now()}`,
      amount,
      payment_date,
      status: 'Processing',
      estimated_completion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      confirmation_number: `CONF-${String(Date.now()).slice(-8)}`,
      message: 'Payment submitted successfully and is being processed'
    };

    res.json(paymentResult);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Failed to process payment' });
  }
});

// Get payment history
router.get('/payment-history/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Query actual payment data from database
    const result = await db.execute(sql`
      SELECT 
        cp.id,
        cp.payment_number as payment_id,
        cp.payment_date,
        cp.payment_amount as amount,
        cp.payment_method,
        cp.posting_status as status,
        cp.reference as confirmation_number,
        STRING_AGG(DISTINCT bd.billing_number, ', ') as invoice_number,
        COUNT(DISTINCT pa.id) as invoices_applied_count
      FROM customer_payments cp
      LEFT JOIN payment_applications pa ON cp.id = pa.payment_id
      LEFT JOIN billing_documents bd ON pa.billing_id = bd.id
      WHERE cp.customer_id = ${parseInt(customerId)}
      GROUP BY cp.id, cp.payment_number, cp.payment_date, cp.payment_amount, 
               cp.payment_method, cp.posting_status, cp.reference
      ORDER BY cp.payment_date DESC
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      message: 'Failed to fetch payment history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get shipping addresses
router.get('/shipping-addresses/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const addresses = [
      {
        id: 1,
        type: 'Primary',
        company_name: 'TechCorp Solutions',
        address_line1: '123 Technology Drive',
        address_line2: 'Suite 100',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country: 'USA',
        contact_name: 'John Smith',
        contact_phone: '+1-555-0123',
        contact_email: 'john.smith@techcorp.com',
        is_default: true,
        delivery_instructions: 'Loading dock entrance on west side'
      },
      {
        id: 2,
        type: 'Warehouse',
        company_name: 'TechCorp Distribution Center',
        address_line1: '456 Industrial Blvd',
        address_line2: '',
        city: 'Oakland',
        state: 'CA',
        postal_code: '94607',
        country: 'USA',
        contact_name: 'Sarah Johnson',
        contact_phone: '+1-555-0456',
        contact_email: 'warehouse@techcorp.com',
        is_default: false,
        delivery_instructions: 'Receiving hours: 8AM-5PM weekdays'
      }
    ];

    res.json(addresses);
  } catch (error) {
    console.error('Error fetching shipping addresses:', error);
    res.status(500).json({ message: 'Failed to fetch shipping addresses' });
  }
});

// Submit support ticket
router.post('/support-ticket', async (req, res) => {
  try {
    const { customer_id, subject, category, priority, description, order_number } = req.body;

    const ticket = {
      ticket_id: `TICK-${Date.now()}`,
      customer_id,
      subject,
      category,
      priority,
      description,
      order_number,
      status: 'Open',
      created_date: new Date().toISOString(),
      assigned_agent: 'Customer Support Team',
      estimated_resolution: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Support ticket created successfully. You will receive updates via email.'
    };

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ message: 'Failed to create support ticket' });
  }
});

// Get support tickets
router.get('/support-tickets/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const tickets = [
      {
        id: 1,
        ticket_id: 'TICK-1719845234',
        subject: 'Delivery delay inquiry',
        category: 'Shipping',
        priority: 'Medium',
        status: 'In Progress',
        created_date: '2025-06-28',
        last_update: '2025-06-30',
        assigned_agent: 'Mike Wilson',
        order_number: 'SO-2025-0023'
      },
      {
        id: 2,
        ticket_id: 'TICK-1719231456',
        subject: 'Invoice payment confirmation',
        category: 'Billing',
        priority: 'Low',
        status: 'Resolved',
        created_date: '2025-06-14',
        last_update: '2025-06-15',
        assigned_agent: 'Lisa Brown',
        resolution_date: '2025-06-15'
      }
    ];

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
});

// Download document (invoice, receipt, etc.)
router.get('/download/:documentType/:documentId', async (req, res) => {
  try {
    const { documentType, documentId } = req.params;

    // Simulate document generation
    const documentInfo = {
      document_type: documentType,
      document_id: documentId,
      filename: `${documentType}-${documentId}.pdf`,
      download_url: `/api/customer-portal/documents/${documentType}/${documentId}.pdf`,
      file_size: '245 KB',
      generated_date: new Date().toISOString(),
      expires_in_hours: 24,
      message: 'Document generated successfully'
    };

    res.json({
      success: true,
      document: documentInfo
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ message: 'Failed to generate document' });
  }
});

// Default routes for customer portal (without customer ID)
router.get('/orders', async (req, res) => {
  try {
    // Default customer ID for demo purposes
    const orders = [
      {
        id: 1,
        order_number: 'SO-2025-0023',
        order_date: '2025-06-28',
        status: 'Shipped',
        total_amount: 15000.00,
        items: 5,
        delivery_date: '2025-07-03',
        tracking_number: '1Z999AA1234567890',
        invoice_number: 'INV-2025-045',
        invoice_status: 'Pending Payment'
      },
      {
        id: 2,
        order_number: 'SO-2025-0019',
        order_date: '2025-06-15',
        status: 'Delivered',
        total_amount: 32000.00,
        items: 8,
        delivery_date: '2025-06-20',
        tracking_number: '400110047594',
        invoice_number: 'INV-2025-038',
        invoice_status: 'Paid'
      }
    ];

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 1,
        type: 'ACH Transfer',
        account_name: 'TechCorp Business Account',
        account_number: '****1234',
        routing_number: '****9876',
        bank_name: 'Business Bank',
        is_default: true,
        is_verified: true,
        added_date: '2024-01-15'
      },
      {
        id: 2,
        type: 'Credit Card',
        card_type: 'Visa Business',
        card_number: '****4567',
        expiry_month: 12,
        expiry_year: 2027,
        cardholder_name: 'John Smith',
        is_default: false,
        is_verified: true,
        added_date: '2024-03-22'
      }
    ];

    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods' });
  }
});

router.get('/delivery-options', async (req, res) => {
  try {
    const deliveryOptions = [
      {
        id: 1,
        service_type: 'Standard Shipping',
        carrier: 'FedEx Ground',
        estimated_days: '3-5 business days',
        cost: 15.99,
        description: 'Reliable ground shipping for most orders'
      },
      {
        id: 2,
        service_type: 'Express Shipping',
        carrier: 'FedEx Express',
        estimated_days: '1-2 business days',
        cost: 35.99,
        description: 'Fast delivery for urgent orders'
      },
      {
        id: 3,
        service_type: 'Overnight Shipping',
        carrier: 'FedEx Overnight',
        estimated_days: 'Next business day',
        cost: 65.99,
        description: 'Next day delivery by 10:30 AM'
      },
      {
        id: 4,
        service_type: 'White Glove Delivery',
        carrier: 'Specialized Carrier',
        estimated_days: '5-7 business days',
        cost: 150.00,
        description: 'Professional setup and installation service'
      }
    ];

    res.json(deliveryOptions);
  } catch (error) {
    console.error('Error fetching delivery options:', error);
    res.status(500).json({ message: 'Failed to fetch delivery options' });
  }
});

export default router;