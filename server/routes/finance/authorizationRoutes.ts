import express from 'express';
import { pool } from '../../db';

const router = express.Router();

/**
 * GET /api/ap/authorization/levels
 * Get all authorization levels
 */
router.get('/levels', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        level_name,
        level_order,
        min_amount,
        max_amount,
        requires_dual_approval,
        created_at,
        updated_at
      FROM payment_authorization_levels
      ORDER BY level_order
    `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching authorization levels:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch authorization levels'
        });
    }
});

/**
 * PUT /api/ap/authorization/levels/:id
 * Update an authorization level
 */
router.put('/levels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { level_name, min_amount, max_amount, requires_dual_approval } = req.body;

        const result = await pool.query(`
      UPDATE payment_authorization_levels
      SET 
        level_name = $1,
        min_amount = $2,
        max_amount = $3,
        requires_dual_approval = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [level_name, min_amount, max_amount, requires_dual_approval, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Authorization level not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error updating authorization level:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update authorization level'
        });
    }
});

/**
 * GET /api/ap/authorization/users
 * Get all users with their authorization limits
 */
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        ual.id,
        ual.user_id,
        ual.role,
        ual.daily_limit,
        ual.single_payment_limit,
        ual.dual_approval_threshold,
        ual.company_code_id,
        ual.created_at,
        ual.updated_at,
        cc.name as company_code_name,
        CONCAT(su.first_name, ' ', su.last_name) as user_name,
        su.email as user_email
      FROM user_authorization_limits ual
      LEFT JOIN company_codes cc ON ual.company_code_id = cc.id
      LEFT JOIN system_users su ON CAST(ual.user_id AS TEXT) = su.id
      ORDER BY ual.role, ual.user_id
    `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching user authorization limits:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch user authorization limits'
        });
    }
});

/**
 * POST /api/ap/authorization/users
 * Create user authorization limits
 */
router.post('/users', async (req, res) => {
    try {
        const {
            user_id,
            role,
            daily_limit,
            single_payment_limit,
            dual_approval_threshold,
            company_code_id
        } = req.body;

        // Validate required fields
        if (!user_id || !role || !daily_limit || !single_payment_limit || !dual_approval_threshold) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Check if user already has authorization limits for this company
        const existing = await pool.query(`
      SELECT id FROM user_authorization_limits
      WHERE user_id = $1 AND company_code_id = $2
    `, [user_id, company_code_id || null]);

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User already has authorization limits for this company. Use update instead.'
            });
        }

        const result = await pool.query(`
      INSERT INTO user_authorization_limits (
        user_id, role, daily_limit, single_payment_limit,
        dual_approval_threshold, company_code_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [user_id, role, daily_limit, single_payment_limit, dual_approval_threshold, company_code_id || null]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error creating user authorization limits:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create user authorization limits'
        });
    }
});

/**
 * PUT /api/ap/authorization/users/:id
 * Update user authorization limits
 */
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            role,
            daily_limit,
            single_payment_limit,
            dual_approval_threshold
        } = req.body;

        const result = await pool.query(`
      UPDATE user_authorization_limits
      SET 
        role = $1,
        daily_limit = $2,
        single_payment_limit = $3,
        dual_approval_threshold = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [role, daily_limit, single_payment_limit, dual_approval_threshold, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User authorization limit not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error updating user authorization limits:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update user authorization limits'
        });
    }
});

/**
 * DELETE /api/ap/authorization/users/:id
 * Soft delete user authorization limits
 */
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      DELETE FROM user_authorization_limits
      WHERE id = $1
      RETURNING *
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User authorization limit not found'
            });
        }

        res.json({
            success: true,
            message: 'User authorization limit deactivated successfully'
        });
    } catch (error: any) {
        console.error('Error deleting user authorization limits:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete user authorization limits'
        });
    }
});

/**
 * GET /api/ap/authorization/usage/:userId
 * Get daily authorization usage for a user
 */
router.get('/usage/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(`
      SELECT 
        dat.user_id,
        dat.authorization_date,
        dat.total_authorized,
        dat.payment_count,
        ual.daily_limit,
        ual.single_payment_limit,
        (ual.daily_limit - COALESCE(dat.total_authorized, 0)) as remaining_limit
      FROM user_authorization_limits ual
      LEFT JOIN daily_authorization_tracking dat 
        ON ual.user_id = dat.user_id 
        AND dat.authorization_date = $2
      WHERE ual.user_id = $1
      LIMIT 1
    `, [userId, today]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found or has no authorization limits'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error fetching authorization usage:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch authorization usage'
        });
    }
});

/**
 * GET /api/ap/authorization/available-users
 * Get users who don't have authorization limits yet
 */
router.get('/available-users', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        su.id,
        CONCAT(su.first_name, ' ', su.last_name) as name,
        su.email,
        su.username
      FROM system_users su
      WHERE su.is_active = 'true'
        AND NOT EXISTS (
          SELECT 1 FROM user_authorization_limits ual
          WHERE CAST(ual.user_id AS TEXT) = su.id
        )
      ORDER BY su.first_name, su.last_name
    `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching available employees:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch available employees'
        });
    }
});

export default router;
