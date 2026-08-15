const apiKeysEnv = process.env.APIFY_KEYS_ARRAY || process.env.APIFY_API_TOKEN || '';
const API_KEYS = apiKeysEnv.split(',').map(k => k.trim()).filter(Boolean);

let currentKeyIndex = 0;

function getCurrentApifyKey() {
  if (API_KEYS.length === 0) return null;
  return API_KEYS[currentKeyIndex];
}

function rotateApifyKey() {
  if (API_KEYS.length <= 1) return getCurrentApifyKey();
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`🔄 Rotated Apify API key to index ${currentKeyIndex}`);
  return getCurrentApifyKey();
}

function getKeyCount() {
  return API_KEYS.length;
}

module.exports = {
  getCurrentApifyKey,
  rotateApifyKey,
  getKeyCount
};
