---
id: task-032
title: Stop sync immediately on rate limit hit
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 10:13'
updated_date: '2025-10-04 10:14'
labels:
  - bug
  - github-api
dependencies: []
priority: high
---

## Description

When GitHub rate limit is exceeded, stop the sync immediately instead of retrying. Show when quota resets and suggest resuming with same command.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Detect rate limit errors in GitHubClient (status 403/429)
- [x] #2 Throw GitHubRateLimitError with reset time
- [x] #3 Catch error in GitHubSynchronizer and break loop
- [x] #4 Show user-friendly message with reset time
- [x] #5 Show minutes until reset
- [x] #6 Suggest exact command to resume
- [ ] #7 Test by intentionally hitting rate limit
<!-- AC:END -->

## Implementation Notes

Added rate limit detection in GitHubClient (status 403/429). Throws GitHubRateLimitError with reset time. GitHubSynchronizer catches error, stops sync immediately, shows reset time and minutes until reset, suggests resuming with same command. No more wasteful retries!
