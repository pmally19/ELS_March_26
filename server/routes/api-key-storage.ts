import { Router } from 'express';
import { db } from '../db';
import { apiKeys, insertApiKeySchema } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Encryption utilities - Using secure AES-256-GCM
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
// Derive a consistent 32-byte key from ENCRYPTION_KEY env var
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  // If it's a hex string, convert to buffer; otherwise hash it
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  // Hash the key to get exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const textParts = encryptedText.split(':');
    
    if (textParts.length < 3) {
      // Legacy format without auth tag - try to decrypt with old method for migration
      const iv = Buffer.from(textParts[0], 'hex');
      const encrypted = textParts[1] || textParts.slice(1).join(':');
      // For legacy keys, we'll return empty and let them be re-encrypted
      console.warn('Legacy encrypted key format detected - will need re-encryption');
      return '';
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const authTag = Buffer.from(textParts[1], 'hex');
    const encrypted = textParts[2];
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

// Get all API keys (without exposing actual keys)
router.get('/keys', async (req, res) => {
  try {
    const keys = await db.select({
      id: apiKeys.id,
      serviceName: apiKeys.serviceName,
      keyName: apiKeys.keyName,
      description: apiKeys.description,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
      lastUsed: apiKeys.lastUsed
    }).from(apiKeys);

    res.json({
      success: true,
      keys: keys.map(key => ({
        ...key,
        hasKey: true, // Never expose actual key values
        keyPreview: `${key.keyName.slice(0, 8)}...${key.keyName.slice(-4)}`
      }))
    });
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
});

// Store/Update API key
router.post('/keys', async (req, res) => {
  try {
    const { serviceName, keyName, keyValue, description } = req.body;

    if (!serviceName || !keyName || !keyValue) {
      return res.status(400).json({
        success: false,
        error: 'Service name, key name, and key value are required'
      });
    }

    // Encrypt the API key
    const encryptedKey = encrypt(keyValue);

    // Check if key already exists
    const existingKey = await db.select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.serviceName, serviceName),
        eq(apiKeys.keyName, keyName)
      ))
      .limit(1);

    if (existingKey.length > 0) {
      // Update existing key
      await db.update(apiKeys)
        .set({
          keyValue: encryptedKey,
          description,
          updatedAt: new Date(),
          isActive: true
        })
        .where(eq(apiKeys.id, existingKey[0].id));

      console.log(`✅ Updated API key for ${serviceName}`);
    } else {
      // Create new key
      await db.insert(apiKeys).values({
        serviceName,
        keyName,
        keyValue: encryptedKey,
        description,
        isActive: true
      });

      console.log(`✅ Created new API key for ${serviceName}`);
    }

    // Update environment variable for immediate use
    process.env[keyName] = keyValue;

    res.json({
      success: true,
      message: `API key for ${serviceName} has been securely stored and activated`
    });

  } catch (error) {
    console.error('Failed to store API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store API key'
    });
  }
});

// Get specific API key (for internal use only)
router.get('/keys/:serviceName/:keyName', async (req, res) => {
  try {
    const { serviceName, keyName } = req.params;

    const key = await db.select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.serviceName, serviceName),
        eq(apiKeys.keyName, keyName),
        eq(apiKeys.isActive, true)
      ))
      .limit(1);

    if (key.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Decrypt the key for internal use
    const decryptedKey = decrypt(key[0].keyValue);

    // Update last used timestamp
    await db.update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, key[0].id));

    res.json({
      success: true,
      keyValue: decryptedKey
    });

  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve API key'
    });
  }
});

// Delete API key
router.delete('/keys/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.update(apiKeys)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, parseInt(id)));

    res.json({
      success: true,
      message: 'API key has been deactivated'
    });

  } catch (error) {
    console.error('Failed to delete API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    });
  }
});

export default router;