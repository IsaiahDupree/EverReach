import assert from 'node:assert/strict';
import { parse as parseQuery } from 'node:querystring';

import {
  buildAttributionTrackedUrl,
  InvalidAttributionDestinationError,
} from '../lib/attribution-tracked-url';

const dimensions = {
  contentId: 'content-42',
  publishedId: 'published-99',
  campaignId: 'campaign-7',
  offerId: 'offer-3',
  sourcePlatform: 'youtube',
};
const tracked = buildAttributionTrackedUrl(
  'https://everreach.app/get-started?plan=creator&actp_content_id=stale&ACTP_TOUCH_TOKEN=static#pricing',
  dimensions,
  'v1.signed.publication-claim',
  { utmSource: 'newsletter', utmCampaign: 'launch' },
);
const parsed = new globalThis.URL(tracked);
const query = parseQuery(parsed.href.split('?')[1].split('#')[0]);

assert.equal(parsed.protocol, 'https:');
assert.equal(parsed.hash, '#pricing');
assert.equal(query.plan, 'creator');
assert.equal(query.actp_content_id, dimensions.contentId);
assert.equal(query.actp_published_id, dimensions.publishedId);
assert.equal(query.actp_campaign_id, dimensions.campaignId);
assert.equal(query.actp_offer_id, dimensions.offerId);
assert.equal(query.actp_source_platform, dimensions.sourcePlatform);
assert.equal(query.actp_publication_claim, 'v1.signed.publication-claim');
assert.equal(query.actp_touch_token, undefined);
assert.equal(query.ACTP_TOUCH_TOKEN, undefined);
assert.equal(query.utm_source, 'newsletter');
assert.equal(query.utm_campaign, 'launch');

assert.throws(
  () => buildAttributionTrackedUrl(
    'http://everreach.app/get-started',
    dimensions,
    'claim',
  ),
  InvalidAttributionDestinationError,
);
assert.throws(
  () => buildAttributionTrackedUrl(
    'https://user:password@everreach.app/get-started',
    dimensions,
    'claim',
  ),
  InvalidAttributionDestinationError,
);
assert.throws(
  () => buildAttributionTrackedUrl(
    `https://everreach.app/get-started?existing=${'x'.repeat(1_900)}`,
    dimensions,
    'v1.signed.publication-claim',
  ),
  InvalidAttributionDestinationError,
);

console.log('PASS attribution publication tracked URL contract');
