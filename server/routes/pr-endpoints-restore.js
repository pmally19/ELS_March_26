// Get single PR with details
router.get('/requisitions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        pr.*,
        cc.cost_center,
        cc.description as cost_center_description
      FROM purchase_requisitions pr
      LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
      WHERE pr.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Purchase requisition not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching PR details:', error);
        res.status(500).json({ message: 'Failed to fetch PR details', error: error.message });
    }
});

// Get PR line items
router.get('/requisitions/:id/items', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        pri.id,
        pri.line_number,
        pri.material_id,
        m.code as material_code,
        m.name as material_name,
        m.description,
        m.base_uom as unit_of_measure,
        pri.quantity,
        pri.unit_price as estimated_unit_price,
        pri.total_price as estimated_total_price,
        pri.required_date
      FROM purchase_requisition_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
      WHERE pri.requisition_id = $1
      ORDER BY pri.line_number
    `, [id]);

        // Convert numeric strings to numbers
        const items = result.rows.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity),
            estimated_unit_price: parseFloat(item.estimated_unit_price) || 0,
            estimated_total_price: parseFloat(item.estimated_total_price) || 0,
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
        const { vendor_id, delivery_date, payment_terms, notes } = req.body;

        if (!vendor_id) {
            return res.status(400).json({ message: 'Vendor is required' });
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

        // Generate PO number
        const poNumResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1 as next_num
      FROM purchase_orders
      WHERE order_number LIKE 'PO-2026-%'
    `);
        const order_number = `PO-2026-${poNumResult.rows[0].next_num.toString().padStart(5, '0')}`;

        // Create PO
        const poResult = await client.query(`
      INSERT INTO purchase_orders (
        order_number,
        vendor_id,
        order_date,
        delivery_date,
        currency,
        total_amount,
        status,
        payment_terms,
        notes,
        created_at
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'DRAFT', $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
            order_number,
            vendor_id,
            delivery_date || null,
            pr.currency_code || 'USD',
            pr.total_value || 0,
            payment_terms || 'NET30',
            notes || `Converted from PR ${pr.requisition_number}`
        ]);

        const po = poResult.rows[0];

        // Copy items from PR to PO
        const prItems = await client.query(
            'SELECT * FROM purchase_requisition_items WHERE requisition_id = $1 ORDER BY line_number',
            [id]
        );

        for (const item of prItems.rows) {
            // lookup storage location id if storage_location code is present
            let storageLocationId = null;
            if (item.storage_location) {
                try {
                    // Try to find storage location by code and plant_id
                    let slQuery = 'SELECT id FROM storage_locations WHERE code = $1';
                    let slParams = [item.storage_location];

                    if (item.plant_id) {
                        slQuery += ' AND plant_id = $2';
                        slParams.push(item.plant_id);
                    }

                    const slResult = await client.query(slQuery, slParams);
                    if (slResult.rows.length > 0) {
                        storageLocationId = slResult.rows[0].id;
                    } else {
                        // Fallback: search by code only if plant-specific search failed
                        if (item.plant_id) {
                            const slResultFallback = await client.query('SELECT id FROM storage_locations WHERE code = $1 LIMIT 1', [item.storage_location]);
                            if (slResultFallback.rows.length > 0) {
                                storageLocationId = slResultFallback.rows[0].id;
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to resolve storage location code ${item.storage_location}`, e);
                }
            }

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
          plant_id,
          storage_location_id,
          active,
          received_quantity,
          invoiced_quantity,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
                po.id,
                item.line_number,
                item.material_id,
                item.material_code,
                item.description,
                item.quantity,
                item.unit_price || 0,
                item.unit_of_measure || 'EA',
                item.total_price || 0,
                item.plant_id || null,
                storageLocationId,
                true, // active
                0,    // received_quantity
                0,    // invoiced_quantity
                'OPEN' // status
            ]);
        }

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

