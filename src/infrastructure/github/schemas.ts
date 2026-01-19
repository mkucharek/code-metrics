/**
 * GitHub API Response Schemas
 * Zod schemas for validating GitHub API responses
 */

import { z } from 'zod';

/**
 * GitHub User schema (simplified)
 */
export const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  type: z.string(),
});

/**
 * GitHub Repository schema
 * For listing org repositories
 */
export const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string().optional().default('main'), // Default branch name
  private: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  fork: z.boolean(),
  description: z.string().nullable(),
  pushed_at: z.string().nullable(), // Last push timestamp
});

export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

/**
 * GitHub Commit schema
 * For commit data from repos.listCommits
 */
export const GitHubCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: z.object({
      name: z.string(),
      email: z.string(),
      date: z.string(),
    }),
    committer: z.object({
      name: z.string(),
      email: z.string(),
      date: z.string(),
    }),
    message: z.string(),
  }),
  author: z
    .object({
      login: z.string(),
    })
    .nullable(),
  parents: z.array(
    z.object({
      sha: z.string(),
    })
  ),
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number(),
    })
    .optional(),
  files: z
    .array(
      z.object({
        filename: z.string(),
        status: z.string(),
        additions: z.number(),
        deletions: z.number(),
        changes: z.number(),
      })
    )
    .optional(),
});

export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;

/**
 * GitHub Pull Request schema
 * Maps to our domain PullRequest model
 *
 * Note: pulls.list returns simplified PRs without additions/deletions/etc.
 * These fields are only available via pulls.get for a single PR
 */
export const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  user: GitHubUserSchema.nullable(),
  body: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  merged_at: z.string().nullable(),
  merged_by: GitHubUserSchema.nullable().optional(),
  draft: z.boolean(),
  // Optional fields: only present when fetching a single PR via pulls.get
  additions: z.number().optional().default(0),
  deletions: z.number().optional().default(0),
  changed_files: z.number().optional().default(0),
  comments: z.number().optional().default(0),
  review_comments: z.number().optional().default(0),
  commits: z.number().optional().default(0),
  labels: z.array(
    z.object({
      name: z.string(),
    })
  ),
  requested_reviewers: z.array(GitHubUserSchema).optional().default([]),
  html_url: z.string(),
  head: z.object({
    ref: z.string(), // branch name
  }),
  base: z.object({
    ref: z.string(), // branch name
    repo: z.object({
      name: z.string(),
      full_name: z.string(),
    }),
  }),
});

export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;

/**
 * GitHub Review schema
 * Note: submitted_at can be undefined for PENDING reviews (drafts not yet submitted)
 */
export const GitHubReviewSchema = z.object({
  id: z.number(),
  user: GitHubUserSchema.nullable(),
  body: z.string().nullable(),
  state: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING']),
  submitted_at: z.string().nullish(), // Can be undefined for PENDING reviews
  html_url: z.string(),
});

export type GitHubReview = z.infer<typeof GitHubReviewSchema>;

/**
 * GitHub Comment schema (for both issue comments and review comments)
 */
export const GitHubCommentSchema = z.object({
  id: z.number(),
  user: GitHubUserSchema.nullable(),
  body: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  html_url: z.string(),
  // Review comment specific fields (undefined for issue comments)
  path: z.string().nullable().optional(),
  line: z.number().nullable().optional(),
  position: z.number().nullable().optional(),
  diff_hunk: z.string().nullable().optional(),
});

export type GitHubComment = z.infer<typeof GitHubCommentSchema>;

/**
 * GitHub Rate Limit schema
 */
export const GitHubRateLimitSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  used: z.number(),
});

export type GitHubRateLimit = z.infer<typeof GitHubRateLimitSchema>;

/**
 * GitHub Rate Limit Response schema
 */
export const GitHubRateLimitResponseSchema = z.object({
  resources: z.object({
    core: GitHubRateLimitSchema,
    search: GitHubRateLimitSchema,
    graphql: GitHubRateLimitSchema,
  }),
  rate: GitHubRateLimitSchema,
});

export type GitHubRateLimitResponse = z.infer<typeof GitHubRateLimitResponseSchema>;

/**
 * Validate array of pull requests
 */
export function validatePullRequests(data: unknown): GitHubPullRequest[] {
  return z.array(GitHubPullRequestSchema).parse(data);
}

/**
 * Validate array of reviews
 */
export function validateReviews(data: unknown): GitHubReview[] {
  return z.array(GitHubReviewSchema).parse(data);
}

/**
 * Validate array of comments
 */
export function validateComments(data: unknown): GitHubComment[] {
  return z.array(GitHubCommentSchema).parse(data);
}

/**
 * Validate array of commits
 */
export function validateCommits(data: unknown): GitHubCommit[] {
  return z.array(GitHubCommitSchema).parse(data);
}
