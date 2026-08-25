import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { verifyWebhookSignature } from '../lib/revenuecat-webhook';

const secret = 'local-contract-secret';
const nowMs = Date.UTC(2026, 7, 25, 16, 0, 0);
const timestamp = String(Math.floor(nowMs / 1000));
const body = JSON.stringify({
  event: {
    type: 'INITIAL_PURCHASE',
    app_user_id: '11111111-1111-4111-8111-111111111111',
  },
});
const digest = createHmac('sha256', secret)
  .update(`${timestamp}.${body}`, 'utf8')
  .digest('hex');
const valid = `t=${timestamp},v1=${digest}`;

assert.equal(verifyWebhookSignature(body, valid, secret, nowMs), true);
assert.equal(
  verifyWebhookSignature(`${body} `, valid, secret, nowMs),
  false,
  'any raw body mutation must invalidate the signature',
);
assert.equal(
  verifyWebhookSignature(body, `t=${timestamp},v1=${'0'.repeat(64)}`, secret, nowMs),
  false,
);
assert.equal(
  verifyWebhookSignature(body, valid, secret, nowMs + 301_000),
  false,
  'stale signatures must be rejected',
);
assert.equal(verifyWebhookSignature(body, null, secret, nowMs), false);
assert.equal(verifyWebhookSignature(body, valid, undefined, nowMs), false);
assert.equal(
  verifyWebhookSignature(body, `${valid},v1=${digest}`, secret, nowMs),
  false,
  'ambiguous duplicate signature components must be rejected',
);

console.log('PASS RevenueCat timestamped webhook signature contract');
