import express from 'express';
import { pool } from '../db';
import { InventoryTrackingService } from '../services/inventoryTrackingService.js';

const router = express.Router();
const inventoryTrackingService = new InventoryTrackingService(pool);

// Get all purchase orders
router.get('/orders', async (req, res) => {
  try {
    // Check if purchase_orders table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
      );
    `);

    const excludeStatusParam = req.query.exclude_status;
    let queryText = `
        SELECT 
          po.*, 
          v.name as vendor_name,
          po.ship_to_address_id,
          po.pay_to_address_id,
          pdt.id as po_document_type_id,
          pdt.code as po_document_type_code,
          pdt.name as po_document_type_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN po_document_types pdt ON po.po_document_type_id = pdt.id
        WHERE (po.active = true OR po.active IS NULL)
    `;

    const queryParams = [];

    if (excludeStatusParam) {
      const excludedStatuses = excludeStatusParam.split(',').map(s => s.trim());
      queryParams.push(excludedStatuses);
      queryText += ` AND (po.status IS NULL OR NOT (po.status = ANY($${queryParams.length})))`; // Case sensitive match for now as DB has exact strings
    }

    queryText += ` ORDER BY po.order_date DESC`;

    if (tableCheckResult.rows[0].exists) {
      const result = await pool.query(queryText, queryParams);

      // Enhance with address details if available
      const enhancedResults = await Promise.all(result.rows.map(async (po) => {
        const enhanced = { ...po };

        // Get ship-to address if exists
        if (po.ship_to_address_id) {
          try {
            const shipToResult = await pool.query(`
              SELECT 
                id,
                address_line_1,
                address_line_2,
                city,
                state,
                country,
                postal_code,
                contact_person,
                phone,
                email
              FROM addresses
              WHERE id = $1
            `, [po.ship_to_address_id]);

            if (shipToResult.rows.length > 0) {
              enhanced.ship_to_address = shipToResult.rows[0];
            }
          } catch (err) {
            // Address table might not exist, skip
          }
        }

        // Get pay-to address if exists
        if (po.pay_to_address_id) {
          try {
            const payToResult = await pool.query(`
              SELECT 
                id,
                address_line_1,
                address_line_2,
                city,
                state,
                country,
                postal_code,
                contact_person,
                phone,
                email
              FROM addresses
              WHERE id = $1
            `, [po.pay_to_address_id]);

            if (payToResult.rows.length > 0) {
              enhanced.pay_to_address = payToResult.rows[0];
            }
          } catch (err) {
            // Address table might not exist, skip
          }
        }

        return enhanced;
      }));

      res.json(enhancedResults);
    } else {
      // Return empty array if table doesn't exist
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
});

// Get available ship-to addresses (warehouses, plants, company addresses)
router.get('/ship-to-addresses', async (req, res) => {
  try {
    const addresses = [];

    // Get plant/warehouse addresses
    const plantAddresses = await pool.query(`
      SELECT 
        p.id,
        p.code,
        p.name,
        a.id as address_id,
        a.address_line_1,
        a.address_line_2,
        a.city,
        a.state,
        a.country,
        a.postal_code,
        a.contact_person,
        a.phone,
        a.email,
        'warehouse' as address_type
      FROM plants p
      LEFT JOIN addresses a ON p.address_id = a.id
      WHERE p.is_active = true AND a.id IS NOT NULL
      ORDER BY p.name
    `);

    plantAddresses.rows.forEach(row => {
      addresses.push({
        id: row.address_id,
        name: `${row.name} (${row.code})`,
        type: row.address_type,
        address_line_1: row.address_line_1,
        address_line_2: row.address_line_2,
        city: row.city,
        state: row.state,
        country: row.country,
        postal_code: row.postal_code,
        contact_person: row.contact_person,
        phone: row.phone,
        email: row.email,
        reference_id: row.id,
        reference_code: row.code
      });
    });

    // Get storage location addresses
    const storageAddresses = await pool.query(`
      SELECT 
        sl.id,
        sl.code,
        sl.name,
        a.id as address_id,
        a.address_line_1,
        a.address_line_2,
        a.city,
        a.state,
        a.country,
        a.postal_code,
        a.contact_person,
        a.phone,
        a.email,
        'storage_location' as address_type
      FROM storage_locations sl
      LEFT JOIN addresses a ON sl.address_id = a.id
      WHERE sl.is_active = true AND a.id IS NOT NULL
      ORDER BY sl.name
    `);

    storageAddresses.rows.forEach(row => {
      addresses.push({
        id: row.address_id,
        name: `${row.name} (${row.code})`,
        type: row.address_type,
        address_line_1: row.address_line_1,
        address_line_2: row.address_line_2,
        city: row.city,
        state: row.state,
        country: row.country,
        postal_code: row.postal_code,
        contact_person: row.contact_person,
        phone: row.phone,
        email: row.email,
        reference_id: row.id,
        reference_code: row.code
      });
    });

    // Get company addresses
    const companyAddresses = await pool.query(`
      SELECT 
        id,
        name,
        address as address_line_1,
        city,
        state,
        country,
        postal_code,
        phone,
        email,
        'company' as address_type
      FROM company_addresses
      WHERE is_active = true
      ORDER BY is_default DESC, name
    `);

    companyAddresses.rows.forEach(row => {
      addresses.push({
        id: row.id,
        name: row.name || 'Company Address',
        type: row.address_type,
        address_line_1: row.address_line_1,
        city: row.city,
        state: row.state,
        country: row.country,
        postal_code: row.postal_code,
        phone: row.phone,
        email: row.email,
        reference_id: row.id
      });
    });

    res.json(addresses);
  } catch (error) {
    console.error('Error fetching ship-to addresses:', error);
    res.status(500).json({ message: 'Failed to fetch ship-to addresses', error: error.message });
  }
});

// Get all vendors
router.get('/vendors', async (req, res) => {
  try {
    // Check if vendors table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendors'
      );
    `);

    if (tableCheckResult.rows[0].exists) {
      const result = await pool.query(`
        SELECT * FROM vendors ORDER BY name
      `);
      res.json(result.rows);
    } else {
      // Return empty array if table doesn't exist
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Failed to fetch vendors' });
  }
});

// Create new purchase order
router.post('/orders', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      vendor_id,
      po_document_type_id,
      purchase_organization_id,
      plant_id,
      company_code_id,
      order_date,
      delivery_date,
      status,
      total_amount,
      currency,
      currency_id,
      exchange_rate,
      payment_terms,
      tax_amount,
      discount_amount,
      net_amount,
      notes,
      pay_to_address_id,
      ship_to_address_id,
      created_by,
      approved_by,
      approval_date,
      vendor_name,
      active,
      warehouse_type_id,
      items = []
    } = req.body;

    // Validate PO document type
    if (!po_document_type_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'PO Document Type is required'
      });
    }

    // Validate items array
    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'At least one item is required to create a purchase order'
      });
    }

    // Get vendor information for address defaulting (directly from vendors table)
    const vendorResult = await client.query(`
      SELECT *
      FROM vendors
      WHERE id = $1
    `, [vendor_id]);

    if (vendorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const vendorDetails = vendorResult.rows[0];

    // Get document settings for default values
    const settingsResult = await client.query(`
      SELECT setting_key, setting_value 
      FROM document_settings 
      WHERE setting_key IN ('default_po_status', 'default_currency')
    `);

    const settingsMap = {};
    settingsResult.rows.forEach(row => {
      settingsMap[row.setting_key] = row.setting_value;
    });

    // Get default status from settings or use request status, but don't hardcode fallback
    const defaultPOStatus = settingsMap['default_po_status'] || status || null;
    const defaultCurrency = settingsMap['default_currency'];


    // Determine pay-to address (ALWAYS from vendor master data)
    // Priority: 1. Provided pay_to_address_id, 2. Create from vendor master data
    let finalPayToAddressId = pay_to_address_id || null;

    // If no pay-to address ID is provided, ALWAYS create from vendor master data
    if (!finalPayToAddressId) {
      try {
        console.log('Creating pay-to address from vendor master data...');
        console.log('Vendor data:', {
          id: vendorDetails.id,
          name: vendorDetails.name,
          address: vendorDetails.address,
          city: vendorDetails.city,
          country: vendorDetails.country
        });

        // Check if vendor has required address fields (at minimum: address OR city OR country)
        // We'll create address with whatever data is available
        const hasAddressData = vendorDetails.address || vendorDetails.city || vendorDetails.country;

        if (hasAddressData) {
          // Create address record from vendor master data
          // Combine multiple vendor address lines into address_line_2 if needed
          let addressLine2 = null;
          if (vendorDetails.address_2 || vendorDetails.address_3 || vendorDetails.address_4 || vendorDetails.address_5) {
            const addressLines = [
              vendorDetails.address_2,
              vendorDetails.address_3,
              vendorDetails.address_4,
              vendorDetails.address_5
            ].filter(line => line && line.trim()).map(line => String(line).trim());
            if (addressLines.length > 0) {
              addressLine2 = addressLines.join(', ');
            }
          }

          // Check if addresses table exists, create if it doesn't
          const tableCheck = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'addresses'
            )
          `);

          if (!tableCheck.rows[0].exists) {
            await client.query(`
              CREATE TABLE addresses (
                id SERIAL PRIMARY KEY,
                address_line_1 VARCHAR(255),
                address_line_2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(50),
                country VARCHAR(50),
                postal_code VARCHAR(20),
                region VARCHAR(50),
                contact_person VARCHAR(100),
                phone VARCHAR(30),
                email VARCHAR(100),
                address_type VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
                created_by INTEGER,
                updated_by INTEGER
              )
            `);
          }

          // Ensure we have required NOT NULL fields
          const addressLine1 = vendor.address ? String(vendor.address).trim() : (vendor.city || vendor.country ? vendor.name || 'Address not specified' : 'Address not specified');
          const city = vendor.city ? String(vendor.city).trim() : (vendor.country ? 'City not specified' : 'City not specified');
          const country = vendor.country ? String(vendor.country).trim() : 'Country not specified';

          const vendorAddressValues = [
            addressLine1,
            addressLine2,
            city,
            vendor.state ? String(vendor.state).trim() : null,
            country,
            vendor.postal_code ? String(vendor.postal_code).trim() : null,
            vendor.contact_name || vendor.name || null, // contact_person
            vendor.phone ? String(vendor.phone).trim() : null,
            vendor.email ? String(vendor.email).trim() : null,
            'payment',
            true
          ];

          // Insert address (we always have required fields now)
          if (addressLine1 && city && country) {
            const vendorAddressInsertResult = await client.query(`
              INSERT INTO addresses (
                address_line_1,
                address_line_2,
                city,
                state,
                country,
                postal_code,
                contact_person,
                phone,
                email,
                address_type,
                is_active
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING id, address_line_1, address_line_2, city, state, country, postal_code, contact_person, phone, email
            `, vendorAddressValues);

            if (vendorAddressInsertResult.rows.length > 0) {
              finalPayToAddressId = vendorAddressInsertResult.rows[0].id;
              console.log(`✅ Created pay-to address from vendor master data with ID: ${finalPayToAddressId}`);
            }
          }
        } else {
          console.warn('Vendor has no address data. Cannot create pay-to address.');
        }
      } catch (vendorAddrErr) {
        console.error('Error creating address from vendor master data:', vendorAddrErr.message);
        // Rollback and re-throw if it's a transaction error
        if (vendorAddrErr.message && vendorAddrErr.message.includes('current transaction is aborted')) {
          await client.query('ROLLBACK');
          throw vendorAddrErr;
        }
        // Continue without address - don't fail the whole transaction for other errors
      }
    }

    // Determine ship-to address
    // Priority: 1. Provided ship_to_address_id, 2. Plant address from warehouse_type_id, 3. Plant address from first item, 4. Storage location address, 5. Company default
    let finalShipToAddressId = ship_to_address_id || null;



    // If still no ship-to address provided, get from first item's plant/warehouse
    if (!finalShipToAddressId && items.length > 0) {
      // Try to get plant_id from first item, or use plant_id from request body
      const firstItemPlantId = items[0].plant_id || plant_id;

      if (firstItemPlantId) {
        try {
          console.log('Getting ship-to address from plant/warehouse...');
          // Get plant address
          const plantAddressResult = await client.query(`
            SELECT p.address_id, a.id as address_id_from_table
            FROM plants p
            LEFT JOIN addresses a ON p.address_id = a.id
            WHERE p.id = $1 AND (p.is_active = true OR p.is_active IS NULL)
          `, [firstItemPlantId]);

          if (plantAddressResult.rows.length > 0 && plantAddressResult.rows[0].address_id) {
            finalShipToAddressId = plantAddressResult.rows[0].address_id;
            console.log(`✅ Using plant address as ship-to: ${finalShipToAddressId}`);
          } else if (plantAddressResult.rows.length > 0) {
            // Plant exists but no address_id, try to create from plant master data
            const plantData = await client.query(`
            SELECT address, city, state, country, postal_code, phone, email, manager, name
            FROM plants
            WHERE id = $1
          `, [firstItemPlantId]);

            if (plantData.rows.length > 0) {
              const plant = plantData.rows[0];
              // Create address if plant has any address data
              const hasPlantAddressData = plant.address || plant.city || plant.country;

              if (hasPlantAddressData) {
                // Check if addresses table exists, create if it doesn't
                const tableCheck = await client.query(`
                SELECT EXISTS (
                  SELECT FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'addresses'
                )
              `);

                if (!tableCheck.rows[0].exists) {
                  await client.query(`
                  CREATE TABLE addresses (
                    id SERIAL PRIMARY KEY,
                    address_line_1 VARCHAR(255),
                    address_line_2 VARCHAR(255),
                    city VARCHAR(100),
                    state VARCHAR(50),
                    country VARCHAR(50),
                    postal_code VARCHAR(20),
                    region VARCHAR(50),
                    contact_person VARCHAR(100),
                    phone VARCHAR(30),
                    email VARCHAR(100),
                    address_type VARCHAR(50),
                    is_active BOOLEAN DEFAULT TRUE,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    created_by INTEGER,
                    updated_by INTEGER
                  )
                `);
                }

                // Ensure we have required NOT NULL fields
                const plantAddressLine1 = plant.address ? String(plant.address).trim() : (plant.city || plant.country ? plant.name || 'Plant Address' : 'Plant Address');
                const plantCity = plant.city ? String(plant.city).trim() : (plant.country ? 'City not specified' : 'City not specified');
                const plantCountry = plant.country ? String(plant.country).trim() : 'Country not specified';

                const plantAddressInsertResult = await client.query(`
                INSERT INTO addresses (
                  address_line_1, address_line_2, city, state, country, postal_code,
                  contact_person, phone, email, address_type, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
              `, [
                  plantAddressLine1,
                  null, // address_line_2 not in plants table
                  plantCity,
                  plant.state ? String(plant.state).trim() : null,
                  plantCountry,
                  plant.postal_code ? String(plant.postal_code).trim() : null,
                  plant.manager || null,
                  plant.phone ? String(plant.phone).trim() : null,
                  plant.email ? String(plant.email).trim() : null,
                  'warehouse',
                  true
                ]);

                if (plantAddressInsertResult.rows.length > 0) {
                  finalShipToAddressId = plantAddressInsertResult.rows[0].id;
                  // Update plant with address_id for future use
                  await client.query(`UPDATE plants SET address_id = $1 WHERE id = $2`, [finalShipToAddressId, firstItemPlantId]).catch(() => {
                    // Column might not exist, continue
                  });
                  console.log(`✅ Created and linked plant address as ship-to: ${finalShipToAddressId}`);
                }
              }
            }
          }
        } catch (plantAddrErr) {
          console.warn('Could not get plant address for ship-to:', plantAddrErr.message);
          // Rollback and re-throw if it's a transaction error
          if (plantAddrErr.message.includes('current transaction is aborted')) {
            await client.query('ROLLBACK');
            throw plantAddrErr;
          }
        }
      }
    }

    // If still no ship-to address, try storage location from first item
    if (!finalShipToAddressId && items.length > 0 && items[0].storage_location_id) {
      try {
        const storageLocationResult = await client.query(`
          SELECT sl.address_id, a.id as address_id_from_table
          FROM storage_locations sl
          LEFT JOIN addresses a ON sl.address_id = a.id
          WHERE sl.id = $1 AND sl.is_active = true
        `, [items[0].storage_location_id]);

        if (storageLocationResult.rows.length > 0 && storageLocationResult.rows[0].address_id) {
          finalShipToAddressId = storageLocationResult.rows[0].address_id;
          console.log(`✅ Using storage location address as ship-to: ${finalShipToAddressId}`);
        }
      } catch (slAddrErr) {
        console.warn('Could not get storage location address for ship-to:', slAddrErr.message);
      }
    }

    // If still no ship-to address, use company default address
    if (!finalShipToAddressId) {
      try {
        const companyAddressResult = await client.query(`
          SELECT id FROM company_addresses
          WHERE is_default = true AND is_active = true
          LIMIT 1
        `);

        if (companyAddressResult.rows.length > 0) {
          finalShipToAddressId = companyAddressResult.rows[0].id;
          console.log(`✅ Using company default address as ship-to: ${finalShipToAddressId}`);
        }
      } catch (companyAddrErr) {
        console.warn('Could not get company default address for ship-to:', companyAddrErr.message);
      }
    }

    // Get vendor currency or use default
    let finalCurrency = currency;
    if (!finalCurrency) {
      // Try to get from vendor
      if (vendorDetails.currency) {
        finalCurrency = vendorDetails.currency;
      } else if (defaultCurrency) {
        finalCurrency = defaultCurrency;
      } else {
        // Get from company code if vendor has company_code_id
        if (vendorDetails.company_code_id) {
          const companyResult = await client.query(`
            SELECT currency FROM company_codes WHERE id = $1
          `, [vendorDetails.company_code_id]);
          if (companyResult.rows.length > 0 && companyResult.rows[0].currency) {
            finalCurrency = companyResult.rows[0].currency;
          }
        }
      }
    }

    // Get currency_id from currencies table if currency code is provided
    let finalCurrencyId = currency_id || null;
    if (!finalCurrencyId && finalCurrency) {
      try {
        const currencyIdResult = await client.query(`
          SELECT id FROM currencies WHERE code = $1 LIMIT 1
        `, [finalCurrency]);
        if (currencyIdResult.rows.length > 0) {
          finalCurrencyId = currencyIdResult.rows[0].id;
        }
      } catch (e) {
        // currencies table may not exist, continue without currency_id
        console.warn('Could not get currency_id from currencies table:', e.message);
      }
    }

    // Get payment terms from vendor or purchase organization
    let finalPaymentTerms = payment_terms || null;
    if (!finalPaymentTerms) {
      // Try to get from vendor
      if (vendorDetails.payment_terms) {
        finalPaymentTerms = vendorDetails.payment_terms;
      } else if (purchase_organization_id) {
        // Try to get from purchase organization
        try {
          const poResult = await client.query(`
            SELECT payment_terms FROM purchase_organizations WHERE id = $1 LIMIT 1
          `, [purchase_organization_id]);
          if (poResult.rows.length > 0 && poResult.rows[0].payment_terms) {
            finalPaymentTerms = poResult.rows[0].payment_terms;
          }
        } catch (e) {
          // payment_terms column may not exist in purchase_organizations
          console.warn('Could not get payment_terms from purchase_organization:', e.message);
        }
      }
    }

    // Get exchange rate - default to 1.0 if not provided and currency matches company currency
    let finalExchangeRate = exchange_rate || null;
    if (!finalExchangeRate) {
      // If currency matches company currency, use 1.0
      if (company_code_id) {
        try {
          const companyResult = await client.query(`
            SELECT currency FROM company_codes WHERE id = $1 LIMIT 1
          `, [company_code_id]);
          if (companyResult.rows.length > 0 && companyResult.rows[0].currency === finalCurrency) {
            finalExchangeRate = 1.0;
          }
        } catch (e) {
          // Continue without exchange rate
        }
      }
    }

    // Calculate amounts from items if not provided
    const calculatedTotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.total_price) || 0);
    }, 0);
    const finalTotalAmount = total_amount || calculatedTotal;

    // Calculate tax_amount from items if not provided
    let finalTaxAmount = tax_amount || null;
    if (!finalTaxAmount) {
      const calculatedTax = items.reduce((sum, item) => {
        const itemTax = parseFloat(item.tax_amount) || 0;
        return sum + itemTax;
      }, 0);
      if (calculatedTax > 0) {
        finalTaxAmount = calculatedTax;
      }
    }

    // Calculate discount_amount from items if not provided
    let finalDiscountAmount = discount_amount || null;
    if (!finalDiscountAmount) {
      const calculatedDiscount = items.reduce((sum, item) => {
        const itemDiscount = parseFloat(item.discount_amount) || 0;
        return sum + itemDiscount;
      }, 0);
      if (calculatedDiscount > 0) {
        finalDiscountAmount = calculatedDiscount;
      }
    }

    // Calculate net_amount (total_amount - discount_amount + tax_amount)
    let finalNetAmount = net_amount || null;
    if (!finalNetAmount) {
      const baseAmount = finalTotalAmount || 0;
      const discount = finalDiscountAmount || 0;
      const tax = finalTaxAmount || 0;
      finalNetAmount = baseAmount - discount + tax;
    }

    // Get vendor_name from vendor if not provided
    let finalVendorName = vendor_name || null;
    if (!finalVendorName && vendorDetails.name) {
      finalVendorName = vendorDetails.name;
    }

    // Get created_by from request or session/user context
    let finalCreatedBy = created_by || null;
    if (!finalCreatedBy && req.user && req.user.id) {
      finalCreatedBy = req.user.id;
    }

    // Fetch PO document type and its number range
    const poTypeResult = await client.query(`
      SELECT 
        pdt.*,
        nr.id as number_range_id,
        nr.number_range_code,
        nr.description as number_range_description,
        nr.range_from,
        nr.range_to,
        nr.current_number
      FROM po_document_types pdt
      LEFT JOIN number_ranges nr ON pdt.number_range_id = nr.id
      WHERE pdt.id = $1 AND pdt.is_active = true
    `, [po_document_type_id]);

    if (poTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'PO Document Type not found or inactive'
      });
    }

    const poType = poTypeResult.rows[0];

    // Validate that PO type has a number range assigned
    if (!poType.number_range_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `PO Document Type "${poType.name}" does not have a number range assigned. Please configure it in master data.`
      });
    }

    // Generate order number from the PO type's number range
    let orderNumber;
    try {
      // Get and increment the current number from the number range
      const currentNum = poType.current_number || poType.range_from;
      const rangeFrom = parseInt(poType.range_from);
      const rangeTo = parseInt(poType.range_to);
      const currentNumInt = parseInt(currentNum);

      // Check if range is exhausted
      if (currentNumInt > rangeTo) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Number range "${poType.number_range_code}" is exhausted. Please extend the range in master data.`
        });
      }

      // Format the number (pad with zeros to match range_from length)
      const paddingLength = poType.range_from.length;
      orderNumber = currentNumInt.toString().padStart(paddingLength, '0');

      // Update the number range's current_number
      const nextNumber = (currentNumInt + 1).toString().padStart(paddingLength, '0');
      await client.query(`
        UPDATE number_ranges 
        SET current_number = $1, updated_at = NOW()
        WHERE id = $2
      `, [nextNumber, poType.number_range_id]);

      console.log(`✅ Generated PO number ${orderNumber} from range ${poType.number_range_code}`);

    } catch (numGenErr) {
      console.error('Error generating PO number:', numGenErr);
      await client.query('ROLLBACK');
      return res.status(500).json({
        message: `Failed to generate PO number: ${numGenErr.message}`
      });
    }

    // Determine final status (require a status - use default from settings if not provided)
    const finalStatus = status || defaultPOStatus;
    if (!finalStatus) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Status is required. Please provide status or configure default_po_status in document_settings.'
      });
    }

    // Determine active flag (default to true if not provided)
    const finalActive = active !== undefined ? active : true;

    // Insert purchase order with addresses
    let orderResult;
    try {
      console.log('Inserting purchase order...');
      console.log('Order values:', {
        orderNumber,
        vendor_id: parseInt(vendor_id),

        purchase_organization_id: purchase_organization_id ? parseInt(purchase_organization_id) : null,
        plant_id: plant_id ? parseInt(plant_id) : null,
        company_code_id: company_code_id ? parseInt(company_code_id) : null,
        order_date,
        delivery_date,
        finalStatus,
        finalTotalAmount,
        finalCurrency,
        notes: notes || null,
        finalShipToAddressId,
        finalPayToAddressId
      });

      // Build dynamic INSERT query based on available columns
      // Check which columns exist in purchase_orders table
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
        AND column_name IN (
          'order_number', 'vendor_id', 'po_document_type_id', 'purchase_organization_id',
          'plant_id', 'company_code_id', 'order_date', 'delivery_date',
          'status', 'total_amount', 'currency', 'currency_id', 'exchange_rate',
          'payment_terms', 'tax_amount', 'discount_amount', 'net_amount',
          'notes', 'ship_to_address_id', 'pay_to_address_id',
          'created_by', 'approved_by', 'approval_date', 'vendor_name', 'active',
          'created_at', 'updated_at'
        )
      `);

      const availableColumns = columnCheck.rows.map(r => r.column_name);

      // Build columns and values arrays dynamically
      const insertColumns = [];
      const insertValues = [];
      const insertParams = [];
      let paramIndex = 1;

      // Required fields
      insertColumns.push('order_number');
      insertValues.push(`$${paramIndex++}`);
      insertParams.push(orderNumber);

      insertColumns.push('vendor_id');
      insertValues.push(`$${paramIndex++}`);
      insertParams.push(parseInt(vendor_id));

      // Add PO document type ID
      if (availableColumns.includes('po_document_type_id')) {
        insertColumns.push('po_document_type_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(parseInt(po_document_type_id));
      }

      // Optional fields - only include if column exists


      if (availableColumns.includes('purchase_organization_id')) {
        insertColumns.push('purchase_organization_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(purchase_organization_id ? parseInt(purchase_organization_id) : null);
      }

      if (availableColumns.includes('plant_id')) {
        insertColumns.push('plant_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(plant_id ? parseInt(plant_id) : null);
      }

      if (availableColumns.includes('company_code_id')) {
        insertColumns.push('company_code_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(company_code_id ? parseInt(company_code_id) : null);
      }

      insertColumns.push('order_date');
      insertValues.push(`$${paramIndex++}`);
      insertParams.push(order_date);

      if (availableColumns.includes('delivery_date')) {
        insertColumns.push('delivery_date');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(delivery_date || null);
      }

      if (availableColumns.includes('payment_terms')) {
        insertColumns.push('payment_terms');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalPaymentTerms);
      }

      if (availableColumns.includes('currency_id')) {
        insertColumns.push('currency_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalCurrencyId);
      }

      if (availableColumns.includes('exchange_rate')) {
        insertColumns.push('exchange_rate');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalExchangeRate);
      }

      if (availableColumns.includes('total_amount')) {
        insertColumns.push('total_amount');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalTotalAmount);
      }

      if (availableColumns.includes('tax_amount')) {
        insertColumns.push('tax_amount');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalTaxAmount);
      }

      if (availableColumns.includes('discount_amount')) {
        insertColumns.push('discount_amount');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalDiscountAmount);
      }

      if (availableColumns.includes('net_amount')) {
        insertColumns.push('net_amount');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalNetAmount);
      }

      if (availableColumns.includes('status')) {
        insertColumns.push('status');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalStatus);
      }

      if (availableColumns.includes('currency')) {
        insertColumns.push('currency');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalCurrency);
      }

      if (availableColumns.includes('notes')) {
        insertColumns.push('notes');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(notes || null);
      }

      if (availableColumns.includes('ship_to_address_id')) {
        insertColumns.push('ship_to_address_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalShipToAddressId || null);
      }

      if (availableColumns.includes('pay_to_address_id')) {
        insertColumns.push('pay_to_address_id');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalPayToAddressId || null);
      }

      if (availableColumns.includes('created_by')) {
        insertColumns.push('created_by');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalCreatedBy);
      }

      if (availableColumns.includes('approved_by')) {
        insertColumns.push('approved_by');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(approved_by || null);
      }

      if (availableColumns.includes('approval_date')) {
        insertColumns.push('approval_date');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(approval_date || null);
      }

      if (availableColumns.includes('vendor_name')) {
        insertColumns.push('vendor_name');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalVendorName);
      }

      if (availableColumns.includes('active')) {
        insertColumns.push('active');
        insertValues.push(`$${paramIndex++}`);
        insertParams.push(finalActive);
      }

      // Timestamps
      if (availableColumns.includes('created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
      }

      if (availableColumns.includes('updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
      }

      const insertQuery = `
        INSERT INTO purchase_orders (
          ${insertColumns.join(', ')}
        ) VALUES (${insertValues.join(', ')})
        RETURNING *
      `;

      orderResult = await client.query(insertQuery, insertParams);

      console.log(`✅ Purchase order inserted with ID: ${orderResult.rows[0].id}`);
    } catch (orderErr) {
      console.error('❌ Error inserting purchase order:', orderErr.message);
      console.error('Error code:', orderErr.code);
      console.error('Error detail:', orderErr.detail);
      console.error('Error constraint:', orderErr.constraint);
      console.error('Full error:', orderErr);
      await client.query('ROLLBACK').catch(() => { });
      return res.status(500).json({
        message: 'Failed to create purchase order',
        error: orderErr.message,
        code: orderErr.code,
        detail: orderErr.detail
      });
    }

    const purchaseOrderId = orderResult.rows[0].id;

    // Fetch vendor-specific pricing for all materials in this PO
    console.log(`[PO Creation] Fetching vendor-specific pricing for vendor ID ${vendor_id}...`);
    const vendorMaterialsResult = await client.query(`
      SELECT 
        vm.material_id,
        vm.unit_price as vendor_unit_price,
        vm.currency as vendor_currency,
        vm.lead_time_days,
        vm.minimum_order_quantity
      FROM vendor_materials vm
      WHERE vm.vendor_id = $1 
        AND vm.is_active = true
        AND (vm.valid_from IS NULL OR DATE(vm.valid_from) <= CURRENT_DATE)
        AND (vm.valid_to IS NULL OR DATE(vm.valid_to) >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM source_lists sl 
          WHERE sl.material_id = vm.material_id 
          AND sl.vendor_id = vm.vendor_id 
          AND sl.is_blocked = true 
          AND sl.is_active = true 
          AND CURRENT_DATE BETWEEN sl.valid_from AND sl.valid_to
        )
    `, [vendor_id]);

    // Create a map of material_id -> vendor pricing for quick lookup
    const vendorPricingMap = {};
    vendorMaterialsResult.rows.forEach(row => {
      vendorPricingMap[row.material_id] = {
        unitPrice: parseFloat(row.vendor_unit_price) || null,
        currency: row.vendor_currency,
        leadTimeDays: row.lead_time_days,
        minimumOrderQuantity: row.minimum_order_quantity
      };
    });
    console.log(`[PO Creation] Found vendor pricing for ${vendorMaterialsResult.rows.length} materials`);

    // Track actual total for recalculating PO total_amount
    let actualPoTotal = 0;

    // Insert purchase order items and update inventory ordered_quantity
    const itemPromises = items.map(async (item, index) => {
      try {
        // Get item status - use item status, or default from settings, or throw error
        const itemStatus = item.status || defaultPOStatus;
        if (!itemStatus) {
          throw new Error(`Status is required for purchase order item at line ${index + 1}. Please provide status or configure default_po_status in document_settings.`);
        }

        // Build dynamic INSERT query for purchase_order_items
        // Check which columns exist in purchase_order_items table
        const itemColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'purchase_order_items'
          AND column_name IN (
            'purchase_order_id', 'line_number', 'material_id', 'description',
            'quantity', 'unit_price', 'total_price', 'delivery_date',
            'plant_id', 'storage_location_id', 'tax_code', 'discount_percent',
            'received_quantity', 'invoiced_quantity', 'status',
            'created_at', 'updated_at', 'active'
          )
        `);

        const availableItemColumns = itemColumnCheck.rows.map(r => r.column_name);

        // Build columns and values arrays dynamically
        const itemInsertColumns = [];
        const itemInsertValues = [];
        const itemInsertParams = [];
        let itemParamIndex = 1;

        // Required fields
        itemInsertColumns.push('purchase_order_id');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(purchaseOrderId);

        itemInsertColumns.push('line_number');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(item.line_number ? String(item.line_number) : String((index + 1) * 10));

        if (availableItemColumns.includes('material_id')) {
          itemInsertColumns.push('material_id');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.material_id || null);
        }

        if (availableItemColumns.includes('description')) {
          itemInsertColumns.push('description');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.description || null);
        }

        itemInsertColumns.push('quantity');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(item.quantity);

        // Apply vendor-specific pricing if available
        const vendorPricing = item.material_id ? vendorPricingMap[item.material_id] : null;

        let finalUnitPrice = item.unit_price || 0;
        let finalTotalPrice = item.total_price || 0;

        if (vendorPricing && vendorPricing.unitPrice) {
          // Use vendor-specific price
          finalUnitPrice = vendorPricing.unitPrice;
          finalTotalPrice = finalUnitPrice * (item.quantity || 0);
          console.log(`[PO Creation] Using vendor price for material ${item.material_id}: ${finalUnitPrice} (source: vendor_materials)`);
        } else {
          // Use provided price from request
          console.log(`[PO Creation] Using provided price for material ${item.material_id}: ${finalUnitPrice} (source: request, no vendor price)`);
        }

        // Add to actual total for PO header update
        actualPoTotal += finalTotalPrice;

        itemInsertColumns.push('unit_price');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(finalUnitPrice);

        itemInsertColumns.push('total_price');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(finalTotalPrice);

        if (availableItemColumns.includes('delivery_date')) {
          itemInsertColumns.push('delivery_date');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.delivery_date || delivery_date || null);
        }

        if (availableItemColumns.includes('plant_id')) {
          itemInsertColumns.push('plant_id');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.plant_id || plant_id || null);
        }

        if (availableItemColumns.includes('storage_location_id')) {
          itemInsertColumns.push('storage_location_id');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.storage_location_id || null);
        }

        if (availableItemColumns.includes('tax_code')) {
          itemInsertColumns.push('tax_code');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.tax_code || null);
        }

        if (availableItemColumns.includes('discount_percent')) {
          itemInsertColumns.push('discount_percent');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.discount_percent || null);
        }

        if (availableItemColumns.includes('received_quantity')) {
          itemInsertColumns.push('received_quantity');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.received_quantity || 0);
        }

        if (availableItemColumns.includes('invoiced_quantity')) {
          itemInsertColumns.push('invoiced_quantity');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.invoiced_quantity || 0);
        }

        if (availableItemColumns.includes('status')) {
          itemInsertColumns.push('status');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(itemStatus);
        }

        if (availableItemColumns.includes('active')) {
          itemInsertColumns.push('active');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.active !== undefined ? item.active : true);
        }

        // Timestamps
        if (availableItemColumns.includes('created_at')) {
          itemInsertColumns.push('created_at');
          itemInsertValues.push('NOW()');
        }

        if (availableItemColumns.includes('updated_at')) {
          itemInsertColumns.push('updated_at');
          itemInsertValues.push('NOW()');
        }

        const itemInsertQuery = `
          INSERT INTO purchase_order_items (
            ${itemInsertColumns.join(', ')}
          ) VALUES (${itemInsertValues.join(', ')})
          RETURNING *
        `;

        const itemResult = await client.query(itemInsertQuery, itemInsertParams);

        // Get material and plant information for inventory tracking
        const materialResult = await client.query(`
            SELECT 
              m.code as material_code, 
              m.base_uom, 
              m.uom_id,
              m.plant_code,
              m.production_storage_location
            FROM materials m
            WHERE m.id = $1
          `, [item.material_id]);

        if (materialResult.rows.length > 0) {
          const materialCode = materialResult.rows[0].material_code;
          // Get unit from material (use base_uom, or from item, or null)
          let unit = materialResult.rows[0].base_uom || item.unit || null;

          // Get plant code - use item.plant_id or fall back to PO's plant_id
          let plantCode = null;
          const plantIdToUse = item.plant_id || plant_id;
          if (plantIdToUse) {
            const plantResult = await client.query(`
              SELECT p.code
              FROM plants p
              WHERE p.id = $1
            `, [plantIdToUse]);
            if (plantResult.rows.length > 0) {
              plantCode = plantResult.rows[0].code;
            }
          }

          // Get storage location code - priority: item storage_location, storage_location_id, or warehouse_type code
          let storageLocationCode = item.storage_location;
          if (!storageLocationCode && item.storage_location_id) {
            const storageResult = await client.query(`
              SELECT code FROM storage_locations WHERE id = $1
            `, [item.storage_location_id]);
            if (storageResult.rows.length > 0) {
              storageLocationCode = storageResult.rows[0].code;
            }
          }
          // If still no storage location, use warehouse_type code as storage location
          if (!storageLocationCode && warehouse_type_id) {
            const warehouseResult = await client.query(`
              SELECT code FROM warehouse_types WHERE id = $1
            `, [warehouse_type_id]);
            if (warehouseResult.rows.length > 0) {
              storageLocationCode = warehouseResult.rows[0].code;
            }
          }

          // Fallback: If plantCode or storageLocationCode still missing, use values from Material Master
          if (materialResult.rows.length > 0) {
            const matData = materialResult.rows[0];
            if (!plantCode && matData.plant_code) {
              plantCode = matData.plant_code;
              console.log(`ℹ️ Using default plant ${plantCode} from material master for item ${item.material_id}`);
            }
            if (!storageLocationCode && matData.production_storage_location) {
              storageLocationCode = matData.production_storage_location;
              console.log(`ℹ️ Using default storage ${storageLocationCode} from material master for item ${item.material_id}`);
            }
          }

          // Update inventory ordered_quantity (increase)
          // Use plant_id from item or fall back to PO's plant_id
          let plantIdForInventory = item.plant_id || plant_id;

          // If we have a plantCode but no plantId (e.g. from material master), fetch the ID
          if (!plantIdForInventory && plantCode) {
            const pRes = await client.query('SELECT id FROM plants WHERE code = $1', [plantCode]);
            if (pRes.rows.length > 0) {
              plantIdForInventory = pRes.rows[0].id;
            }
          }

          if (materialCode && plantCode && unit && storageLocationCode) {
            try {
              await inventoryTrackingService.increaseOrderedQuantity(
                item.material_id,
                materialCode,
                plantIdForInventory,
                plantCode,
                storageLocationCode,
                parseFloat(item.quantity),
                unit,
                client // Pass transaction client to ensure it's part of the same transaction
              );
              console.log(`✅ Updated inventory ordered_quantity for material ${materialCode}: +${item.quantity} at plant ${plantCode}, storage ${storageLocationCode}`);
            } catch (invError) {
              console.error(`❌ Failed to update inventory for material ${materialCode}:`, invError);
              // Re-throw to ensure transaction rollback if inventory update fails
              throw invError;
            }
          } else {
            const missingFields = [];
            if (!materialCode) missingFields.push('materialCode');
            if (!plantCode) missingFields.push('plantCode');
            if (!unit) missingFields.push('unit');
            if (!storageLocationCode) missingFields.push('storageLocationCode');
            console.error(`❌ CRITICAL: Skipping inventory update for item ${item.material_id}: missing ${missingFields.join(', ')}`);
            console.error(`   Item details: material_id=${item.material_id}, plant_id=${item.plant_id || plant_id}, warehouse_type_id=${warehouse_type_id}`);
            // Try to get defaults if missing
            if (!plantCode && plant_id) {
              const plantResult = await client.query(`SELECT code FROM plants WHERE id = $1`, [plant_id]);
              if (plantResult.rows.length > 0) {
                plantCode = plantResult.rows[0].code;
                console.log(`   ✅ Resolved plant_code: ${plantCode}`);
              }
            }
            if (!storageLocationCode) {
              // Use a default storage location if none specified
              storageLocationCode = 'DEFAULT';
              console.log(`   ✅ Using default storage_location: ${storageLocationCode}`);
            }
            if (!unit) {
              // Try to get unit from material
              if (materialResult.rows.length > 0 && materialResult.rows[0].base_uom) {
                unit = materialResult.rows[0].base_uom;
                console.log(`   ✅ Resolved unit from material: ${unit}`);
              } else {
                unit = 'EA'; // Default unit
                console.log(`   ✅ Using default unit: ${unit}`);
              }
            }
            // Retry inventory update if we resolved missing fields
            if (materialCode && plantCode && unit && storageLocationCode) {
              try {
                await inventoryTrackingService.increaseOrderedQuantity(
                  item.material_id,
                  materialCode,
                  plantIdForInventory,
                  plantCode,
                  storageLocationCode,
                  parseFloat(item.quantity),
                  unit,
                  client
                );
                console.log(`✅ Updated inventory ordered_quantity for material ${materialCode}: +${item.quantity} at plant ${plantCode}, storage ${storageLocationCode}`);
              } catch (invError) {
                console.error(`❌ Failed to update inventory after retry for material ${materialCode}:`, invError);
                // Still don't throw - allow PO creation to continue but log the error
              }
            } else {
              console.error(`❌ Still missing required fields after retry. Inventory update skipped.`);
            }
          }
        }

        return itemResult;
      } catch (itemErr) {
        console.error(`❌ Error inserting purchase order item at line ${item.line_number || (index + 1)}:`, itemErr.message);
        console.error('Item data:', JSON.stringify(item, null, 2));
        throw itemErr; // Re-throw to be caught by outer try-catch
      }
    });

    try {
      await Promise.all(itemPromises);
      console.log(`✅ All ${items.length} purchase order items inserted successfully`);

      // Update PO total_amount with actual total based on vendor prices
      console.log(`[PO Creation] Updating PO total from ${finalTotalAmount} (provided) to ${actualPoTotal} (with vendor prices)`);
      await client.query(`
        UPDATE purchase_orders
        SET total_amount = $1
        WHERE id = $2
      `, [actualPoTotal, purchaseOrderId]);
    } catch (itemErr) {
      console.error('❌ Error inserting purchase order items:', itemErr.message);
      console.error('Error details:', itemErr);
      await client.query('ROLLBACK').catch(() => { });
      return res.status(500).json({
        message: 'Failed to create purchase order items',
        error: itemErr.message,
        code: itemErr.code,
        detail: itemErr.detail
      });
    }

    // Get inserted items
    const itemsResult = await client.query(`
      SELECT poi.*, m.code as material_code, m.name as material_name
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.line_number ASC
    `, [purchaseOrderId]);

    // Get pay-to address details
    let payToAddressDetails = null;
    if (finalPayToAddressId) {
      const payToAddressResult = await client.query(`
        SELECT 
          id,
          address_line_1,
          address_line_2,
          city,
          state,
          country,
          postal_code,
          contact_person,
          phone,
          email
        FROM addresses
        WHERE id = $1
      `, [finalPayToAddressId]);

      if (payToAddressResult.rows.length > 0) {
        payToAddressDetails = payToAddressResult.rows[0];
      } else if (vendor && vendor.address) {
        // Fallback: Use vendor address directly from vendors table if address record doesn't exist
        // This should rarely happen since we create the address record above, but kept as safety fallback
        try {
          payToAddressDetails = {
            id: vendor.id,
            address_line_1: vendor.address,
            address_line_2: vendor.address_2 || null,
            city: vendor.city,
            state: vendor.state || null,
            country: vendor.country,
            postal_code: vendor.postal_code || null,
            contact_person: vendor.contact_name || vendor.name || null,
            phone: vendor.phone || null,
            email: vendor.email || null
          };
          console.log('Using vendor address from master data as fallback');
        } catch (vendorAddrErr) {
          console.warn('Could not use vendor address fallback:', vendorAddrErr.message);
        }
      }
    }

    // Get ship-to address details (if provided)
    let shipToAddressDetails = null;
    if (finalShipToAddressId) {
      const shipToAddressResult = await client.query(`
        SELECT 
          id,
          address_line_1,
          address_line_2,
          city,
          state,
          country,
          postal_code,
          contact_person,
          phone,
          email
        FROM addresses
        WHERE id = $1
      `, [finalShipToAddressId]);

      if (shipToAddressResult.rows.length > 0) {
        shipToAddressDetails = shipToAddressResult.rows[0];
      }
    }

    await client.query('COMMIT');

    const responseData = {
      ...orderResult.rows[0],
      vendor_name: vendorDetails.name || '',
      items: itemsResult.rows,
      ship_to_address: shipToAddressDetails,
      pay_to_address: payToAddressDetails
    };

    console.log(`✅ Purchase order created: ${orderNumber} with ${items.length} item(s)`);
    res.status(201).json(responseData);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors if transaction was already rolled back
    });
    console.error('❌ Error creating purchase order:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      message: 'Failed to create purchase order',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

// Get single purchase order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if purchase_orders table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
      );
    `);

    if (tableCheckResult.rows[0].exists) {
      const result = await pool.query(`
        SELECT 
          po.*, 
          v.name as vendor_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      // Get order items
      const itemsResult = await pool.query(`
        SELECT poi.*, m.code as material_code, m.name as material_name
        FROM purchase_order_items poi
        LEFT JOIN materials m ON poi.material_id = m.id
        WHERE poi.purchase_order_id = $1 AND poi.active = true
        ORDER BY poi.line_number ASC
      `, [id]);

      // Get ship-to and pay-to address details
      const po = result.rows[0];
      let shipToAddress = null;
      let payToAddress = null;

      if (po.ship_to_address_id) {
        const shipToResult = await pool.query(`
          SELECT 
            id,
            address_line_1,
            address_line_2,
            city,
            state,
            country,
            postal_code,
            contact_person,
            phone,
            email
          FROM addresses
          WHERE id = $1
        `, [po.ship_to_address_id]);

        if (shipToResult.rows.length > 0) {
          shipToAddress = shipToResult.rows[0];
        }
      }

      if (po.pay_to_address_id) {
        const payToResult = await pool.query(`
          SELECT 
            id,
            address_line_1,
            address_line_2,
            city,
            state,
            country,
            postal_code,
            contact_person,
            phone,
            email
          FROM addresses
          WHERE id = $1
        `, [po.pay_to_address_id]);

        if (payToResult.rows.length > 0) {
          payToAddress = payToResult.rows[0];
        }
      }

      res.json({
        ...po,
        items: itemsResult.rows,
        ship_to_address: shipToAddress,
        pay_to_address: payToAddress
      });
    } else {
      res.status(404).json({ message: 'Purchase order not found' });
    }
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ message: 'Failed to fetch purchase order' });
  }
});

// Get purchase order items by order ID
router.get('/orders/:id/items', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if purchase_order_items table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_order_items'
      );
    `);

    if (!tableCheckResult.rows[0].exists) {
      return res.json([]);
    }

    // Get order items with material details
    const itemsResult = await pool.query(`
      SELECT 
        poi.*,
        m.code as material_code,
        m.name as material_name,
        m.description as material_description,
        m.base_uom as material_unit
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE poi.purchase_order_id = $1 AND (poi.active = true OR poi.active IS NULL)
      ORDER BY poi.line_number ASC, poi.id ASC
    `, [id]);

    // Map the results to ensure consistent field names
    const items = itemsResult.rows.map(item => ({
      id: item.id,
      line_item: item.line_number || item.id,
      line_number: item.line_number || item.id,
      material_id: item.material_id,
      material_code: item.material_code || null,
      material_name: item.material_name || null,
      description: item.material_description || item.description || null,  // Use material description from materials table
      quantity: parseFloat(item.quantity || 0),
      invoiced_quantity: parseFloat(item.invoiced_quantity || 0),
      received_quantity: parseFloat(item.received_quantity || 0),
      unit: item.material_unit || null, // Get unit from materials table
      unit_price: parseFloat(item.unit_price || 0),
      total_price: parseFloat(item.total_price || 0),
      tax_rate: 0, // tax_rate doesn't exist, use 0 as default (or calculate from tax_code if needed)
      tax_code: item.tax_code || null,
      status: item.status,
      active: item.active !== false
    }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching purchase order items:', error);
    res.status(500).json({
      message: 'Failed to fetch purchase order items',
      error: error.message
    });
  }
});

// Update purchase order
router.put('/orders/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      vendor_id,
      warehouse_type_id,
      purchase_organization_id,
      plant_id,
      company_code_id,
      order_date,
      delivery_date,
      status,
      total_amount,
      currency,
      notes,
      ship_to_address_id,
      items = []
    } = req.body;

    // Check if order exists
    const orderCheck = await client.query(`
      SELECT id, status, vendor_id FROM purchase_orders WHERE id = $1
    `, [id]);

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const existingOrder = orderCheck.rows[0];

    // Get document settings for default values
    const settingsResult = await client.query(`
      SELECT setting_key, setting_value 
      FROM document_settings 
      WHERE setting_key IN ('default_po_status', 'default_currency')
    `);

    const settingsMap = {};
    settingsResult.rows.forEach(row => {
      settingsMap[row.setting_key] = row.setting_value;
    });

    // Use existing order status as default if no setting exists
    const defaultPOStatus = settingsMap['default_po_status'] || existingOrder.status || status || null;
    const defaultCurrency = settingsMap['default_currency'];

    // Validate items array if provided
    if (items && items.length > 0) {
      // Calculate total amount from items if not provided
      const calculatedTotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.total_price) || 0);
      }, 0);
      const finalTotalAmount = total_amount || calculatedTotal;

      // Parse vendor_id properly - ensure it's a number or null
      const finalVendorId = vendor_id !== undefined && vendor_id !== null
        ? (typeof vendor_id === 'number' ? vendor_id : parseInt(vendor_id))
        : null;

      // Get existing order vendor_id for logging
      const existingOrderVendorId = existingOrder.vendor_id;

      console.log('🔄 Updating purchase order vendor:', {
        orderId: id,
        oldVendorId: existingOrderVendorId,
        newVendorId: finalVendorId,
        vendorIdFromRequest: vendor_id,
        vendorIdType: typeof vendor_id
      });

      // Validate vendor exists if vendor_id is being updated
      if (finalVendorId !== null) {
        const vendorCheck = await client.query(`
          SELECT id FROM vendors WHERE id = $1
        `, [finalVendorId]);

        if (vendorCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          console.error('❌ Vendor not found:', finalVendorId);
          return res.status(400).json({ message: 'Vendor not found' });
        }
        console.log('✅ Vendor validated:', finalVendorId);
      } else if (vendor_id !== undefined) {
        // If vendor_id was explicitly set to null/undefined, log it
        console.log('⚠️  vendor_id is null/undefined - keeping existing vendor_id');
      }

      // Update purchase order
      const orderResult = await client.query(`
        UPDATE purchase_orders SET
          vendor_id = COALESCE($1, vendor_id),
          warehouse_type_id = COALESCE($2, warehouse_type_id),
          purchase_organization_id = COALESCE($3, purchase_organization_id),
          plant_id = COALESCE($4, plant_id),
          company_code_id = COALESCE($5, company_code_id),
          order_date = COALESCE($6, order_date),
          delivery_date = COALESCE($7, delivery_date),
          status = COALESCE($8, status),
          total_amount = COALESCE($9, total_amount),
          currency = COALESCE($10, currency),
          notes = COALESCE($11, notes),
          ship_to_address_id = COALESCE($12, ship_to_address_id),
          updated_at = NOW()
        WHERE id = $13
        RETURNING *
      `, [
        finalVendorId,
        warehouse_type_id ? parseInt(warehouse_type_id) : null,
        purchase_organization_id ? parseInt(purchase_organization_id) : null,
        plant_id ? parseInt(plant_id) : null,
        company_code_id ? parseInt(company_code_id) : null,
        order_date || null,
        delivery_date || null,
        status || null,
        finalTotalAmount || null,
        currency || null,
        notes || null,
        ship_to_address_id ? parseInt(ship_to_address_id) : null,
        id
      ]);

      // Log the update result
      if (orderResult.rows.length > 0) {
        const updatedOrder = orderResult.rows[0];
        console.log('✅ Purchase order updated successfully:', {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          vendorId: updatedOrder.vendor_id,
          vendorIdChanged: updatedOrder.vendor_id !== existingOrderVendorId
        });
      } else {
        console.error('❌ No rows returned from UPDATE query');
      }

      // Get existing items to reverse inventory tracking
      const existingItemsResult = await client.query(`
        SELECT poi.material_id, poi.plant_id, poi.quantity, poi.storage_location_id,
               m.code as material_code, p.code as plant_code, sl.code as storage_location_code,
               m.base_uom
        FROM purchase_order_items poi
        LEFT JOIN materials m ON poi.material_id = m.id
        LEFT JOIN plants p ON poi.plant_id = p.id
        LEFT JOIN storage_locations sl ON poi.storage_location_id = sl.id
        WHERE poi.purchase_order_id = $1 AND poi.active = true
      `, [id]);

      // Reverse inventory ordered_quantity for existing items
      for (const existingItem of existingItemsResult.rows) {
        if (existingItem.material_code && existingItem.plant_code && existingItem.storage_location_code) {
          try {
            const unit = existingItem.base_uom;
            if (unit) {
              // Decrease ordered_quantity (reverse the original increase)
              await inventoryTrackingService.increaseOrderedQuantity(
                existingItem.material_id,
                existingItem.material_code,
                existingItem.plant_id,
                existingItem.plant_code,
                existingItem.storage_location_code,
                -parseFloat(existingItem.quantity || 0), // Negative to reverse
                unit
              );
            }
          } catch (invError) {
            console.error(`Warning: Failed to reverse inventory for material ${existingItem.material_code}:`, invError);
          }
        }
      }

      // Delete existing items (soft delete)
      await client.query(`
        UPDATE purchase_order_items 
        SET active = false, updated_at = NOW()
        WHERE purchase_order_id = $1
      `, [id]);

      // Insert new items
      const itemPromises = items.map(async (item, index) => {
        // Build dynamic INSERT query for purchase_order_items (same as in POST route)
        const itemColumnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'purchase_order_items'
            AND column_name IN (
              'purchase_order_id', 'line_number', 'material_id', 'description',
              'quantity', 'unit_price', 'total_price', 'delivery_date',
              'plant_id', 'storage_location_id', 'tax_code', 'discount_percent',
              'received_quantity', 'invoiced_quantity', 'status',
              'created_at', 'updated_at', 'active'
            )
          `);

        const availableItemColumns = itemColumnCheck.rows.map(r => r.column_name);

        const itemInsertColumns = [];
        const itemInsertValues = [];
        const itemInsertParams = [];
        let itemParamIndex = 1;

        itemInsertColumns.push('purchase_order_id');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(id);

        itemInsertColumns.push('line_number');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(item.line_number || (index + 1));

        if (availableItemColumns.includes('material_id')) {
          itemInsertColumns.push('material_id');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.material_id || null);
        }

        if (availableItemColumns.includes('description')) {
          itemInsertColumns.push('description');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.description || null);
        }

        itemInsertColumns.push('quantity');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(item.quantity);

        itemInsertColumns.push('unit_price');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(item.unit_price);

        itemInsertColumns.push('total_price');
        itemInsertValues.push(`$${itemParamIndex++}`);
        itemInsertParams.push(item.total_price);

        if (availableItemColumns.includes('delivery_date')) {
          itemInsertColumns.push('delivery_date');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.delivery_date || delivery_date || null);
        }

        if (availableItemColumns.includes('plant_id')) {
          itemInsertColumns.push('plant_id');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.plant_id || null);
        }

        if (availableItemColumns.includes('storage_location_id')) {
          itemInsertColumns.push('storage_location_id');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.storage_location_id || null);
        }

        if (availableItemColumns.includes('tax_code')) {
          itemInsertColumns.push('tax_code');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.tax_code || null);
        }

        if (availableItemColumns.includes('discount_percent')) {
          itemInsertColumns.push('discount_percent');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.discount_percent || null);
        }

        if (availableItemColumns.includes('received_quantity')) {
          itemInsertColumns.push('received_quantity');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.received_quantity || 0);
        }

        if (availableItemColumns.includes('invoiced_quantity')) {
          itemInsertColumns.push('invoiced_quantity');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.invoiced_quantity || 0);
        }

        if (availableItemColumns.includes('status')) {
          itemInsertColumns.push('status');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.status || defaultPOStatus);
        }

        if (availableItemColumns.includes('active')) {
          itemInsertColumns.push('active');
          itemInsertValues.push(`$${itemParamIndex++}`);
          itemInsertParams.push(item.active !== undefined ? item.active : true);
        }

        if (availableItemColumns.includes('created_at')) {
          itemInsertColumns.push('created_at');
          itemInsertValues.push('NOW()');
        }

        if (availableItemColumns.includes('updated_at')) {
          itemInsertColumns.push('updated_at');
          itemInsertValues.push('NOW()');
        }

        const itemInsertQuery = `
            INSERT INTO purchase_order_items (
              ${itemInsertColumns.join(', ')}
            ) VALUES (${itemInsertValues.join(', ')})
            RETURNING *
          `;

        const itemResult = await client.query(itemInsertQuery, itemInsertParams);

        // Update inventory ordered_quantity for new items
        if (item.material_id && item.plant_id) {
          try {
            const materialResult = await client.query(`
              SELECT m.code as material_code, m.base_uom
              FROM materials m
              WHERE m.id = $1
            `, [item.material_id]);

            if (materialResult.rows.length > 0) {
              const materialCode = materialResult.rows[0].material_code;
              let unit = materialResult.rows[0].base_uom || item.unit;

              const plantResult = await client.query(`
                SELECT p.code
                FROM plants p
                WHERE p.id = $1
              `, [item.plant_id]);

              if (plantResult.rows.length > 0 && materialCode && unit) {
                const plantCode = plantResult.rows[0].code;
                let storageLocation = item.storage_location;

                if (!storageLocation && item.storage_location_id) {
                  const storageResult = await client.query(`
                    SELECT code FROM storage_locations WHERE id = $1
                  `, [item.storage_location_id]);
                  if (storageResult.rows.length > 0) {
                    storageLocation = storageResult.rows[0].code;
                  }
                }

                // If still no storage location, use warehouse_type code as storage location
                if (!storageLocation && warehouse_type_id) {
                  const warehouseResult = await client.query(`
                    SELECT code FROM warehouse_types WHERE id = $1
                  `, [warehouse_type_id]);
                  if (warehouseResult.rows.length > 0) {
                    storageLocation = warehouseResult.rows[0].code;
                  }
                }

                // Use defaults if still missing
                if (!storageLocation) {
                  storageLocation = 'DEFAULT';
                }
                if (!unit) {
                  unit = 'EA';
                }

                if (plantCode && materialCode && unit && storageLocation) {
                  try {
                    await inventoryTrackingService.increaseOrderedQuantity(
                      item.material_id,
                      materialCode,
                      item.plant_id,
                      plantCode,
                      storageLocation,
                      parseFloat(item.quantity),
                      unit,
                      client
                    );
                    console.log(`✅ Updated inventory ordered_quantity for material ${materialCode}: +${item.quantity} at plant ${plantCode}, storage ${storageLocation}`);
                  } catch (invError) {
                    console.error(`❌ Failed to update inventory for material ${materialCode}:`, invError);
                    // Don't throw - allow update to continue
                  }
                } else {
                  console.error(`❌ Missing required fields for inventory update: materialCode=${materialCode}, plantCode=${plantCode}, unit=${unit}, storageLocation=${storageLocation}`);
                }
              }
            }
          } catch (invError) {
            console.error(`Warning: Failed to update inventory for material ${item.material_id}:`, invError);
          }
        }

        return itemResult;
      });

      await Promise.all(itemPromises);

      // Get vendor name
      const vendorResult = await client.query(`
        SELECT name FROM vendors WHERE id = $1
      `, [orderResult.rows[0].vendor_id]);

      // Get updated items
      const itemsResult = await client.query(`
        SELECT poi.*, m.code as material_code, m.name as material_name
        FROM purchase_order_items poi
        LEFT JOIN materials m ON poi.material_id = m.id
        WHERE poi.purchase_order_id = $1 AND poi.active = true
        ORDER BY poi.line_number ASC
      `, [id]);

      await client.query('COMMIT');

      const responseData = {
        ...orderResult.rows[0],
        vendor_name: vendorResult.rows[0]?.name || '',
        items: itemsResult.rows
      };

      console.log(`✅ Purchase order updated: ${orderResult.rows[0].order_number}`);
      res.json(responseData);
    } else {
      // Update only order fields without items
      const orderResult = await client.query(`
        UPDATE purchase_orders SET
          vendor_id = COALESCE($1, vendor_id),
          warehouse_type_id = COALESCE($2, warehouse_type_id),
          purchase_organization_id = COALESCE($3, purchase_organization_id),
          plant_id = COALESCE($4, plant_id),
          company_code_id = COALESCE($5, company_code_id),
          order_date = COALESCE($6, order_date),
          delivery_date = COALESCE($7, delivery_date),
          status = COALESCE($8, status),
          total_amount = COALESCE($9, total_amount),
          currency = COALESCE($10, currency),
          notes = COALESCE($11, notes),
          ship_to_address_id = COALESCE($12, ship_to_address_id),
          updated_at = NOW()
        WHERE id = $13
        RETURNING *
      `, [
        vendor_id || null,
        warehouse_type_id ? parseInt(warehouse_type_id) : null,
        purchase_organization_id ? parseInt(purchase_organization_id) : null,
        plant_id ? parseInt(plant_id) : null,
        company_code_id ? parseInt(company_code_id) : null,
        order_date || null,
        delivery_date || null,
        status || null,
        total_amount || null,
        currency || null,
        notes || null,
        ship_to_address_id ? parseInt(ship_to_address_id) : null,
        id
      ]);

      // Get vendor name
      const vendorResult = await client.query(`
        SELECT name FROM vendors WHERE id = $1
      `, [orderResult.rows[0].vendor_id]);

      await client.query('COMMIT');

      const responseData = {
        ...orderResult.rows[0],
        vendor_name: vendorResult.rows[0]?.name || ''
      };

      console.log(`✅ Purchase order updated: ${orderResult.rows[0].order_number}`);
      res.json(responseData);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      message: 'Failed to update purchase order',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Delete purchase order
router.delete('/orders/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if order exists
    const orderCheck = await client.query(`
      SELECT id, order_number FROM purchase_orders WHERE id = $1
    `, [id]);

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Soft delete: set active = false
    await client.query(`
      UPDATE purchase_orders 
      SET active = false, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Also soft delete items
    await client.query(`
      UPDATE purchase_order_items 
      SET active = false, updated_at = NOW()
      WHERE purchase_order_id = $1
    `, [id]);

    await client.query('COMMIT');

    console.log(`✅ Purchase order deleted: ${orderCheck.rows[0].order_number}`);
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      message: 'Failed to delete purchase order',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// Get all purchase requisitions
// REQUISITION ROUTES MOVED TO server/routes/purchase/requisitionRoutes.ts
// These legacy routes were causing conflicts (blank department, missing total value)
// DO NOT UNCOMMENT WITHOUT CHECKING THE NEW FILE


// Get PR line items
router.get('/requisitions/:id/items', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        pri.*,
        m.code as material_code_ref,
        m.name as material_name_ref
      FROM purchase_requisition_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
      WHERE pri.requisition_id = $1
      ORDER BY pri.line_number
    `, [id]);

    // Convert numeric strings to numbers
    const items = result.rows.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity),
      estimated_unit_price: parseFloat(item.estimated_unit_price) || parseFloat(item.unit_price) || 0,
      estimated_total_price: parseFloat(item.estimated_total_price) || parseFloat(item.total_price) || 0,
    }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching PR items:', error);
    res.status(500).json({ message: 'Failed to fetch PR items', error: error.message });
  }
});

// Get PR history
router.get('/requisitions/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM pr_history
      WHERE pr_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching PR history:', error);
    res.status(500).json({ message: 'Failed to fetch PR history', error: error.message });
  }
});

// Approve PR
router.post('/requisitions/:id/approve', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { approver_name, comments } = req.body;

    await client.query('BEGIN');

    // Check if PR exists
    const prCheck = await client.query(
      'SELECT * FROM purchase_requisitions WHERE id = $1',
      [id]
    );

    if (prCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase requisition not found' });
    }

    const pr = prCheck.rows[0];

    // Check if already approved or rejected
    if (pr.approval_status === 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Purchase requisition is already approved' });
    }

    if (pr.approval_status === 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot approve a rejected requisition' });
    }

    // Update PR status
    const updateResult = await client.query(`
      UPDATE purchase_requisitions
      SET 
        approval_status = 'APPROVED',
        status = 'APPROVED',
        current_approver_name = $1,
        approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [approver_name, id]);

    // Insert approval record
    await client.query(`
      INSERT INTO pr_approvals (
        pr_id, approver_name, status, comments, approved_at
      ) VALUES ($1, $2, 'APPROVED', $3, CURRENT_TIMESTAMP)
    `, [id, approver_name, comments]);

    // Insert history record
    await client.query(`
      INSERT INTO pr_history (
        pr_id, action, performed_by, old_status, new_status, comments
      ) VALUES ($1, 'APPROVED', $2, $3, 'APPROVED', $4)
    `, [id, approver_name, pr.status, comments]);

    await client.query('COMMIT');

    res.json({
      message: 'Purchase requisition approved successfully',
      pr: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving PR:', error);
    res.status(500).json({ message: 'Failed to approve PR', error: error.message });
  } finally {
    client.release();
  }
});

// Reject PR
router.post('/requisitions/:id/reject', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { approver_name, comments } = req.body;

    if (!comments) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    await client.query('BEGIN');

    // Check if PR exists
    const prCheck = await client.query(
      'SELECT * FROM purchase_requisitions WHERE id = $1',
      [id]
    );

    if (prCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase requisition not found' });
    }

    const pr = prCheck.rows[0];

    // Check if already approved or rejected
    if (pr.approval_status === 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot reject an approved requisition' });
    }

    if (pr.approval_status === 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Purchase requisition is already rejected' });
    }

    // Update PR status
    const updateResult = await client.query(`
      UPDATE purchase_requisitions
      SET 
        approval_status = 'REJECTED',
        status = 'REJECTED',
        current_approver_name = $1,
        rejection_reason = $2,
        rejected_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [approver_name, comments, id]);

    // Insert approval record
    await client.query(`
      INSERT INTO pr_approvals (
        pr_id, approver_name, status, comments, rejected_at
      ) VALUES ($1, $2, 'REJECTED', $3, CURRENT_TIMESTAMP)
    `, [id, approver_name, comments]);

    // Insert history record
    await client.query(`
      INSERT INTO pr_history (
        pr_id, action, performed_by, old_status, new_status, comments
      ) VALUES ($1, 'REJECTED', $2, $3, 'REJECTED', $4)
    `, [id, approver_name, pr.status, comments]);

    await client.query('COMMIT');

    res.json({
      message: 'Purchase requisition rejected',
      pr: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting PR:', error);
    res.status(500).json({ message: 'Failed to reject PR', error: error.message });
  } finally {
    client.release();
  }
});

// Convert PR to PO
router.post('/requisitions/:id/convert-to-po', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { vendor_id, po_document_type_id, delivery_date, payment_terms, notes } = req.body;

    if (!vendor_id) {
      return res.status(400).json({ message: 'Vendor is required' });
    }

    if (!po_document_type_id) {
      return res.status(400).json({ message: 'PO Document Type is required' });
    }

    await client.query('BEGIN');

    // Check if PR exists and is approved
    const prCheck = await client.query(
      'SELECT * FROM purchase_requisitions WHERE id = $1',
      [id]
    );

    if (prCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase requisition not found' });
    }

    const pr = prCheck.rows[0];

    if (pr.approval_status !== 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only approved requisitions can be converted to PO' });
    }

    if (pr.converted_to_po_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This requisition has already been converted to PO' });
    }

    // Get vendor info
    const vendorCheck = await client.query('SELECT * FROM vendors WHERE id = $1', [vendor_id]);
    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const vendor = vendorCheck.rows[0];

    // Fetch PO Document Type and its number range
    const poTypeResult = await client.query(`
      SELECT 
        pdt.*,
        nr.id as number_range_id,
        nr.number_range_code,
        nr.description as number_range_description,
        nr.range_from,
        nr.range_to,
        nr.current_number
      FROM po_document_types pdt
      LEFT JOIN number_ranges nr ON pdt.number_range_id = nr.id
      WHERE pdt.id = $1 AND pdt.is_active = true
    `, [po_document_type_id]);

    if (poTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'PO Document Type not found or inactive'
      });
    }

    const poType = poTypeResult.rows[0];

    // Validate number range is assigned
    if (!poType.number_range_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `PO Document Type '${poType.code}' does not have a number range assigned. Please configure in master data.`
      });
    }

    // Generate PO number from number range
    const currentNumInt = parseInt(poType.current_number || poType.range_from);
    const rangeToInt = parseInt(poType.range_to);

    // Check if range is exhausted
    if (currentNumInt > rangeToInt) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Number range '${poType.number_range_code}' is exhausted. Please extend the range in master data.`
      });
    }

    // Calculate padding from range_to length
    const paddingLength = poType.range_to.length;
    const order_number = currentNumInt.toString().padStart(paddingLength, '0');

    // Update number range's current_number
    const nextNumber = (currentNumInt + 1).toString().padStart(paddingLength, '0');
    await client.query(`
      UPDATE number_ranges 
      SET current_number = $1, updated_at = NOW()
      WHERE id = $2
    `, [nextNumber, poType.number_range_id]);

    console.log(`Generated PO Number: ${order_number} from range ${poType.number_range_code} (Type: ${poType.code})`);

    // Generate PO number - REMOVED HARDCODED LOGIC

    // Fetch PR items FIRST to calculate total logic
    const prItems = await client.query(`
      SELECT 
        pri.*,
        m.code as material_code_ref,
        m.name as material_name_ref,
        sl.code as storage_location_code,
        sl.name as storage_location_name,
        pgrp.group_code as purchasing_group_code,
        pgrp.group_name as purchasing_group_name,
        porg.org_code as purchasing_org_code,
        porg.org_name as purchasing_org_name,
        cc.cost_center,
        cc.description as cost_center_description,
        p.code as plant_code_ref,
        p.name as plant_name
      FROM purchase_requisition_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
      LEFT JOIN storage_locations sl ON pri.storage_location_id = sl.id
      LEFT JOIN purchasing_groups pgrp ON pri.purchasing_group_id = pgrp.id
      LEFT JOIN purchasing_organizations porg ON pri.purchasing_organization_id = porg.id
      LEFT JOIN cost_centers cc ON pri.cost_center_id = cc.id
      LEFT JOIN plants p ON pri.plant_id = p.id
      WHERE pri.requisition_id = $1
      ORDER BY pri.line_number
    `, [id]);

    // Calculate total amount from items
    const calculatedTotal = prItems.rows.reduce((sum, item) => {
      const price = parseFloat(item.estimated_total_price) || parseFloat(item.total_price) || 0;
      return sum + price;
    }, 0);

    // Get vendor details for company_code_id
    const vendorResult = await client.query(
      'SELECT company_code_id, purchase_organization_id FROM vendors WHERE id = $1',
      [vendor_id]
    );
    const vendorDetails = vendorResult.rows[0] || {};

    // Create PO with po_document_type_id
    const poResult = await client.query(`
      INSERT INTO purchase_orders (
        order_number,
        vendor_id,
        po_document_type_id,
        order_date,
        delivery_date,
        currency,
        total_amount,
        status,
        payment_terms,
        notes,
        created_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, 'DRAFT', $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      order_number,
      vendor_id,
      po_document_type_id,
      delivery_date || null,
      pr.currency_code || 'USD',
      calculatedTotal,
      payment_terms || 'NET30',
      notes || `Converted from PR ${pr.requisition_number}`
    ]);

    const po = poResult.rows[0];

    // Prepare PO header updates from PR items and vendor
    const updates = [];
    const updateValues = [po.id];
    let paramIndex = 2;

    // Plant ID from first PR item
    if (prItems.rows.length > 0 && prItems.rows[0].plant_id) {
      updates.push(`plant_id = $${paramIndex}`);
      updateValues.push(prItems.rows[0].plant_id);
      paramIndex++;
      console.log(`[PR to PO] Will set plant_id ${prItems.rows[0].plant_id}`);
    }

    // Company Code ID from vendor
    if (vendorDetails.company_code_id) {
      updates.push(`company_code_id = $${paramIndex}`);
      updateValues.push(vendor.company_code_id);
      paramIndex++;
      console.log(`[PR to PO] Will set company_code_id ${vendor.company_code_id} from vendor`);
    }

    // Purchase Organization ID from first PR item (takes precedence over vendor)
    const purchOrgId = (prItems.rows.length > 0 && prItems.rows[0].purchasing_organization_id)
      ? prItems.rows[0].purchasing_organization_id
      : vendorDetails.purchase_organization_id;

    if (purchOrgId) {
      updates.push(`purchase_organization_id = $${paramIndex}`);
      updateValues.push(purchOrgId);
      paramIndex++;
      console.log(`[PR to PO] Will set purchase_organization_id ${purchOrgId}`);
    }

    // Try to get warehouse_type_id from plant
    if (prItems.rows.length > 0 && prItems.rows[0].plant_id) {
      const warehouseResult = await client.query(`
        SELECT id FROM warehouse_types 
        WHERE plant_id = $1 
        ORDER BY id 
        LIMIT 1
      `, [prItems.rows[0].plant_id]);

      if (warehouseResult.rows.length > 0) {
        updates.push(`warehouse_type_id = $${paramIndex}`);
        updateValues.push(warehouseResult.rows[0].id);
        paramIndex++;
        console.log(`[PR to PO] Will set warehouse_type_id ${warehouseResult.rows[0].id}`);
      }
    }

    // Execute update if we have any updates to make
    if (updates.length > 0) {
      await client.query(`
        UPDATE purchase_orders 
        SET ${updates.join(', ')}
        WHERE id = $1
      `, updateValues);
      console.log(`[PR to PO] Updated PO ${po.id} with ${updates.length} fields`);
    }

    // Fetch vendor-specific pricing for materials
    // This allows PO to use vendor prices instead of PR estimated prices
    console.log(`[PR to PO] Fetching vendor-specific pricing for vendor ID ${vendor_id}...`);
    const vendorMaterialsResult = await client.query(`
      SELECT 
        vm.material_id,
        vm.unit_price as vendor_unit_price,
        vm.currency as vendor_currency,
        vm.lead_time_days,
        vm.minimum_order_quantity
      FROM vendor_materials vm
      WHERE vm.vendor_id = $1 
        AND vm.is_active = true
        AND (vm.valid_from IS NULL OR DATE(vm.valid_from) <= CURRENT_DATE)
        AND (vm.valid_to IS NULL OR DATE(vm.valid_to) >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM source_lists sl 
          WHERE sl.material_id = vm.material_id 
          AND sl.vendor_id = vm.vendor_id 
          AND sl.is_blocked = true 
          AND sl.is_active = true 
          AND CURRENT_DATE BETWEEN sl.valid_from AND sl.valid_to
        )
    `, [vendor_id]);

    // Create a map of material_id -> vendor pricing for quick lookup
    const vendorPricingMap = {};
    vendorMaterialsResult.rows.forEach(row => {
      vendorPricingMap[row.material_id] = {
        unitPrice: parseFloat(row.vendor_unit_price) || null,
        currency: row.vendor_currency,
        leadTimeDays: row.lead_time_days,
        minimumOrderQuantity: row.minimum_order_quantity
      };
    });
    console.log(`[PR to PO] Found vendor pricing for ${vendorMaterialsResult.rows.length} materials`);

    // Track actual total for PO header update
    let actualPoTotal = 0;

    // Insert PO items with vendor-specific pricing (if available) or PR prices (fallback)
    let currentLineNumber = 10;
    for (const item of prItems.rows) {
      // Check if vendor has specific pricing for this material
      const vendorPricing = item.material_id ? vendorPricingMap[item.material_id] : null;

      let unitPrice = item.estimated_unit_price || 0;
      let totalPrice = item.estimated_total_price || item.total_price || 0;
      let priceSource = 'PR';

      if (vendorPricing && vendorPricing.unitPrice) {
        // Use vendor-specific price
        unitPrice = vendorPricing.unitPrice;
        totalPrice = unitPrice * (item.quantity || 0);
        priceSource = 'Vendor';
        console.log(`[PR to PO] Using vendor price for material ${item.material_id}: ${unitPrice} (source: vendor_materials)`);
      } else {
        console.log(`[PR to PO] Using PR price for material ${item.material_id}: ${unitPrice} (source: PR, no vendor price available)`);
      }

      // Add to actual PO total
      actualPoTotal += totalPrice;

      await client.query(`
        INSERT INTO purchase_order_items (
          purchase_order_id,
          line_number,
          material_id,
          material_code,
          description,
          quantity,
          unit_price,
          unit_of_measure,
          total_price,
          active,
          plant_id,
          storage_location_id,
          delivery_date,
          cost_center_id,
          purchasing_organization_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        po.id,
        String(currentLineNumber),
        item.material_id,
        item.material_code_ref || item.material_code,
        item.description,
        item.quantity,
        unitPrice,  // Now uses vendor price if available
        item.unit_of_measure || 'EA',
        totalPrice,  // Recalculated with vendor price
        true,  // active
        item.plant_id || null,
        item.storage_location_id || null,
        item.required_date || delivery_date || null,  // Use PR item delivery date or PO header delivery date
        item.cost_center_id || null,
        item.purchasing_organization_id || null
      ]);

      currentLineNumber += 10;
    }

    // Update PO total_amount with actual total based on vendor prices
    console.log(`[PR to PO] Updating PO total from ${calculatedTotal} (PR price) to ${actualPoTotal} (with vendor prices)`);
    await client.query(`
      UPDATE purchase_orders
      SET total_amount = $1
      WHERE id = $2
    `, [actualPoTotal, po.id]);

    // Update PR with PO link
    await client.query(`
      UPDATE purchase_requisitions
      SET 
        status = 'CONVERTED_TO_PO',
        converted_to_po_id = $1
      WHERE id = $2
    `, [po.id, id]);

    // Insert history record
    await client.query(`
      INSERT INTO pr_history (
        pr_id, action, performed_by, old_status, new_status, comments
      ) VALUES ($1, 'CONVERTED', $2, 'APPROVED', 'CONVERTED_TO_PO', $3)
    `, [id, 'SYSTEM', `Converted to PO ${order_number}`]);

    await client.query('COMMIT');

    res.json({
      message: 'Purchase requisition converted to PO successfully',
      po: {
        id: po.id,
        order_number: po.order_number,
        vendor_name: vendor.name
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error converting PR to PO:', error);
    res.status(500).json({ message: 'Failed to convert PR to PO', error: error.message });
  } finally {
    client.release();
  }
});



// Get all goods receipts
router.get('/receipts', async (req, res) => {
  try {
    // Check if goods_receipts table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts'
      );
    `);

    if (!tableCheckResult.rows[0].exists) {
      return res.json([]);
    }

    // Check if new columns exist first
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'goods_receipts'
      AND column_name IN ('ordered_quantity', 'po_item_id', 'expected_delivery_date', 'remaining_quantity')
    `);

    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasOrderedQuantity = existingColumns.includes('ordered_quantity');
    const hasPoItemId = existingColumns.includes('po_item_id');
    const hasExpectedDeliveryDate = existingColumns.includes('expected_delivery_date');
    const hasRemainingQuantity = existingColumns.includes('remaining_quantity');

    // Build SELECT query with conditional columns
    const optionalColumns = [];
    if (hasOrderedQuantity) optionalColumns.push('gr.ordered_quantity');
    if (hasPoItemId) optionalColumns.push('gr.po_item_id');
    if (hasExpectedDeliveryDate) optionalColumns.push('gr.expected_delivery_date');
    if (hasRemainingQuantity) optionalColumns.push('gr.remaining_quantity');

    // Build the SELECT clause with proper comma handling
    const optionalColumnsClause = optionalColumns.length > 0
      ? optionalColumns.join(', ') + ', '
      : '';

    // Build optional WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by PO ID if provided
    if (req.query.po_id) {
      conditions.push(`gr.purchase_order_id = $${paramIndex}`);
      params.push(req.query.po_id);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await pool.query(`
      SELECT 
        gr.id,
        gr.receipt_number,
        gr.grn_number,
        gr.material_code,
        gr.quantity,
        gr.unit_price,
        gr.total_value,
        gr.receipt_date,
        gr.status,
        gr.vendor_code,
        gr.reference_document,
        gr.purchase_order_id,
        gr.posted,
        gr.posted_date,
        gr.delivery_note,
        gr.bill_of_lading,
        ${optionalColumnsClause}
        po.order_number,
        v.name as vendor_name,
        v.code as vendor_code_from_vendor
      FROM goods_receipts gr
      LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
      LEFT JOIN vendors v ON (po.vendor_id = v.id OR v.code = gr.vendor_code)
      ${whereClause}
      ORDER BY gr.receipt_date DESC, gr.id DESC
    `, params);

    // Map database fields to frontend expected format
    const mappedReceipts = result.rows.map(receipt => ({
      id: receipt.id,
      receipt_number: receipt.receipt_number || receipt.grn_number || `GR-${receipt.id}`,
      po_number: receipt.order_number || receipt.reference_document || null,
      vendor_name: receipt.vendor_name || null,
      receipt_date: receipt.receipt_date ? new Date(receipt.receipt_date).toISOString() : new Date().toISOString(),
      status: receipt.status || 'PENDING',
      delivery_note: receipt.delivery_note || null,
      bill_of_lading: receipt.bill_of_lading || null,
      ordered_quantity: hasOrderedQuantity ? (receipt.ordered_quantity || null) : null,
      received_quantity: receipt.quantity || null,
      remaining_quantity: hasRemainingQuantity ? (receipt.remaining_quantity || null) : null,
      expected_delivery_date: hasExpectedDeliveryDate && receipt.expected_delivery_date
        ? new Date(receipt.expected_delivery_date).toISOString()
        : null
    }));

    res.json(mappedReceipts);
  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    res.status(500).json({
      message: 'Failed to fetch goods receipts',
      error: error.message
    });
  }
});

// Get vendors filtered by material IDs (for PR to PO conversion)
router.get('/vendors/by-materials', async (req, res) => {
  try {
    const { materialIds } = req.query;

    if (!materialIds) {
      return res.status(400).json({ message: 'materialIds query parameter is required' });
    }

    // Parse comma-separated material IDs
    const materialIdArray = materialIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (materialIdArray.length === 0) {
      return res.status(400).json({ message: 'Valid material IDs are required' });
    }

    console.log(`🔍 Filtering vendors for materials: ${materialIdArray.join(', ')}`);

    // Query to get vendors who supply ANY of the requested materials
    const vendorQuery = await pool.query(`
      SELECT DISTINCT
        v.id,
        v.code,
        v.name,
        v.email,
        v.phone,
        v.address,
        v.city,
        v.country,
        v.payment_terms,
        v.currency,
        COUNT(DISTINCT vm.material_id) as materials_count,
        MAX(vm.is_preferred::int) as has_preferred_materials
      FROM vendors v
      INNER JOIN vendor_materials vm ON v.id = vm.vendor_id
      WHERE vm.material_id = ANY($1)
        AND vm.is_active = true
        AND (vm.valid_from IS NULL OR DATE(vm.valid_from) <= CURRENT_DATE)
        AND (vm.valid_to IS NULL OR DATE(vm.valid_to) >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM source_lists sl 
          WHERE sl.material_id = vm.material_id 
          AND sl.vendor_id = vm.vendor_id 
          AND sl.is_blocked = true 
          AND sl.is_active = true 
          AND CURRENT_DATE BETWEEN sl.valid_from AND sl.valid_to
        )
      GROUP BY v.id, v.code, v.name, v.email, v.phone, v.address, v.city, v.country, v.payment_terms, v.currency
      ORDER BY materials_count DESC, has_preferred_materials DESC, v.name
    `, [materialIdArray]);

    // For each vendor, get the material-specific details
    const vendorsWithMaterials = await Promise.all(
      vendorQuery.rows.map(async (vendor) => {
        const materialDetailsQuery = await pool.query(`
          SELECT 
            vm.id as vendor_material_id,
            vm.material_id,
            m.code as material_code,
            m.name as material_name,
            m.description as material_description,
            vm.vendor_material_code,
            vm.unit_price,
            vm.currency,
            vm.minimum_order_quantity,
            vm.lead_time_days,
            vm.is_preferred,
            vm.notes
          FROM vendor_materials vm
          INNER JOIN materials m ON vm.material_id = m.id
          WHERE vm.vendor_id = $1
            AND vm.material_id = ANY($2)
            AND vm.is_active = true
            AND (vm.valid_from IS NULL OR DATE(vm.valid_from) <= CURRENT_DATE)
            AND (vm.valid_to IS NULL OR DATE(vm.valid_to) >= CURRENT_DATE)
            AND NOT EXISTS (
              SELECT 1 FROM source_lists sl 
              WHERE sl.material_id = vm.material_id 
              AND sl.vendor_id = vm.vendor_id 
              AND sl.is_blocked = true 
              AND sl.is_active = true 
              AND CURRENT_DATE BETWEEN sl.valid_from AND sl.valid_to
            )
          ORDER BY vm.is_preferred DESC, m.code
        `, [vendor.id, materialIdArray]);

        return {
          ...vendor,
          materials: materialDetailsQuery.rows,
          total_materials_matched: materialDetailsQuery.rows.length,
          coverage_percentage: ((materialDetailsQuery.rows.length / materialIdArray.length) * 100).toFixed(1)
        };
      })
    );

    console.log(`✅ Found ${vendorsWithMaterials.length} vendors matching materials`);

    res.json({
      vendors: vendorsWithMaterials,
      requestedMaterialCount: materialIdArray.length,
      summary: {
        total_vendors: vendorsWithMaterials.length,
        vendors_with_100_percent_coverage: vendorsWithMaterials.filter(v => v.coverage_percentage === '100.0').length,
        vendors_with_preferred_materials: vendorsWithMaterials.filter(v => v.has_preferred_materials > 0).length
      }
    });

  } catch (error) {
    console.error('Error filtering vendors by materials:', error);
    res.status(500).json({
      message: 'Failed to filter vendors by materials',
      error: error.message
    });
  }
});

// UPDATE Purchase Requisition
router.put('/requisitions/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      required_date,
      priority,
      justification,
      department,
      project_code,
      notes,
      items = []
    } = req.body;

    // Check if PR exists
    const prCheck = await client.query(
      'SELECT id, status, approval_status FROM purchase_requisitions WHERE id = $1',
      [id]
    );

    if (prCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase requisition not found' });
    }

    const currentPR = prCheck.rows[0];

    // Only allow editing of DRAFT or REJECTED PRs
    if (currentPR.approval_status !== 'DRAFT' && currentPR.approval_status !== 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot edit PR with status: ${currentPR.approval_status}. Only DRAFT or REJECTED PRs can be edited.`
      });
    }

    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + (item.estimated_total_price || 0), 0);

    // Update PR header
    await client.query(`
      UPDATE purchase_requisitions
      SET
        priority = $1,
        justification = $2,
        department = $3,
        project_code = $4,
        notes = $5,
        total_value = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      priority || 'MEDIUM',
      justification,
      department || null,
      project_code || null,
      notes || null,
      totalValue,
      id
    ]);

    // Delete existing items
    await client.query('DELETE FROM purchase_requisition_items WHERE requisition_id = $1', [id]);

    // Insert updated items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      await client.query(`
        INSERT INTO purchase_requisition_items (
          requisition_id,
          line_number,
          material_id,
          material_code,
          material_name,
          material_number,
          description,
          quantity,
          unit_of_measure,
          unit_price,
          total_price,
          required_date,
          material_group,
          material_group_id,
          storage_location,
          storage_location_id,
          purchasing_group,
          purchasing_group_id,
          purchasing_org,
          purchasing_organization_id,
          cost_center,
          cost_center_id,
          plant_id,
          plant_code,
          estimated_unit_price,
          estimated_total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      `, [
        id,
        i + 1,
        item.material_id ? parseInt(item.material_id) : null,
        item.material_code || item.material || null,
        item.material_name || item.description || null,
        item.material_number || item.material_code || null,
        item.description || null,
        item.quantity,
        item.unit_of_measure || item.uom || 'EA',
        item.estimated_unit_price || item.unit_price || 0,
        item.estimated_total_price || item.total_price || 0,
        item.required_date || required_date,
        item.material_group || item.matl_group || null,
        item.material_group_id || null,
        item.storage_location || item.storage_loc || null,
        item.storage_location_id || null,
        item.purchasing_group || item.purch_group || null,
        item.purchasing_group_id || null,
        item.purchasing_org || item.purch_org || null,
        item.purchasing_organization_id || null,
        item.cost_center || null,
        item.cost_center_id || null,
        item.plant_id || null,
        item.plant_code || null,
        item.estimated_unit_price || 0,
        item.estimated_total_price || 0
      ]);
    }

    await client.query('COMMIT');

    console.log(`✅ Purchase requisition updated: PR #${id}`);

    res.json({
      message: 'Purchase requisition updated successfully',
      id: parseInt(id)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating purchase requisition:', error);
    res.status(500).json({
      message: 'Failed to update purchase requisition',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// DELETE Purchase Requisition
router.delete('/requisitions/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if PR exists
    const prCheck = await client.query(
      'SELECT id, requisition_number, approval_status, converted_to_po_id FROM purchase_requisitions WHERE id = $1',
      [id]
    );

    if (prCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase requisition not found' });
    }

    const pr = prCheck.rows[0];

    // Prevent deletion of approved or converted PRs
    if (pr.approval_status === 'APPROVED' || pr.converted_to_po_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot delete PR with status: ${pr.approval_status}. ${pr.converted_to_po_id ? 'PR has been converted to PO.' : ''}`
      });
    }

    // Delete items first (foreign key constraint)
    await client.query('DELETE FROM purchase_requisition_items WHERE requisition_id = $1', [id]);

    // Delete history
    await client.query('DELETE FROM pr_history WHERE pr_id = $1', [id]).catch(() => {
      // Table might not exist, ignore error
    });

    // Delete PR
    await client.query('DELETE FROM purchase_requisitions WHERE id = $1', [id]);

    await client.query('COMMIT');

    console.log(`✅ Purchase requisition deleted: ${pr.requisition_number}`);

    res.json({
      message: 'Purchase requisition deleted successfully',
      deletedNumber: pr.requisition_number
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting purchase requisition:', error);
    res.status(500).json({
      message: 'Failed to delete purchase requisition',
      error: error.message
    });
  } finally {
    client.release();
  }
});



export default router;




