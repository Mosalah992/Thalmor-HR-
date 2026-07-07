# roster-sync

## ADDED Requirements

### Requirement: Username-to-row matching
The sync SHALL match scanned usernames against the roster sheet's Discord column (E, rows 4+) using normalized comparison: trimmed, lowercased, leading `@` stripped, and cells containing multiple handles separated by `/` matched on any part.

#### Scenario: Simple handle match
- **WHEN** author `oryninc` is scanned and a roster cell contains `@oryninc`
- **THEN** the author resolves to that roster row

#### Scenario: Multi-handle cell
- **WHEN** author `slimely` is scanned and a roster cell contains `@roselord / slimely`
- **THEN** the author resolves to that roster row

#### Scenario: Unknown author
- **WHEN** a scanned author matches no roster cell
- **THEN** the author is listed in the run summary as unmatched and no cell is written for them

### Requirement: Last Active and Total Clock-ins cell updates
The sync SHALL write each matched member's last-seen timestamp (formatted `YYYY-MM-DD HH:mm`, UTC) to column H and their total clock-in count to column I of that member's row, in a single batched update, and MUST NOT write to any other row or column, the header rows (1–3), or the stats block (columns J+). The `Total Clock-ins` header SHALL be created at I3 if missing.

#### Scenario: Single batched write
- **WHEN** a run finds updates for 40 members
- **THEN** all H and I cells for those members are written in one batch request

#### Scenario: Member with no roster changes
- **WHEN** a roster member posted nothing new since the last run
- **THEN** that member's H and I cells hold the same values after the run

### Requirement: Monotonic Last Active
A Last Active cell SHALL only be overwritten when the scanned timestamp is newer than the currently stored value or the cell is empty; re-running the sync MUST be idempotent.

#### Scenario: Sync run twice in a row
- **WHEN** the sync runs twice with no new channel messages in between
- **THEN** the second run changes no cell values

#### Scenario: Hand-entered newer value
- **WHEN** an officer manually entered a Last Active newer than any scanned message
- **THEN** the cell is left untouched

### Requirement: Run summary report
Each run SHALL produce a summary (members updated, unmatched authors with their counts) printed to the console and, when a log channel is configured, posted to that Discord channel.

#### Scenario: Run with unmatched authors
- **WHEN** a run finds 3 authors that match no roster row
- **THEN** the summary lists those 3 usernames with their message counts and last-seen times
