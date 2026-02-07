/**
 * RevenueCat Client Configuration
 *
 * This module sets up and configures the RevenueCat SDK for in-app purchases
 * and subscription management. It handles:
 * - SDK initialization with platform-specific API keys
 * - User identification and authentication
 * - Logout functionality
 *
 * @module lib/revenuecat
 */

import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

/**
 * Configure the RevenueCat SDK with the appropriate API key
 * Must be called once at app startup, before any other RevenueCat operations
 *
 * @throws {Error} If the required API key is not set in environment variables
 */
export const configureRevenueCat = async (): Promise<void> => {
  try {
    // Get the platform-specific API key
    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    });

    if (!apiKey) {
      throw new Error(
        `RevenueCat API key not found. Please set ${
          Platform.OS === 'ios'
            ? 'EXPO_PUBLIC_REVENUECAT_IOS_KEY'
            : 'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'
        } in your .env file`
      );
    }

    // Configure the SDK
    Purchases.configure({ apiKey });

    // Enable debug logs in development
    const isDev = process.env.DEV_MODE === 'true' || (typeof __DEV__ !== 'undefined' && __DEV__);
    if (isDev) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
  } catch (error) {
    console.error('Failed to configure RevenueCat:', error);
    throw error;
  }
};

/**
 * Identify a user in RevenueCat
 * Should be called after successful authentication
 *
 * @param userId - The unique user ID from your authentication system (Supabase user ID)
 * @returns Promise containing customer info and whether the user was created
 */
export const identifyUser = async (userId: string) => {
  try {
    const result = await Purchases.logIn(userId);
    return result;
  } catch (error) {
    console.error('Failed to identify user in RevenueCat:', error);
    throw error;
  }
};

/**
 * Log out the current user from RevenueCat
 * Should be called when the user signs out
 *
 * @returns Promise containing the customer info after logout
 */
export const logoutUser = async () => {
  try {
    const result = await Purchases.logOut();
    return result;
  } catch (error) {
    console.error('Failed to logout user from RevenueCat:', error);
    throw error;
  }
};
