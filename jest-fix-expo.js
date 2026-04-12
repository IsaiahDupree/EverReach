/**
 * Fix for expo's lazy global installation conflicting with jest's isInsideTestCode check.
 *
 * expo/src/winter/runtime.native installs lazy getters for globals via installGlobal.
 * When these getters fire outside a test/hook context, jest throws because isInsideTestCode===false.
 *
 * Pre-stubbing these globals prevents the lazy getter from ever firing (since installGlobal
 * sees an existing configurable property and won't overwrite it with a lazy getter... actually
 * it WILL overwrite. Better approach: use a non-configurable property so installGlobal bails.
 *
 * Actually installGlobal checks: if existing & !configurable → error + return early.
 * So we use configurable: false on stubs to prevent installGlobal from replacing them.
 */

// Globals installed by expo/src/winter/runtime.native that need stubbing:
const stubGlobals = {
  __ExpoImportMetaRegistry: { url: '', registry: { get: () => null, set: () => {} } },
  structuredClone: (obj) => JSON.parse(JSON.stringify(obj)),
  // TextDecoder, URL, URLSearchParams, TextDecoderStream, TextEncoderStream
  // are already provided by Node.js 18+, so only stub if missing.
};

for (const [name, value] of Object.entries(stubGlobals)) {
  if (typeof global[name] === 'undefined') {
    Object.defineProperty(global, name, {
      value,
      configurable: false, // prevent expo's installGlobal from replacing with lazy getter
      enumerable: false,
      writable: false,
    });
  } else if (name === '__ExpoImportMetaRegistry') {
    // Force-stub even if it exists
    try {
      Object.defineProperty(global, name, {
        value,
        configurable: false,
        enumerable: false,
        writable: false,
      });
    } catch (e) {
      // ignore if already non-configurable
    }
  }
}
