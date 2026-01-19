---
id: task-016
title: Create GitHub API integration guide
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 15:18'
updated_date: '2025-10-03 15:29'
labels:
  - documentation
  - github
dependencies: []
priority: medium
---

## Description

Document lessons learned from GitHub API integration, gotchas, best practices, and rate limit strategies to help future development and troubleshooting.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub API rate limits explained (Core: 5000/hr vs Search: 1800/hr)
- [x] #2 API gotchas documented (pulls.list vs pulls.get missing fields)
- [x] #3 Best practices for API usage (retry logic, pagination, throttling)
- [x] #4 Cost estimation guide (requests per PR/repo/org)
- [x] #5 When to use which endpoint (list vs get vs search)
- [x] #6 Rate limit monitoring and optimization strategies
- [x] #7 Real examples from our implementation
- [x] #8 All quality checks pass
<!-- AC:END -->

## Implementation Notes

Created comprehensive GitHub API integration guide documenting all lessons learned, gotchas, best practices, and optimization strategies.

**Content:**
- Rate limits explained (Core: 5000/hr vs Search: 1800/hr)
- 4 critical API gotchas with solutions:
  - pulls.list vs pulls.get (missing fields!)
  - Null vs undefined vs missing
  - Pagination not automatic
  - Rate limits hit suddenly
- Best practices (pagination, validation, retry, monitoring)
- Complete endpoint reference
- Cost estimation formulas
- Optimization strategies (filtering, caching, parallel, ETags)
- Error messages and solutions
- Performance benchmarks
- Real-world examples from testing

**File:** backlog/docs/doc-002 - GitHub API Integration Guide.md (650 lines)
