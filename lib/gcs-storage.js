/**
 * GCS Storage Helper
 * Uses service account for authentication
 */

const BUCKET = process.env.GCS_BUCKET || 'ko-platform-data';
const SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY;

// Create JWT token for GCS authentication
async function getAccessToken() {
  if (!SERVICE_ACCOUNT_KEY) {
    console.warn('GCS_SERVICE_ACCOUNT_KEY not set, using in-memory fallback');
    return null;
  }

  try {
    const keyData = JSON.parse(SERVICE_ACCOUNT_KEY);

    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: keyData.client_email,
      scope: 'https://www.googleapis.com/auth/devstorage.full_control',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    // Base64url encode
    const base64url = (obj) => {
      const json = JSON.stringify(obj);
      const base64 = Buffer.from(json).toString('base64');
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const signatureInput = `${base64url(header)}.${base64url(payload)}`;

    // Sign with private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(keyData.private_key, 'base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Failed to get GCS access token:', error);
    return null;
  }
}

// In-memory fallback storage
const memoryStorage = new Map();

export async function readJSON(path) {
  const token = await getAccessToken();

  if (!token) {
    const data = memoryStorage.get(path);
    return data ? JSON.parse(data) : null;
  }

  try {
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GCS read failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GCS read error:', error);
    const fallback = memoryStorage.get(path);
    return fallback ? JSON.parse(fallback) : null;
  }
}

export async function writeJSON(path, data) {
  const token = await getAccessToken();
  const jsonData = JSON.stringify(data, null, 2);

  if (!token) {
    memoryStorage.set(path, jsonData);
    return true;
  }

  try {
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: jsonData
    });

    if (!response.ok) {
      throw new Error(`GCS write failed: ${response.status}`);
    }

    // Also update memory cache
    memoryStorage.set(path, jsonData);
    return true;
  } catch (error) {
    console.error('GCS write error:', error);
    memoryStorage.set(path, jsonData);
    return true;
  }
}

export async function deleteObject(path) {
  const token = await getAccessToken();

  if (!token) {
    memoryStorage.delete(path);
    return true;
  }

  try {
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(path)}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    memoryStorage.delete(path);
    return true;
  } catch (error) {
    console.error('GCS delete error:', error);
    return false;
  }
}
