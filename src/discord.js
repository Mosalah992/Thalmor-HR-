// Discord REST client — paged history fetch + summary post, rate-limit aware.
const API = 'https://discord.com/api/v10';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, token, options = {}) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const wait = Math.ceil((body.retry_after || 1) * 1000) + 250;
      console.warn(`  rate limited, waiting ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (res.status >= 500) {
      await sleep(1000 * attempt);
      continue;
    }
    const data = res.status === 204 ? null : await res.json();
    if (!res.ok) {
      const err = new Error(`Discord ${options.method || 'GET'} ${path} -> ${res.status}: ${data && data.message}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }
  throw new Error(`Discord ${path}: retries exhausted`);
}

/**
 * Fetch the channel's complete message history, newest -> oldest.
 * Throws on any unrecoverable error (complete-scan-or-nothing).
 * @returns {Promise<object[]>} all message objects
 */
async function fetchAllMessages(channelId, token) {
  const all = [];
  let before = null;
  for (;;) {
    const qs = `limit=100${before ? `&before=${before}` : ''}`;
    const page = await request(`/channels/${channelId}/messages?${qs}`, token);
    all.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].id;
    if (all.length % 1000 === 0) console.log(`  scanned ${all.length} messages...`);
  }
  return all;
}

/** Post a plain message (used for the run summary). */
function postMessage(channelId, token, content) {
  return request(`/channels/${channelId}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ content: content.slice(0, 2000) }),
  });
}

module.exports = { fetchAllMessages, postMessage };
