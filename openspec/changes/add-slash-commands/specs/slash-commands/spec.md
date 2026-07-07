# slash-commands

## ADDED Requirements

### Requirement: Signature-verified interactions endpoint
The Worker SHALL verify every incoming request's Ed25519 signature against the application public key and respond 401 to invalid signatures; it SHALL answer Discord PING interactions with PONG.

#### Scenario: Discord endpoint validation
- **WHEN** Discord sends a PING interaction with a valid signature
- **THEN** the Worker responds `{type: 1}` and Discord accepts the endpoint URL

#### Scenario: Forged request
- **WHEN** a request arrives with a missing or invalid signature
- **THEN** the Worker responds 401 and performs no action

### Requirement: /help command
`/help` SHALL reply (ephemeral) with the bot's purpose, the available commands, the sync schedule, and a link to the roster sheet, and SHALL be usable by all members.

#### Scenario: Member asks for help
- **WHEN** any member runs `/help`
- **THEN** an ephemeral reply describes clock-in tracking, /scan, /sync, and the daily 04:00 UTC schedule

### Requirement: /scan and /sync trigger the sync workflow
`/scan` SHALL dispatch the GitHub sync workflow with `dry_run=true` and `/sync` with `dry_run=false`, both passing the invoking channel ID as `log_channel`, and reply ephemerally that the run started; dispatch failures SHALL be reported in the reply.

#### Scenario: Officer runs /sync
- **WHEN** an officer runs `/sync`
- **THEN** the workflow is dispatched with dry_run=false and the reply says results will post to this channel shortly

#### Scenario: GitHub dispatch fails
- **WHEN** the GitHub API returns an error to the Worker
- **THEN** the ephemeral reply states the failure and no success is claimed

### Requirement: Officer-only registration
`/scan` and `/sync` SHALL be registered with `default_member_permissions=0` so only administrators (and roles later granted via Server Settings → Integrations) can use them.

#### Scenario: Regular member
- **WHEN** a member without granted roles opens the command picker
- **THEN** /scan and /sync are not available to them
