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
            // Table might not exist
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
