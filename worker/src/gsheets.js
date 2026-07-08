// Google Sheets client for Workers — service-account JWT via WebCrypto.
// Mirrors src/sheets.js but uses crypto.subtle instead of node:crypto.

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlJSON = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

function pemToPkcs8(pem) {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Access token cached in module scope; isolates are reused between requests.
let cached = { token: null, exp: 0 };

export async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && now < cached.exp - 300) return cached.token;

  // Strip a possible UTF-8 BOM/whitespace picked up when the secret was uploaded.
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON.replace(/^﻿/, '').trim());
  const header = b64urlJSON({ alg: 'RS256', typ: 'JWT' });
  const claims = b64urlJSON({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  });
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${JSON.stringify(data).slice(0, 300)}`);
  cached = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cached.token;
}

async function api(token, sheetId, method, path, body) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets ${method} ${path.split('?')[0]} -> ${res.status}: ${data.error && data.error.message}`);
  }
  return data;
}

/** Rows (array of string arrays) of A:D of the smithing tab. */
export async function readLedgerRows(env, token) {
  const range = encodeURIComponent(`'${env.SMITHING_TAB}'!A:D`);
  const data = await api(token, env.SHEET_ID, 'GET', `/values/${range}`);
  return data.values || [];
}

/** Write a single Qty cell (column B of the given 1-based row). */
export async function writeQty(env, token, row, qty) {
  const range = encodeURIComponent(`'${env.SMITHING_TAB}'!B${row}`);
  return api(token, env.SHEET_ID, 'PUT', `/values/${range}?valueInputOption=RAW`, {
    values: [[qty]],
  });
}
