import { Router } from 'express';
import { pool } from '../../db';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI for RoleAgent
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// RoleAgent chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, context, chatHistory } = req.body;

    // Get current system state for context
    const systemContext = await getRoleSystemContext();
    
    // Prepare context for AI
    const contextualInfo = await prepareContextualInfo(context, systemContext);
    
    // Build conversation history for OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are RoleAgent, a specialized AI assistant for managing user roles, permissions, and authorization in MallyERP system.

CRITICAL RULES:
- NEVER use SAP terminology - use MallyERP business language only
- You are the KING of roles and permissions with FULL ACCESS to all system tiles
- Provide specific, data-driven responses using actual system information
- When users ask about specific tiles or screens, suggest navigation to those areas
- Give detailed tile-level information and granular access details

CURRENT SYSTEM DATA:
${JSON.stringify(contextualInfo, null, 2)}

YOUR KING-LEVEL CAPABILITIES:
✓ FULL ACCESS to all ${contextualInfo?.totalTiles || 0} system tiles (${contextualInfo?.totalPermissions || 0} permissions) with granular details
✓ Complete authority over ${contextualInfo?.totalUsers || 0} users and ${contextualInfo?.totalRoles || 0} roles management
✓ Deep permission analysis with ${contextualInfo?.grantedPermissions || 0} active permissions
✓ System-wide authorization oversight across all modules: ${Object.keys(contextualInfo?.tilesByModule || {}).join(', ')}
✓ Tile navigation and screen access recommendations with direct routing
✓ Granular permission matrix analysis and optimization
✓ Real-time role hierarchy and access control management

RESPONSE GUIDELINES:
- Use actual system data: ${contextualInfo?.totalUsers || 0} users, ${contextualInfo?.totalRoles || 0} roles, ${contextualInfo?.grantedPermissions || 0} active permissions
- When users ask about specific functionality, suggest navigating to relevant tiles/screens
- Provide tile IDs, routes, and specific access paths when relevant
- Reference exact permission counts and role assignments
- Offer to guide users to specific system areas for detailed work
- Be authoritative yet helpful as the system's permission authority

SCREEN NAVIGATION CAPABILITIES:
- Can recommend specific tile access: "Navigate to MD001 - Company Codes"
- Can suggest role management screens: "Check role permissions in Admin → Roles & Permissions"
- Can direct to user management: "Go to Admin → Users for user creation"
- Can reference specific business function tiles by ID and route

EXAMPLES:
- "Show permissions for Finance" → List FI001-FI020 tiles with specific access details
- "How to access Master Data?" → "Navigate to MD001-MD049 tiles in Master Data section"
- "User role issues" → "Go to Admin → Users to check role assignments and tile access"
- "users" - show user assignments and role mapping
- "permissions" - explain tile-level access control
- "access" - troubleshoot authorization issues
- "assign" - guide through user-role assignment process`
      },
      // Include recent chat history for context
      ...chatHistory.slice(-3).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Get AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;

    // Analyze response for actions
    const responseAnalysis = analyzeResponseForActions(aiResponse, message);

    // Execute any suggested actions
    let actionResults = null;
    if (responseAnalysis.suggestedActions.length > 0) {
      actionResults = await executeRoleActions(responseAnalysis.suggestedActions);
    }

    // Send properly formatted response with navigation capabilities
    res.json({
      message: aiResponse || "I can help you manage user roles, permissions, and authorization settings. What would you like to know?",
      context: {
        suggestedView: responseAnalysis?.suggestedView,
        navigationSuggestion: responseAnalysis?.navigationSuggestion,
        dataChanged: actionResults?.dataChanged || false,
        changeDescription: actionResults?.description,
        systemContext: contextualInfo,
        kingAccess: true // RoleAgent has full system access
      }
    });

  } catch (error) {
    console.error('RoleAgent chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: 'I encountered an error processing your request. Please try again or contact support.'
    });
  }
});

// Get role system context
async function getRoleSystemContext() {
  try {
    const [rolesResult, usersResult, permissionsResult, tilesResult] = await Promise.all([
      pool.query(`
        SELECT 
          r.id, r.role_name, r.role_description as description,
          COUNT(DISTINCT rtp.id) as permissions_count,
          COUNT(DISTINCT su.id) as users_count
        FROM user_roles r
        LEFT JOIN role_tile_permissions rtp ON r.id = rtp.role_id
        LEFT JOIN system_users su ON r.id = su.role_id
        GROUP BY r.id, r.role_name, r.role_description
        ORDER BY r.role_name
      `),
      pool.query(`
        SELECT 
          su.id, su.username, su.email, su.is_active,
          ur.role_name
        FROM system_users su
        LEFT JOIN user_roles ur ON su.role_id = ur.id
        ORDER BY su.username
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_permissions,
          COUNT(CASE WHEN is_granted = true THEN 1 END) as granted_permissions,
          COUNT(DISTINCT role_id) as roles_with_permissions,
          COUNT(DISTINCT tile_id) as tiles_with_permissions
        FROM role_tile_permissions
      `),
      pool.query(`
        SELECT 
          t.tile_number as tile_id, t.tile_name, t.tile_category, 
          t.module_code as module_group, t.route_path, t.is_active
        FROM tile_registry t
        WHERE t.is_active = true
        ORDER BY t.module_code, t.tile_number
      `)
    ]);

    return {
      totalRoles: rolesResult.rows.length,
      totalUsers: usersResult.rows.length,
      totalPermissions: permissionsResult.rows[0]?.total_permissions || 0,
      totalTiles: tilesResult.rows.length,
      grantedPermissions: permissionsResult.rows[0]?.granted_permissions || 0,
      roles: rolesResult.rows.map(role => ({
        id: role.id,
        name: role.role_name,
        description: role.description,
        permissionsCount: parseInt(role.permissions_count) || 0,
        usersCount: parseInt(role.users_count) || 0
      })),
      users: usersResult.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        roleName: user.role_name,
        isActive: user.is_active
      })),
      systemTiles: tilesResult.rows.map(tile => ({
        tileId: tile.tile_id,
        tileName: tile.tile_name,
        category: tile.tile_category,
        module: tile.module_group,
        route: tile.route_path,
        isActive: tile.is_active
      })),
      tilesByModule: tilesResult.rows.reduce((acc, tile) => {
        if (!acc[tile.module_group]) acc[tile.module_group] = [];
        acc[tile.module_group].push({
          id: tile.tile_id,
          name: tile.tile_name,
          route: tile.route_path
        });
        return acc;
      }, {}),
      permissionsOverview: permissionsResult.rows[0],
      systemStatus: 'operational'
    };
  } catch (error) {
    console.error('Error getting system context:', error);
    return {
      roles: [],
      users: [],
      permissionsOverview: { total_permissions: 0, granted_permissions: 0 },
      systemStatus: 'error'
    };
  }
}

// Prepare contextual information based on current view
async function prepareContextualInfo(context: string, systemContext: any) {
  let contextualInfo = {
    currentView: context,
    ...systemContext
  };

  if (context.startsWith('role-')) {
    const roleId = context.split('-')[1];
    try {
      const roleDetails = await pool.query(`
        SELECT 
          r.*,
          COUNT(DISTINCT rtp.id) as permissions_count,
          COUNT(DISTINCT su.id) as users_count,
          array_agg(DISTINCT rtp.tile_id) FILTER (WHERE rtp.tile_id IS NOT NULL) as tile_permissions
        FROM user_roles r
        LEFT JOIN role_tile_permissions rtp ON r.id = rtp.role_id AND rtp.is_granted = true
        LEFT JOIN system_users su ON r.id = su.role_id
        WHERE r.id = $1
        GROUP BY r.id
      `, [roleId]);

      if (roleDetails.rows.length > 0) {
        contextualInfo.focusedRole = roleDetails.rows[0];
      }
    } catch (error) {
      console.error('Error getting role details:', error);
    }
  }

  if (context.startsWith('user-')) {
    const userId = context.split('-')[1];
    try {
      const userDetails = await pool.query(`
        SELECT 
          su.*,
          ur.role_name, ur.description as role_description,
          COUNT(DISTINCT rtp.id) as available_permissions
        FROM system_users su
        LEFT JOIN user_roles ur ON su.role_id = ur.id
        LEFT JOIN role_tile_permissions rtp ON ur.id = rtp.role_id AND rtp.is_granted = true
        WHERE su.id = $1
        GROUP BY su.id, ur.role_name, ur.description
      `, [userId]);

      if (userDetails.rows.length > 0) {
        contextualInfo.focusedUser = userDetails.rows[0];
      }
    } catch (error) {
      console.error('Error getting user details:', error);
    }
  }

  return contextualInfo;
}

// Analyze AI response for suggested actions and screen navigation
function analyzeResponseForActions(aiResponse: string, userMessage: string) {
  const response = aiResponse.toLowerCase();
  const message = userMessage.toLowerCase();
  
  let suggestedView = null;
  let suggestedActions: string[] = [];
  let navigationSuggestion = null;

  // Detect specific role/user requests
  if (message.includes('show') || message.includes('view') || message.includes('details')) {
    if (message.includes('role') && message.match(/\d+/)) {
      const roleId = message.match(/\d+/)?.[0];
      suggestedView = `role-${roleId}`;
    } else if (message.includes('user') && message.match(/\d+/)) {
      const userId = message.match(/\d+/)?.[0];
      suggestedView = `user-${userId}`;
    }
  }

  // Detect module/tile-specific requests for navigation
  const moduleKeywords = {
    'master data': '/master-data',
    'finance': '/finance',
    'sales': '/sales', 
    'inventory': '/inventory',
    'purchase': '/purchase',
    'production': '/production',
    'hr': '/hr',
    'company codes': '/master-data',
    'chart of accounts': '/finance',
    'materials': '/master-data',
    'customers': '/master-data',
    'customer master data': '/master-data',
    'customer master': '/master-data',
    'vendors': '/purchase'
  };

  // Check for navigation keywords
  for (const [keyword, route] of Object.entries(moduleKeywords)) {
    if (message.includes(keyword)) {
      navigationSuggestion = {
        route: route,
        description: `Navigate to ${keyword} section`
      };
      break;
    }
  }

  // Detect tile ID patterns (MD001, FI001, etc.)
  const tileIdMatch = message.match(/([a-z]{2}\d{3})/i);
  if (tileIdMatch) {
    const tileId = tileIdMatch[1].toUpperCase();
    navigationSuggestion = {
      tileId: tileId,
      description: `Navigate to tile ${tileId}`
    };
  }

  // Detect action requests (analysis and guidance only)
  if (message.includes('assign') || message.includes('permission')) {
    suggestedActions.push('permission_analysis');
  }
  
  if (message.includes('create') || message.includes('add')) {
    suggestedActions.push('creation_guidance');
  }

  if (message.includes('access') || message.includes('navigate')) {
    suggestedActions.push('navigation_guidance');
  }

  return {
    suggestedView,
    suggestedActions,
    navigationSuggestion
  };
}

// Execute role-related actions (analysis and guidance only)
async function executeRoleActions(actions: string[]) {
  let results = {
    dataChanged: false,
    description: null as string | null
  };

  // Only provide analysis and guidance, no actual data changes
  for (const action of actions) {
    switch (action) {
      case 'permission_analysis':
        results.description = 'Permission analysis completed - use the interface to make changes';
        break;
      case 'creation_guidance':
        results.description = 'Creation guidance provided - use the management interface to create items';
        break;
    }
  }

  return results;
}

// Get permissions overview
router.get('/permissions/overview', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_permissions,
        COUNT(CASE WHEN is_granted = true THEN 1 END) as granted_permissions,
        COUNT(DISTINCT role_id) as roles_with_permissions,
        COUNT(DISTINCT tile_id) as tiles_with_permissions,
        MAX(updated_at) as last_update
      FROM role_tile_permissions
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting permissions overview:', error);
    res.status(500).json({ error: 'Failed to get permissions overview' });
  }
});

// Get role details
router.get('/role-details/:context', async (req, res) => {
  try {
    const { context } = req.params;
    
    if (!context.startsWith('role-')) {
      return res.status(400).json({ error: 'Invalid context format' });
    }

    const roleId = context.split('-')[1];
    
    const roleResult = await pool.query(`
      SELECT 
        r.*,
        COUNT(DISTINCT rtp.id) as permissions_count,
        COUNT(DISTINCT su.id) as users_count
      FROM user_roles r
      LEFT JOIN role_tile_permissions rtp ON r.id = rtp.role_id
      LEFT JOIN system_users su ON r.id = su.role_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [roleId]);

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Get recent permission changes
    const changesResult = await pool.query(`
      SELECT 
        rtp.tile_id,
        rtp.permission_action as action,
        rtp.is_granted,
        rtp.updated_at,
        st.tile_name
      FROM role_tile_permissions rtp
      LEFT JOIN system_tiles st ON rtp.tile_id = st.tile_id
      WHERE rtp.role_id = $1
      ORDER BY rtp.updated_at DESC
      LIMIT 10
    `, [roleId]);

    const roleDetails = {
      ...roleResult.rows[0],
      recent_changes: changesResult.rows
    };

    res.json(roleDetails);
  } catch (error) {
    console.error('Error getting role details:', error);
    res.status(500).json({ error: 'Failed to get role details' });
  }
});

export default router;