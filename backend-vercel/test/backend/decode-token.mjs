/**
 * Decode JWT token to debug auth issues
 */

import { getAccessToken } from './_shared.mjs';

async function test() {
  console.log('Getting access token...');
  const token = await getAccessToken();
  
  // Decode JWT (base64)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('Invalid JWT format');
    return;
  }
  
  const [headerB64, payloadB64, signature] = parts;
  
  // Decode header
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  console.log('\nHeader:', JSON.stringify(header, null, 2));
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  console.log('\nPayload:', JSON.stringify(payload, null, 2));
  
  // Check expiration
  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    console.log('\nExpiration:', expDate.toISOString());
    console.log('Current time:', now.toISOString());
    console.log('Is expired?', expDate < now);
  }
  
  // Check user ID
  console.log('\nUser ID (sub):', payload.sub);
  
  // Show first/last 20 chars of signature
  console.log('\nSignature (first 20):', signature.substring(0, 20));
  console.log('Signature (last 20):', signature.substring(signature.length - 20));
}

test().catch(console.error);
