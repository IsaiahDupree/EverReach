import assert from 'node:assert/strict';

import {
  DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS,
  installHandoffMaxAgeMs,
  installRecoveryCodeToTouchToken,
  isInstallHandoffCapturedAtRedeemable,
  touchTokenToInstallRecoveryCode,
} from '../lib/attribution-install-handoff';

const tokens = [
  'touch_00000000-0000-4000-8000-000000000001',
  'touch_3d594650-3434-4f9a-a9b1-472ef7fd7691',
  'touch_ffffffff-ffff-4fff-bfff-ffffffffffff',
];

for (const token of tokens) {
  const code = touchTokenToInstallRecoveryCode(token);
  assert.ok(code, `expected a recovery code for ${token}`);
  assert.equal(installRecoveryCodeToTouchToken(code), token);
  assert.equal(installRecoveryCodeToTouchToken(code.toLowerCase()), token);
}

assert.equal(
  touchTokenToInstallRecoveryCode('touch_3d594650-3434-4f9a-a9b1-472ef7fd7691'),
  'ER1-7NCMC-M1M6H-7SNAD-H8WQF-FZBPJ4',
);

assert.equal(touchTokenToInstallRecoveryCode('client_supplied_token'), null);
assert.equal(installRecoveryCodeToTouchToken('ER1-NOT-A-VALID-CODE'), null);
const now = Date.parse('2026-08-25T12:00:00.000Z');
assert.equal(
  isInstallHandoffCapturedAtRedeemable(
    '2026-08-25T11:59:00.000Z',
    now,
    DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS,
  ),
  true,
);
assert.equal(
  isInstallHandoffCapturedAtRedeemable(
    '2026-07-01T00:00:00.000Z',
    now,
    DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS,
  ),
  false,
);
assert.equal(
  isInstallHandoffCapturedAtRedeemable(
    '2026-08-25T12:06:00.000Z',
    now,
    DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS,
  ),
  false,
);
assert.equal(isInstallHandoffCapturedAtRedeemable('not-a-date', now, 1), false);
assert.equal(installHandoffMaxAgeMs(undefined), DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS);
assert.equal(installHandoffMaxAgeMs('7'), 7 * 24 * 60 * 60 * 1000);
assert.equal(installHandoffMaxAgeMs('999'), 90 * 24 * 60 * 60 * 1000);
console.log('Install attribution handoff codec and expiry checks passed');
