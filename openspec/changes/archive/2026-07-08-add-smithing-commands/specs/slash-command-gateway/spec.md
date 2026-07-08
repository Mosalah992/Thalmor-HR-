# slash-command-gateway

## ADDED Requirements

### Requirement: Interaction requests are verified before processing
The Worker SHALL verify the Ed25519 signature (`X-Signature-Ed25519` + `X-Signature-Timestamp`
over the raw body, against the app public key) of every incoming request and MUST reject
unverified requests with HTTP 401 before any routing or Google API access.

#### Scenario: Invalid signature
- **WHEN** a request arrives with a missing or invalid signature
- **THEN** the Worker responds 401 and performs no command processing

#### Scenario: Discord PING
- **WHEN** a validly signed interaction of type PING (1) arrives
- **THEN** the Worker responds with PONG (`{"type":1}`), allowing the Interactions Endpoint URL to validate

### Requirement: Only allowlisted users may run commands
The Worker SHALL check the invoking user's Discord ID against the `ALLOWED_USER_IDS` list on
every application-command interaction. Non-allowlisted users MUST receive an ephemeral refusal
and no sheet access may occur. Autocomplete requests from non-allowlisted users SHALL return an
empty choice list.

#### Scenario: Quartermaster invokes a command
- **WHEN** an allowlisted user runs `/add`, `/remove`, or `/stock`
- **THEN** the command is processed normally

#### Scenario: Other member invokes a command
- **WHEN** a user not in `ALLOWED_USER_IDS` runs any command
- **THEN** they receive an ephemeral "quartermaster only" reply and the sheet is not read or written

### Requirement: Commands respond within Discord's deadline
Command interactions SHALL be acknowledged with a deferred response (type 5) immediately, with
the result delivered by editing the original response after the Sheets round-trip completes.
Autocomplete interactions SHALL be answered synchronously (type 8).

#### Scenario: Slow Sheets API call
- **WHEN** the Google round-trip takes longer than 3 seconds
- **THEN** the user still sees "thinking…" immediately and receives the result when the write completes, with no "application did not respond" error

### Requirement: Guild command registration requires no server admin rights
The registration script SHALL register `/add`, `/remove`, and `/stock` as guild-scoped commands
using only the bot token and application ID, replacing the full command set idempotently (PUT).
Registration MUST NOT require channel IDs, channel permissions, or any Discord server setting.

#### Scenario: Re-running registration
- **WHEN** `node scripts/register-commands.js` is run twice
- **THEN** the guild ends up with exactly the three commands, not duplicates
