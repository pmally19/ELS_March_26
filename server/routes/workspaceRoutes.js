import express from 'express';
import { db } from '../db.js';
import { tileRegistry, tileNamingDocumentation, userWorkspaces, workspaceTileAssignments } from '../../shared/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

const router = express.Router();

// Get all tiles from registry
router.get('/tiles', async (req, res) => {
  try {
    const tiles = await db.select().from(tileRegistry).where(eq(tileRegistry.isActive, true));
    res.json(tiles);
  } catch (error) {
    console.error('Error fetching tiles:', error);
    res.status(500).json({ error: 'Failed to fetch tiles' });
  }
});

// Get tiles by role
router.get('/tiles/by-role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const tiles = await db.select().from(tileRegistry).where(eq(tileRegistry.isActive, true));
    
    // Filter tiles based on role access
    const accessibleTiles = tiles.filter(tile => {
      const roles = tile.requiredRoles;
      return roles.includes(role) || roles.includes('admin') || roles.includes('all');
    });
    
    res.json(accessibleTiles);
  } catch (error) {
    console.error('Error fetching tiles by role:', error);
    res.status(500).json({ error: 'Failed to fetch tiles by role' });
  }
});

// Get tile numbering documentation
router.get('/naming-documentation', async (req, res) => {
  try {
    const documentation = await db.select().from(tileNamingDocumentation);
    res.json(documentation);
  } catch (error) {
    console.error('Error fetching naming documentation:', error);
    res.status(500).json({ error: 'Failed to fetch naming documentation' });
  }
});

// Get tiles by alphabetic prefix
router.get('/tiles/by-prefix/:prefix', async (req, res) => {
  try {
    const { prefix } = req.params;
    const tiles = await db.select()
      .from(tileRegistry)
      .where(and(
        eq(tileRegistry.alphabeticPrefix, prefix),
        eq(tileRegistry.isActive, true)
      ));
    
    res.json(tiles);
  } catch (error) {
    console.error('Error fetching tiles by prefix:', error);
    res.status(500).json({ error: 'Failed to fetch tiles by prefix' });
  }
});

// Get process sequence for a business process
router.get('/tiles/process-sequence/:businessProcess', async (req, res) => {
  try {
    const { businessProcess } = req.params;
    const tiles = await db.select()
      .from(tileRegistry)
      .where(and(
        eq(tileRegistry.businessProcess, businessProcess),
        eq(tileRegistry.isActive, true)
      ));
    
    // Sort by process sequence
    tiles.sort((a, b) => (a.processSequence || 0) - (b.processSequence || 0));
    
    res.json(tiles);
  } catch (error) {
    console.error('Error fetching process sequence:', error);
    res.status(500).json({ error: 'Failed to fetch process sequence' });
  }
});

// Get customized tiles (AC, SC, PC variants)
router.get('/tiles/customized', async (req, res) => {
  try {
    const customizedTiles = await db.select()
      .from(tileRegistry)
      .where(and(
        eq(tileRegistry.isCustomized, true),
        eq(tileRegistry.isActive, true)
      ));
    
    res.json(customizedTiles);
  } catch (error) {
    console.error('Error fetching customized tiles:', error);
    res.status(500).json({ error: 'Failed to fetch customized tiles' });
  }
});

// Get tile by number
router.get('/tiles/number/:tileNumber', async (req, res) => {
  try {
    const { tileNumber } = req.params;
    const [tile] = await db.select()
      .from(tileRegistry)
      .where(eq(tileRegistry.tileNumber, tileNumber));
    
    if (!tile) {
      return res.status(404).json({ error: 'Tile not found' });
    }
    
    res.json(tile);
  } catch (error) {
    console.error('Error fetching tile by number:', error);
    res.status(500).json({ error: 'Failed to fetch tile' });
  }
});

// Create or update user workspace
router.post('/workspaces', async (req, res) => {
  try {
    const { name, description, userId, tiles, isDefault } = req.body;
    
    const [workspace] = await db.insert(userWorkspaces)
      .values({
        name,
        description,
        userId,
        tiles: JSON.stringify(tiles),
        isDefault: isDefault || false
      })
      .returning();
    
    res.json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get user workspaces
router.get('/workspaces/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const workspaces = await db.select()
      .from(userWorkspaces)
      .where(eq(userWorkspaces.userId, parseInt(userId)));
    
    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching user workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Update workspace tiles
router.put('/workspaces/:workspaceId/tiles', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { tiles } = req.body;
    
    const [updatedWorkspace] = await db.update(userWorkspaces)
      .set({
        tiles: JSON.stringify(tiles),
        updatedAt: new Date()
      })
      .where(eq(userWorkspaces.id, parseInt(workspaceId)))
      .returning();
    
    res.json(updatedWorkspace);
  } catch (error) {
    console.error('Error updating workspace tiles:', error);
    res.status(500).json({ error: 'Failed to update workspace tiles' });
  }
});

// Get workspace statistics
router.get('/statistics', async (req, res) => {
  try {
    const totalTiles = await db.select().from(tileRegistry).where(eq(tileRegistry.isActive, true));
    const customizedTiles = await db.select().from(tileRegistry).where(and(
      eq(tileRegistry.isCustomized, true),
      eq(tileRegistry.isActive, true)
    ));
    
    // Count tiles by prefix
    const prefixCounts = {};
    totalTiles.forEach(tile => {
      const prefix = tile.alphabeticPrefix;
      prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    });
    
    // Count tiles by business process
    const processCounts = {};
    totalTiles.forEach(tile => {
      const process = tile.businessProcess || 'Other';
      processCounts[process] = (processCounts[process] || 0) + 1;
    });
    
    res.json({
      totalTiles: totalTiles.length,
      customizedTiles: customizedTiles.length,
      standardTiles: totalTiles.length - customizedTiles.length,
      prefixCounts,
      processCounts,
      implementationSequence: {
        masterData: totalTiles.filter(t => t.alphabeticPrefix === 'A').length,
        businessPartners: totalTiles.filter(t => t.alphabeticPrefix === 'B').length,
        materials: totalTiles.filter(t => t.alphabeticPrefix === 'C').length,
        salesProcess: totalTiles.filter(t => t.alphabeticPrefix === 'S' || t.alphabeticPrefix === 'SC').length,
        procurementProcess: totalTiles.filter(t => t.alphabeticPrefix === 'P' || t.alphabeticPrefix === 'PC').length,
        financeProcess: totalTiles.filter(t => t.alphabeticPrefix === 'F' || t.alphabeticPrefix === 'FC').length,
        inventoryProcess: totalTiles.filter(t => t.alphabeticPrefix === 'I' || t.alphabeticPrefix === 'IC').length
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;