// Google Sheets client — service-account JWT auth, roster read, batched write.
const crypto = require('crypto');
const fs = require('fs');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function getAccessToken(keyPath) {
  const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(sa.private_key, 'base64url')}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function api(token, sheetId, method, path, body) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets ${method} ${path} -> ${res.status}: ${data.error && data.error.message}`);
  return data;
}

/** Title of the tab with gid 0 (needed to prefix A1 ranges unambiguously). */
async function getTabTitle(token, sheetId) {
  const meta = await api(token, sheetId, 'GET', '?fields=sheets(properties(sheetId,title))');
  const tab = meta.sheets.find((s) => s.properties.sheetId === 0) || meta.sheets[0];
  return tab.properties.title;
}

/**
 * Read the roster: Discord handles (E), Last Active (H), Total Clock-ins (I),
 * plus the I3 header cell.
 */
async function readRoster(token, sheetId, tab) {
  const q = (r) => encodeURIComponent(`'${tab}'!${r}`);
  const res = await api(
    token, sheetId, 'GET',
    `/values:batchGet?ranges=${q('E4:E')}&ranges=${q('H4:I')}&ranges=${q('I3')}`,
  );
  const [eRange, hiRange, i3Range] = res.valueRanges;
  const col = (range, idx) => (range.values || []).map((r) => (r[idx] !== undefined ? String(r[idx]) : ''));
  return {
    handles: col(eRange, 0),
    lastActive: col(hiRange, 0),
    totals: col(hiRange, 1),
    totalsHeader: i3Range.values ? String(i3Range.values[0][0]) : '',
  };
}

/**
 * Write cell updates in one batch.
 * @param {{range: string, value: string|number}[]} updates  ranges WITHOUT tab prefix (e.g. "H12")
 */
async function batchWrite(token, sheetId, tab, updates) {
  if (updates.length === 0) return { totalUpdatedCells: 0 };
  return api(token, sheetId, 'POST', '/values:batchUpdate', {
    valueInputOption: 'RAW',
    data: updates.map((u) => ({ range: `'${tab}'!${u.range}`, values: [[u.value]] })),
  });
}

module.exports = { getAccessToken, getTabTitle, readRoster, batchWrite };
