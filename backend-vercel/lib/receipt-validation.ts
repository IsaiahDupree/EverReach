/**
 * Receipt Validation for Apple App Store & Google Play
 * 
 * Validates subscriptions from mobile app stores and extracts
 * subscription details for cross-platform entitlement.
 */

/**
 * Apple App Store Receipt Validation
 * 
 * Uses Apple's Verify Receipt API (deprecated, migrate to App Store Server API)
 * Documentation: https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
 */
export interface AppleReceiptResponse {
  status: number;
  environment: 'Sandbox' | 'Production';
  receipt: {
    bundle_id: string;
    application_version: string;
    original_application_version: string;
    in_app: AppleInAppPurchase[];
  };
  latest_receipt_info?: AppleInAppPurchase[];
  pending_renewal_info?: ApplePendingRenewal[];
}

export interface AppleInAppPurchase {
  quantity: string;
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  purchase_date: string;
  purchase_date_ms: string;
  purchase_date_pst: string;
  original_purchase_date: string;
  original_purchase_date_ms: string;
  expires_date?: string;
  expires_date_ms?: string;
  is_trial_period?: string;
  is_in_intro_offer_period?: string;
  cancellation_date?: string;
  cancellation_date_ms?: string;
  cancellation_reason?: string;
}

export interface ApplePendingRenewal {
  auto_renew_product_id: string;
  original_transaction_id: string;
  product_id: string;
  auto_renew_status: string; // "0" = off, "1" = on
  is_in_billing_retry_period?: string;
  expiration_intent?: string;
  grace_period_expires_date?: string;
  grace_period_expires_date_ms?: string;
}

export interface AppleValidationResult {
  valid: boolean;
  originalTransactionId: string;
  productId: string;
  expiresAt: string | null;
  isTrialing: boolean;
  isCanceled: boolean;
  autoRenewEnabled: boolean;
  environment: 'Sandbox' | 'Production';
  error?: string;
}

export async function validateAppleReceipt(
  receiptData: string,
  password: string // App-specific shared secret
): Promise<AppleValidationResult> {
  try {
    // Try production first, then sandbox
    let response = await verifyAppleReceiptWithEndpoint(
      receiptData,
      password,
      'https://buy.itunes.apple.com/verifyReceipt'
    );

    // If status = 21007, receipt is from sandbox, retry with sandbox endpoint
    if (response.status === 21007) {
      response = await verifyAppleReceiptWithEndpoint(
        receiptData,
        password,
        'https://sandbox.itunes.apple.com/verifyReceipt'
      );
    }

    // Status codes: 0 = success, others = errors
    if (response.status !== 0) {
      return {
        valid: false,
        originalTransactionId: '',
        productId: '',
        expiresAt: null,
        isTrialing: false,
        isCanceled: false,
        autoRenewEnabled: false,
        environment: 'Production',
        error: `Apple validation failed with status ${response.status}`,
      };
    }

    // Get latest subscription info
    const latestReceipt = response.latest_receipt_info?.[0] || response.receipt.in_app[0];
    if (!latestReceipt) {
      return {
        valid: false,
        originalTransactionId: '',
        productId: '',
        expiresAt: null,
        isTrialing: false,
        isCanceled: false,
        autoRenewEnabled: false,
        environment: response.environment,
        error: 'No subscription found in receipt',
      };
    }

    // Check renewal status
    const renewalInfo = response.pending_renewal_info?.[0];
    const autoRenewEnabled = renewalInfo?.auto_renew_status === '1';
    const isCanceled = Boolean(latestReceipt.cancellation_date);
    const isTrialing = latestReceipt.is_trial_period === 'true';

    return {
      valid: true,
      originalTransactionId: latestReceipt.original_transaction_id,
      productId: latestReceipt.product_id,
      expiresAt: latestReceipt.expires_date || null,
      isTrialing,
      isCanceled,
      autoRenewEnabled,
      environment: response.environment,
    };
  } catch (error: any) {
    return {
      valid: false,
      originalTransactionId: '',
      productId: '',
      expiresAt: null,
      isTrialing: false,
      isCanceled: false,
      autoRenewEnabled: false,
      environment: 'Production',
      error: error.message,
    };
  }
}

async function verifyAppleReceiptWithEndpoint(
  receiptData: string,
  password: string,
  endpoint: string
): Promise<AppleReceiptResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password,
      'exclude-old-transactions': true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Apple verification failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Google Play Purchase Validation
 * 
 * Uses Google Play Developer API
 * Documentation: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions
 */
export interface GooglePurchaseResponse {
  kind: string;
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  priceCurrencyCode: string;
  priceAmountMicros: string;
  countryCode: string;
  developerPayload: string;
  paymentState?: number; // 0 = pending, 1 = received, 2 = free trial, 3 = pending deferred
  cancelReason?: number; // 0 = user, 1 = system, 2 = replaced, 3 = developer
  userCancellationTimeMillis?: string;
  orderId: string;
  linkedPurchaseToken?: string;
  purchaseType?: number; // 0 = test, 1 = promo, 2 = rewarded
  acknowledgementState?: number; // 0 = pending, 1 = acknowledged
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
}

export interface GoogleValidationResult {
  valid: boolean;
  purchaseToken: string;
  productId: string;
  expiresAt: string;
  isTrialing: boolean;
  isCanceled: boolean;
  autoRenewEnabled: boolean;
  orderId: string;
  error?: string;
}

export async function validateGooglePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string,
  accessToken: string // OAuth2 access token with androidpublisher scope
): Promise<GoogleValidationResult> {
  try {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google validation failed: ${response.statusText}`);
    }

    const data: GooglePurchaseResponse = await response.json();

    // Determine status
    const expiresAt = new Date(parseInt(data.expiryTimeMillis));
    const now = new Date();
    const isExpired = expiresAt < now;
    const isCanceled = Boolean(data.cancelReason !== undefined);
    const isTrialing = data.paymentState === 2;

    return {
      valid: !isExpired,
      purchaseToken,
      productId,
      expiresAt: data.expiryTimeMillis,
      isTrialing,
      isCanceled,
      autoRenewEnabled: data.autoRenewing,
      orderId: data.orderId,
    };
  } catch (error: any) {
    return {
      valid: false,
      purchaseToken,
      productId,
      expiresAt: '',
      isTrialing: false,
      isCanceled: false,
      autoRenewEnabled: false,
      orderId: '',
      error: error.message,
    };
  }
}

/**
 * Map Apple/Google status to normalized status
 */
export function normalizeSubscriptionStatus(
  provider: 'app_store' | 'play',
  isExpired: boolean,
  isCanceled: boolean,
  isTrialing: boolean,
  inGracePeriod: boolean = false
): string {
  if (isTrialing && !isExpired) return 'trialing';
  if (isCanceled && isExpired) return 'canceled';
  if (isCanceled && !isExpired) return 'active'; // Still active until period end
  if (inGracePeriod) return 'in_grace';
  if (isExpired) return 'expired';
  return 'active';
}
