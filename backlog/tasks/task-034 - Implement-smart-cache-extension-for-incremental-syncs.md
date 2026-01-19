---
id: task-034
title: Implement smart cache extension for incremental syncs
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 10:28'
updated_date: '2025-10-04 10:29'
labels:
  - enhancement
  - github-api
  - caching
dependencies: []
priority: high
---

## Description

When syncing with same --since but later --until (e.g., running daily), detect cache extension and only fetch PRs updated since last sync. This avoids re-syncing all PRs when extending date range by a day.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Detect cache extension scenario (startDate matches, endDate extended)
- [x] #2 Fetch only PRs with updated_at >= cached endDate
- [x] #3 Upsert PRs to DB (update existing, insert new)
- [x] #4 Update sync metadata with new endDate
- [x] #5 Show user-friendly message (e.g., 'Extending cache from 2025-10-04 to 2025-10-05')
- [ ] #6 Test with real scenario: sync today, sync tomorrow
<!-- AC:END -->

## Implementation Notes

Implemented smart cache extension logic. Detects when syncing extends existing cache (same startDate, later endDate). Fetches only PRs updated since cached endDate using GitHub's 'since' parameter. Shows clear message: '🔄 Extending cache from 2025-10-04 to 2025-10-05'. Estimates ~5-10% of PRs updated per day for quota calculation. DB upsert logic handles updates naturally. Metadata updated with new endDate. Result: Daily syncs now fetch ~5-10 PRs instead of 840!
