# clockin-scan

## ADDED Requirements

### Requirement: Full channel history scan
Each sync run SHALL page through the entire message history of the configured clock-in channel via the Discord REST API and aggregate, per author username, the newest message timestamp and the total message count.

#### Scenario: Member with multiple messages
- **WHEN** a member has posted 12 messages in the clock-in channel, the newest on 2026-07-06 18:30 UTC
- **THEN** the scan yields last-seen `2026-07-06 18:30` UTC and total `12` for that member

#### Scenario: Bot and webhook messages excluded
- **WHEN** the channel contains messages from bots or webhooks
- **THEN** those messages contribute to no author's last-seen or total

### Requirement: Post time as clock-in time
The scan SHALL use each message's post timestamp (UTC) as the clock-in time and MUST NOT depend on message content, so the Message Content privileged intent is not required.

#### Scenario: Message containing a hammertime tag
- **WHEN** a member's message body contains a `<t:...>` timestamp tag
- **THEN** the recorded clock-in time is still the message's post time

### Requirement: Complete-scan-or-nothing
If the history scan fails partway (rate limit exhaustion, network error after retries), the run SHALL abort without writing to the sheet.

#### Scenario: Discord API fails mid-scan
- **WHEN** message pagination fails after retries on page N
- **THEN** no sheet cells are modified and the run exits with an error summary
