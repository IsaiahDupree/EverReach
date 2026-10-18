import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './StorageService';

export class AsyncStorageService implements StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch (parseError) {
        console.error(`Failed to parse JSON for key ${key}:`, parseError);
        // Remove corrupted data
        await AsyncStorage.removeItem(key);
        return null;
      }
    } catch (error) {
      console.error(`Failed to get value for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('AsyncStorageService: Failed to set key:', key, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    return prefix ? allKeys.filter(k => k.startsWith(prefix)) : [...allKeys];
  }
}

export const KV = new AsyncStorageService();