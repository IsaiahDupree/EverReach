// Using legacy import for expo-file-system (SDK 54+ deprecated many methods)
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { KV } from '@/storage/AsyncStorageService';

export async function exportAllData(prefixes = ['people/', 'messages/', 'voicenotes/', 'settings/', 'auth/']) {
  try {
    const dump: Record<string, any> = {};
    
    for (const prefix of prefixes) {
      const keys = await KV.keys(prefix);
      for (const key of keys) {
        const value = await KV.get<any>(key);
        if (value) {
          dump[key] = value;
        }
      }
    }
    
    const exportData = {
      version: 1,
      exportedAt: Date.now(),
      data: dump,
      metadata: {
        totalKeys: Object.keys(dump).length,
        prefixes: prefixes
      }
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const fileName = `crm-backup-${new Date().toISOString().split('T')[0]}.json`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, path: url, fileName };
      } catch (e) {
        console.error('Web export failed:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Unknown web export error' };
      }
    }

    const path = (FileSystem.documentDirectory ?? '') + fileName;
    await FileSystem.writeAsStringAsync(path, json);

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Export CRM Data'
        });
      }
    } catch (e) {
      console.log('Sharing not available or failed:', e);
    }
    
    return { success: true, path, fileName };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function importAllData(fileUri: string) {
  try {
    const json = await FileSystem.readAsStringAsync(fileUri);
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (parseError) {
      throw new Error('Invalid JSON in backup file');
    }
    
    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Invalid backup file format');
    }
    
    let importedCount = 0;
    for (const [key, value] of Object.entries(parsed.data)) {
      await KV.set(key, value);
      importedCount++;
    }
    
    return { 
      success: true, 
      importedCount,
      version: parsed.version,
      exportedAt: parsed.exportedAt 
    };
  } catch (error) {
    console.error('Import failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getStorageStats() {
  try {
    const prefixes = ['people/', 'messages/', 'voicenotes/', 'settings/', 'auth/'];
    const stats: Record<string, number> = {};
    
    for (const prefix of prefixes) {
      const keys = await KV.keys(prefix);
      stats[prefix] = keys.length;
    }
    
    return { success: true, stats };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function clearCorruptedData() {
  try {
    const allKeys = await KV.keys();
    let clearedCount = 0;
    
    for (const key of allKeys) {
      try {
        const value = await KV.get<any>(key);
        // If get() returns null, it means the data was corrupted and already cleared
        if (value === null) {
          clearedCount++;
        }
      } catch (error) {
        console.log(`Clearing corrupted key: ${key}`);
        await KV.remove(key);
        clearedCount++;
      }
    }
    
    return { success: true, clearedCount };
  } catch (error) {
    console.error('Failed to clear corrupted data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}