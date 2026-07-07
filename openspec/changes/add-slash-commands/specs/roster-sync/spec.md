# roster-sync

## MODIFIED Requirements

### Requirement: Run summary report
Each run SHALL produce a summary (members updated, unmatched authors with their counts) printed to the console and, when a log channel is configured, posted to that Discord channel — including dry-runs, whose summary SHALL be clearly marked as a dry-run.

#### Scenario: Run with unmatched authors
- **WHEN** a run finds 3 authors that match no roster row
- **THEN** the summary lists those 3 usernames with their message counts and last-seen times

#### Scenario: Dry-run triggered from Discord
- **WHEN** a dry-run executes with a log channel configured
- **THEN** the summary is posted to that channel and is labeled as a dry-run with no cells modified
