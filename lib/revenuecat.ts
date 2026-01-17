import { Platform } from 'react-native';
import Constants from 'expo-constants';

let PurchasesRef: any | null = null;

function hasKeys() {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  return Boolean(ios || android);
}

export async function getAppUserId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo') return null;
    const Purchases = await loadPurchases();
    if (!Purchases) return null;
    const id = await Purchases.getAppUserID();
    return id || null;
  } catch {
    return null;
  }
}

export async function getCustomerInfo(): Promise<any | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo') return null;
    const Purchases = await loadPurchases();
    if (!Purchases) return null;
    const info = await Purchases.getCustomerInfo();
    return info || null;
  } catch {
    return null;
  }
}

export async function logIn(appUserId: string): Promise<{ customerInfo: any; created: boolean } | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo') return null;
    const Purchases = await loadPurchases();
    if (!Purchases) return null;
    const res = await Purchases.logIn(appUserId);
    return res || null;
  } catch {
    return null;
  }
}

export async function logOut(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    if (Constants.appOwnership === 'expo') return false;
    const Purchases = await loadPurchases();
    if (!Purchases) return false;
    await Purchases.logOut();
    return true;
  } catch {
    return false;
  }
}

async function loadPurchases() {
  if (Platform.OS === 'web') return null;
  // Skip when running inside Expo Go (no native store / Test Store only)
  if (Constants.appOwnership === 'expo') {
    console.warn('[RevenueCat] Skipping load in Expo Go (use dev build or Test Store)');
    return null;
  }
  if (PurchasesRef) return PurchasesRef;
  try {
    const mod: any = await import('react-native-purchases');
    PurchasesRef = mod?.default || mod;

    // Verify the module has essential methods
    if (!PurchasesRef || typeof PurchasesRef.configure !== 'function') {
      console.warn('[RevenueCat] Module loaded but missing required methods');
      PurchasesRef = null;
      return null;
    }

    return PurchasesRef;
  } catch (e) {
    console.warn('[RevenueCat] Failed to load module (native build required):', (e as any)?.message || e);
    PurchasesRef = null;
    return null;
  }
}

export async function initializeRevenueCat(appUserId?: string | null): Promise<boolean> {
  try {
    console.log('[RevenueCat] Starting initialization...', {
      platform: Platform.OS,
      appOwnership: Constants.appOwnership,
      hasKeys: hasKeys()
    });

    if (Platform.OS === 'web') {
      console.warn('[RevenueCat] Skipping - web platform');
      return false;
    }
    if (Constants.appOwnership === 'expo') {
      console.warn('[RevenueCat] Skipping initialization in Expo Go (requires dev build or Test Store)');
      return false;
    }
    if (!hasKeys()) {
      console.warn('[RevenueCat] Missing public SDK keys; skipping init');
      return false;
    }

    console.log('[RevenueCat] Loading Purchases module...');
    const Purchases = await loadPurchases();
    if (!Purchases) {
      console.warn('[RevenueCat] Failed to load Purchases module');
      return false;
    }
    console.log('[RevenueCat] Purchases module loaded successfully');

    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      default: undefined,
    });
    if (!apiKey) {
      console.warn('[RevenueCat] No platform API key found; skipping init');
      return false;
    }

    // Set debug logging BEFORE configure (like example app)
    try {
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        console.log('[RevenueCat] Debug logging enabled');
      }
    } catch (e) {
      console.warn('[RevenueCat] Could not set log level:', e);
    }

    // Wrap configure in try-catch to handle native module issues
    try {
      await Purchases.configure({
        apiKey,
        appUserID: appUserId || undefined  // Use undefined instead of null
      });
      console.log('✅ [RevenueCat] Successfully configured with API key:', apiKey.substring(0, 10) + '...');
      isInitialized = true; // Mark as initialized after successful configure
    } catch (configError: any) {
      console.error('❌ [RevenueCat] Configure failed:', configError?.message || configError);
      isInitialized = false;
      return false;
    }

    try {
      const bundleId = (Constants as any)?.expoConfig?.ios?.bundleIdentifier || (Constants as any)?.manifest2?.extra?.expoClient?.ios?.bundleIdentifier || 'unknown';
      console.log('✅ [RevenueCat] Initialized successfully', {
        platform: Platform.OS,
        appOwnership: Constants.appOwnership,
        bundleId,
        userId: appUserId || 'anonymous'
      });
    } catch { }
    return true;
  } catch (e) {
    console.error('❌ [RevenueCat] Init error:', (e as any)?.message || e);
    return false;
  }
}

// Track if RevenueCat has been initialized
let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

export function setInitialized(value: boolean) {
  isInitialized = value;
}

export async function fetchOfferings(): Promise<any | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo') return null;
    
    // Ensure RevenueCat is initialized before fetching offerings
    if (!isInitialized) {
      console.log('[RevenueCat] Not initialized yet, initializing now...');
      // Use the function directly (same file, no circular import)
      const success = await initializeRevenueCat();
      if (!success) {
        console.warn('[RevenueCat] Failed to initialize, cannot fetch offerings');
        return null;
      }
    }
    
    const Purchases = await loadPurchases();
    if (!Purchases) return null;
    try {
      const bundleId = (Constants as any)?.expoConfig?.ios?.bundleIdentifier || 'unknown';
      console.log('[RevenueCat] Fetching offerings…', { platform: Platform.OS, appOwnership: Constants.appOwnership, hasKeys: hasKeys(), bundleId });
    } catch { }
    const offerings = await Purchases.getOfferings();
    if (!offerings?.current?.availablePackages?.length) {
      console.warn('[RevenueCat] Offerings empty or no current packages');
    }
    return offerings;
  } catch (e) {
    console.warn('[RevenueCat] fetchOfferings error:', (e as any)?.message || e);
    return null;
  }
}

export async function purchasePackageById(packageIdentifier: string): Promise<{ customerInfo: any } | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo') return null;
    const Purchases = await loadPurchases();
    if (!Purchases) return null;
    const offerings = await Purchases.getOfferings();
    const allPkgs: any[] = [];
    const current = offerings?.current;
    if (current?.availablePackages) allPkgs.push(...current.availablePackages);
    if (offerings?.all) {
      Object.values(offerings.all as any).forEach((off: any) => {
        if (off?.availablePackages) allPkgs.push(...off.availablePackages);
      });
    }
    const pkg = allPkgs.find(p => p?.identifier === packageIdentifier || p?.packageType === packageIdentifier);
    if (!pkg) throw new Error(`Package not found: ${packageIdentifier}`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo };
  } catch (e) {
    console.warn('[RevenueCat] purchasePackageById error:', (e as any)?.message || e);
    return null;
  }
}

export async function restorePurchases(): Promise<any | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo') return null;
    const Purchases = await loadPurchases();
    if (!Purchases) return null;
    const info = await Purchases.restorePurchases();
    return info;
  } catch (e) {
    console.warn('[RevenueCat] restorePurchases error:', (e as any)?.message || e);
    return null;
  }
}
