import { Request, Response, Router } from 'express';
import { ensureActivePool } from '../database';

const pool = ensureActivePool();
const router = Router();

// GET /api/user-settings - Get user settings (default for current user or system defaults)
export async function getUserSettings(req: Request, res: Response) {
  try {
    // For now, return system defaults
    // In future, this can be extended to fetch user-specific settings from a user_preferences table
    const settings = {
      language: 'en',
      timezone: 'UTC',
      theme: 'system',
      emailNotifications: true,
      pushNotifications: false,
      soundAlerts: true,
      twoFactorEnabled: false
    };

    return res.status(200).json(settings);
  } catch (error: any) {
    console.error("Error fetching user settings:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/user-settings - Update user settings
export async function updateUserSettings(req: Request, res: Response) {
  try {
    const { language, timezone, theme, emailNotifications, pushNotifications, soundAlerts, twoFactorEnabled } = req.body;

    // For now, just return success
    // In future, this can be extended to save to a user_preferences table
    const settings = {
      language: language || 'en',
      timezone: timezone || 'UTC',
      theme: theme || 'system',
      emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : false,
      soundAlerts: soundAlerts !== undefined ? soundAlerts : true,
      twoFactorEnabled: twoFactorEnabled !== undefined ? twoFactorEnabled : false
    };

    return res.status(200).json({ 
      success: true,
      message: 'Settings updated successfully',
      settings 
    });
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/settings/languages - Get available languages
export async function getLanguages(req: Request, res: Response) {
  try {
    // Standard language codes with names
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ru', name: 'Russian' }
    ];

    return res.status(200).json(languages);
  } catch (error: any) {
    console.error("Error fetching languages:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/settings/timezones - Get available timezones
export async function getTimezones(req: Request, res: Response) {
  try {
    // Common timezones
    const timezones = [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'EST/EDT - Eastern Time (US & Canada)' },
      { value: 'America/Chicago', label: 'CST/CDT - Central Time (US & Canada)' },
      { value: 'America/Denver', label: 'MST/MDT - Mountain Time (US & Canada)' },
      { value: 'America/Los_Angeles', label: 'PST/PDT - Pacific Time (US & Canada)' },
      { value: 'America/Phoenix', label: 'MST - Arizona' },
      { value: 'America/Anchorage', label: 'AKST/AKDT - Alaska' },
      { value: 'Pacific/Honolulu', label: 'HST - Hawaii' },
      { value: 'Europe/London', label: 'GMT/BST - London' },
      { value: 'Europe/Paris', label: 'CET/CEST - Paris' },
      { value: 'Europe/Berlin', label: 'CET/CEST - Berlin' },
      { value: 'Europe/Rome', label: 'CET/CEST - Rome' },
      { value: 'Europe/Madrid', label: 'CET/CEST - Madrid' },
      { value: 'Asia/Tokyo', label: 'JST - Tokyo' },
      { value: 'Asia/Shanghai', label: 'CST - Shanghai' },
      { value: 'Asia/Hong_Kong', label: 'HKT - Hong Kong' },
      { value: 'Asia/Singapore', label: 'SGT - Singapore' },
      { value: 'Asia/Dubai', label: 'GST - Dubai' },
      { value: 'Asia/Kolkata', label: 'IST - India' },
      { value: 'Australia/Sydney', label: 'AEDT/AEST - Sydney' },
      { value: 'Australia/Melbourne', label: 'AEDT/AEST - Melbourne' },
      { value: 'America/Sao_Paulo', label: 'BRT/BRST - São Paulo' },
      { value: 'America/Mexico_City', label: 'CST/CDT - Mexico City' },
      { value: 'America/Toronto', label: 'EST/EDT - Toronto' },
      { value: 'America/Vancouver', label: 'PST/PDT - Vancouver' }
    ];

    return res.status(200).json(timezones);
  } catch (error: any) {
    console.error("Error fetching timezones:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

export default router;

