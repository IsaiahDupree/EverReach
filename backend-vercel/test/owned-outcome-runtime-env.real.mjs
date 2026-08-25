import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const work = mkdtempSync(join(tmpdir(), 'owned-outcome-runtime-'));
const builder = fileURLToPath(
  new URL('../scripts/build-owned-outcome-runtime-env.mjs', import.meta.url),
);
const launchdTemplate = fileURLToPath(
  new URL('../ops/com.everreach.owned-outcome-bridge.plist.example', import.meta.url),
);

function jwt(payload) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${encoded}.${'a'.repeat(43)}`;
}

function privateFile(name, content) {
  const path = join(work, name);
  writeFileSync(path, content, { encoding: 'utf8', mode: 0o600 });
  return path;
}

function run(extra = [], output = join(work, 'runtime', 'owned-outcome.env')) {
  return spawnSync(process.execPath, [
    builder,
    '--output', output,
    '--shared-env', shared,
    '--content-quality-env', contentQuality,
    '--posthog-env', posthog,
    '--posthog-project-env', posthogProject,
    ...extra,
  ], { encoding: 'utf8' });
}

const sharedKey = jwt({
  role: 'service_role',
  ref: 'ivhfuhxorppptyuofbgq',
  exp: 4_102_444_800,
});
const shared = privateFile(
  'shared.env',
  `SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=${sharedKey}\n`,
);
const cqToken = 'cq_' + 'c'.repeat(64);
const contentQuality = privateFile(
  'content-quality.env',
  `export CONTENT_QUALITY_CONTROL_TOKEN='${cqToken}'\n`,
);
const posthogKey = 'phx_' + 'p'.repeat(48);
const posthogProjectKey = 'phc_' + 'k'.repeat(44);
const posthog = privateFile('posthog.env', `POSTHOG_API_KEY=${posthogKey}\n`);
const posthogProject = privateFile(
  'posthog-project.env',
  `POSTHOG_PROJECT_KEY=${posthogProjectKey}\n`,
);
const output = join(work, 'runtime', 'owned-outcome.env');

try {
  const launchdTemplateText = readFileSync(launchdTemplate, 'utf8');
  assert.match(
    launchdTemplateText,
    /<string>\/ABSOLUTE\/PRIVATE\/PATH\/owned-outcome\.env<\/string>/,
  );
  assert.match(
    launchdTemplateText,
    /<string>\/ABSOLUTE\/PRIVATE\/PATH\/run-owned-outcome-bridge-job\.sh<\/string>/,
  );
  assert.match(
    launchdTemplateText,
    /<key>WorkingDirectory<\/key>\s*<string>\/ABSOLUTE\/PRIVATE\/PATH<\/string>/,
  );
  assert.doesNotMatch(launchdTemplateText, /ABSOLUTE\/PATH\/TO/);
  assert.doesNotMatch(launchdTemplateText, /owned-outcome-bridge\.env/);

  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const firstValues = dotenv.parse(readFileSync(output, 'utf8'));
  assert.equal(firstValues.OWNED_OUTCOME_SUPABASE_URL,
    'https://ivhfuhxorppptyuofbgq.supabase.co');
  assert.equal(firstValues.OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY, sharedKey);
  assert.equal(firstValues.OWNED_OUTCOME_NODE_BIN, process.execPath);
  assert.equal(firstValues.CONTENT_QUALITY_CONTROL_TOKEN, cqToken);
  assert.equal(firstValues.POSTHOG_PERSONAL_API_KEY, posthogKey);
  assert.equal(firstValues.POSTHOG_PROJECT_KEY, posthogProjectKey);
  assert.match(firstValues.ATTRIBUTION_PUBLICATION_CONTROL_TOKEN, /^[A-Za-z0-9_-]{64}$/);
  assert.match(firstValues.ATTRIBUTION_CLAIM_SIGNING_SECRET, /^[A-Za-z0-9_-]{64}$/);
  assert.match(firstValues.OWNED_RETENTION_INGEST_TOKEN, /^[A-Za-z0-9_-]{64}$/);
  assert.equal(statSync(output).mode & 0o777, 0o600);
  for (const secret of [
    sharedKey,
    cqToken,
    posthogKey,
    firstValues.ATTRIBUTION_PUBLICATION_CONTROL_TOKEN,
    firstValues.ATTRIBUTION_CLAIM_SIGNING_SECRET,
    firstValues.OWNED_RETENTION_INGEST_TOKEN,
  ]) {
    assert.ok(!`${first.stdout}${first.stderr}`.includes(secret));
  }

  const second = run();
  assert.equal(second.status, 0, second.stderr);
  const secondValues = dotenv.parse(readFileSync(output, 'utf8'));
  assert.equal(
    secondValues.ATTRIBUTION_PUBLICATION_CONTROL_TOKEN,
    firstValues.ATTRIBUTION_PUBLICATION_CONTROL_TOKEN,
  );
  assert.equal(
    secondValues.ATTRIBUTION_CLAIM_SIGNING_SECRET,
    firstValues.ATTRIBUTION_CLAIM_SIGNING_SECRET,
  );
  assert.equal(
    secondValues.OWNED_RETENTION_INGEST_TOKEN,
    firstValues.OWNED_RETENTION_INGEST_TOKEN,
  );

  const publicSource = privateFile('public-shared.env', readFileSync(shared, 'utf8'));
  chmodSync(publicSource, 0o644);
  const insecure = run(['--shared-env', publicSource], join(work, 'insecure.env'));
  assert.notEqual(insecure.status, 0);
  assert.match(insecure.stderr, /no group\/world permissions/);
  assert.ok(!insecure.stderr.includes(sharedKey));

  const scrubbed = privateFile(
    'scrubbed.env',
    'SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co\n'
      + 'SUPABASE_SERVICE_ROLE_KEY=__managed_by_external_secret__\n',
  );
  const rejected = run(['--shared-env', scrubbed], join(work, 'scrubbed-output.env'));
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /missing or scrubbed/);

  const symlink = join(work, 'shared-link.env');
  symlinkSync(shared, symlink);
  const linked = run(['--shared-env', symlink], join(work, 'linked.env'));
  assert.notEqual(linked.status, 0);
  assert.match(linked.stderr, /non-symlink regular file/);

  console.log('PASS owned-outcome private runtime builder');
} finally {
  rmSync(work, { recursive: true, force: true });
}
