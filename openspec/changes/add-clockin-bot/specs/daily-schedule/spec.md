# daily-schedule

## ADDED Requirements

### Requirement: Daily automated run
The sync SHALL run automatically once per day via the configured scheduler (GitHub Actions cron or Windows Task Scheduler) without human intervention.

#### Scenario: Scheduled execution
- **WHEN** the scheduled time (default 04:00 UTC) is reached
- **THEN** the sync runs to completion and produces its summary

#### Scenario: Missed run self-heals
- **WHEN** a scheduled run is skipped (host off, outage)
- **THEN** the next successful run brings all cells fully up to date, because every run rescans the complete history

### Requirement: Manual on-demand run
An operator SHALL be able to trigger the sync manually at any time (workflow dispatch or running the script directly), with identical behavior to a scheduled run.

#### Scenario: Manual trigger
- **WHEN** the operator runs the sync manually
- **THEN** it executes the same scan-match-write-report cycle

### Requirement: Dry-run mode
The script SHALL support a dry-run flag that performs the full scan and match but prints intended writes instead of modifying the sheet.

#### Scenario: Dry run
- **WHEN** the sync is run with `--dry-run`
- **THEN** the intended H/I updates and the summary are printed and no sheet cell changes
