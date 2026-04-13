/**
 * geohash.ts
 *
 * Standard base-32 geohash encoding for lat/lon.
 * Used to create cache keys for weather data (~5km cells at precision 5).
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encodes latitude/longitude to a base-32 geohash string.
 *
 * @param lat Latitude (-90 to 90)
 * @param lon Longitude (-180 to 180)
 * @param precision Number of characters (default 5 for ~5km cells)
 * @returns Base-32 geohash string
 */
export function encode(lat: number, lon: number, precision: number = 5): string {
  let idx = 0;
  let bit = 0;
  let hash = '';

  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  while (hash.length < precision) {
    if (idx % 2 === 0) {
      // longitude bit
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        bit |= 1 << (4 - (idx % 5));
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
    } else {
      // latitude bit
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        bit |= 1 << (4 - (idx % 5));
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }

    idx++;

    if (idx % 5 === 0) {
      hash += BASE32[bit];
      bit = 0;
    }
  }

  return hash;
}

/**
 * Decodes a geohash back to approximate lat/lon bounding box.
 *
 * @param hash Geohash string
 * @returns { lat: number, lon: number, latMin, latMax, lonMin, lonMax }
 */
export function decode(hash: string): {
  lat: number;
  lon: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
} {
  let idx = 0;
  let bit = 0;

  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  for (const char of hash) {
    const code = BASE32.indexOf(char);
    if (code === -1) throw new Error(`Invalid geohash character: ${char}`);

    for (let i = 4; i >= 0; i--) {
      const mask = 1 << i;
      if (idx % 2 === 0) {
        // longitude
        const lonMid = (lonMin + lonMax) / 2;
        if ((code & mask) !== 0) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        // latitude
        const latMid = (latMin + latMax) / 2;
        if ((code & mask) !== 0) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      idx++;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
    latMin,
    latMax,
    lonMin,
    lonMax,
  };
}
