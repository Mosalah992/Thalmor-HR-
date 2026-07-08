// Structured logging: one JSON object per line alongside the human-readable
// output, so Actions logs stay greppable/parseable. log('event.name', {...})
function log(event, fields = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields }));
}

function logError(event, err, fields = {}) {
  log(event, { ...fields, error: err && err.message, stack: err && err.stack });
}

module.exports = { log, logError };
