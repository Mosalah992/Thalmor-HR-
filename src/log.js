// Structured logging: one JSON object per line alongside the human-readable
// output, so Actions logs stay greppable/parseable. log('event.name', {...})
const fs = require('fs');
const path = require('path');

function log(event, fields = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields }));
}

function logError(event, err, fields = {}) {
  log(event, { ...fields, error: err && err.message, stack: err && err.stack });
}

/**
 * Persist a full run report as a JSON file (one file per run) under LOG_DIR
 * (default ./logs). Returns the file path.
 */
function writeRunLog(report, dir = process.env.LOG_DIR || 'logs') {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  const file = path.join(dir, `sync-${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return file;
}

module.exports = { log, logError, writeRunLog };
