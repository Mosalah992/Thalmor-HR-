// Structured logging: one JSON object per line, visible in `wrangler tail`
// and the Cloudflare dashboard. log('event.name', { field: value })
export function log(event, fields = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields }));
}

export function logError(event, err, fields = {}) {
  log(event, { ...fields, error: err && err.message, stack: err && err.stack });
}
