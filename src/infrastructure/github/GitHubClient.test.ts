import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubConfig } from '../config/schema';
import { SilentLogger } from '../logging';
import { GitHubClient } from './GitHubClient';

// Mock Octokit
const mockPullsList = vi.fn();
const mockPullsListReviews = vi.fn();
const mockPullsListReviewComments = vi.fn();
const mockPullsListCommits = vi.fn();
const mockIssuesListComments = vi.fn();
const mockRateLimitGet = vi.fn();

vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => {
      return {
        pulls: {
          list: mockPullsList,
          listReviews: mockPullsListReviews,
          listReviewComments: mockPullsListReviewComments,
          listCommits: mockPullsListCommits,
        },
        issues: {
          listComments: mockIssuesListComments,
        },
        rateLimit: {
          get: mockRateLimitGet,
        },
      };
    }),
  };
});

describe('GitHubClient', () => {
  let client: GitHubClient;
  const testConfig: GitHubConfig = {
    token: 'test-token',
    organization: 'test-org',
    rateLimit: {
      maxRetries: 2,
      backoffMs: 100,
    },
  };

  const mockRateLimitResponse = {
    data: {
      resources: {
        core: { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 },
        search: { limit: 30, remaining: 30, reset: 1234567890, used: 0 },
        graphql: { limit: 5000, remaining: 5000, reset: 1234567890, used: 0 },
      },
      rate: { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitGet.mockResolvedValue(mockRateLimitResponse);
    client = new GitHubClient(testConfig, new SilentLogger());
  });

  describe('constructor', () => {
    it('creates GitHubClient with config', () => {
      expect(client).toBeInstanceOf(GitHubClient);
      expect(client.getOrganization()).toBe('test-org');
    });
  });

  describe('checkRateLimit', () => {
    it('fetches and parses rate limit', async () => {
      const rateLimit = await client.checkRateLimit();

      expect(rateLimit.limit).toBe(5000);
      expect(rateLimit.remaining).toBe(4999);
      expect(rateLimit.used).toBe(1);
      expect(mockRateLimitGet).toHaveBeenCalled();
    });
  });

  describe('fetchPullRequests', () => {
    const mockPRs = [
      {
        id: 1,
        number: 100,
        title: 'Test PR',
        state: 'open',
        user: { login: 'testuser', id: 1, type: 'User' },
        body: 'Test body',
        created_at: '2025-10-01T00:00:00Z',
        updated_at: '2025-10-01T00:00:00Z',
        closed_at: null,
        merged_at: null,
        merged_by: null,
        draft: false,
        additions: 10,
        deletions: 5,
        changed_files: 2,
        comments: 1,
        review_comments: 2,
        commits: 3,
        labels: [{ name: 'bug' }],
        requested_reviewers: [],
        html_url: 'https://github.com/test-org/test-repo/pull/100',
        head: {
          ref: 'feature-branch',
        },
        base: {
          ref: 'main',
          repo: {
            name: 'test-repo',
            full_name: 'test-org/test-repo',
          },
        },
      },
    ];

    it('fetches all pull requests for a repository sorted by updated_at', async () => {
      mockPullsList.mockResolvedValue({ data: mockPRs });

      const prs = await client.fetchPullRequests({ repo: 'test-repo', state: 'all' });

      expect(prs).toHaveLength(1);
      expect(prs[0]?.number).toBe(100);
      expect(prs[0]?.title).toBe('Test PR');
      expect(mockPullsList).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        page: 1,
      });
    });

    it('respects limit parameter', async () => {
      const multiplePRs = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        number: i,
        title: `PR ${i}`,
        state: 'open' as const,
        user: { login: 'testuser', id: 1, type: 'User' },
        body: null,
        created_at: '2025-10-01T00:00:00Z',
        updated_at: '2025-10-01T00:00:00Z',
        closed_at: null,
        merged_at: null,
        merged_by: null,
        draft: false,
        additions: 10,
        deletions: 5,
        changed_files: 2,
        comments: 0,
        review_comments: 0,
        commits: 1,
        labels: [],
        requested_reviewers: [],
        html_url: `https://github.com/test-org/test-repo/pull/${i}`,
        head: {
          ref: 'feature',
        },
        base: {
          ref: 'main',
          repo: {
            name: 'test-repo',
            full_name: 'test-org/test-repo',
          },
        },
      }));

      mockPullsList.mockResolvedValue({ data: multiplePRs });

      const prs = await client.fetchPullRequests({ repo: 'test-repo', limit: 3 });

      expect(prs).toHaveLength(3);
    });

    it('filters by updated_at date with since parameter', async () => {
      const olderPR = {
        ...mockPRs[0]!,
        updated_at: '2025-09-01T00:00:00Z',
      };

      mockPullsList.mockResolvedValue({ data: [olderPR] });

      const prs = await client.fetchPullRequests({
        repo: 'test-repo',
        since: new Date('2025-09-15T00:00:00Z'),
      });

      expect(prs).toHaveLength(0);
    });
  });

  describe('fetchPRCommits', () => {
    const mockCommits = [
      {
        sha: 'abc123',
        commit: {
          author: { name: 'Test User', email: 'test@example.com', date: '2025-10-01T00:00:00Z' },
          committer: { name: 'Test User', email: 'test@example.com', date: '2025-10-01T00:00:00Z' },
          message: 'Test commit',
        },
        author: { login: 'testuser', id: 1, type: 'User' },
        parents: [{ sha: 'parent1' }],
      },
    ];

    it('fetches commits for a pull request', async () => {
      mockPullsListCommits.mockResolvedValue({ data: mockCommits });

      const commits = await client.fetchPRCommits('test-repo', 100);

      expect(commits).toHaveLength(1);
      expect(commits[0]?.sha).toBe('abc123');
      expect(commits[0]?.commit.message).toBe('Test commit');
      expect(mockPullsListCommits).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        pull_number: 100,
        per_page: 100,
        page: 1,
      });
    });
  });

  describe('fetchReviews', () => {
    it('fetches reviews for a pull request', async () => {
      const mockReviews = [
        {
          id: 1,
          user: { login: 'reviewer', id: 2, type: 'User' },
          body: 'Looks good!',
          state: 'APPROVED' as const,
          submitted_at: '2025-10-01T00:00:00Z',
          html_url: 'https://github.com/test-org/test-repo/pull/100#review-1',
        },
      ];

      mockPullsListReviews.mockResolvedValue({ data: mockReviews });

      const reviews = await client.fetchReviews('test-repo', 100);

      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.user?.login).toBe('reviewer');
      expect(reviews[0]?.state).toBe('APPROVED');
      expect(mockPullsListReviews).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        pull_number: 100,
        per_page: 100,
        page: 1,
      });
    });
  });

  describe('fetchAllComments', () => {
    it('fetches both issue and review comments', async () => {
      const mockIssueComments = [
        {
          id: 1,
          user: { login: 'commenter1', id: 3, type: 'User' },
          body: 'Issue comment',
          created_at: '2025-10-01T00:00:00Z',
          updated_at: '2025-10-01T00:00:00Z',
          html_url: 'https://github.com/test-org/test-repo/pull/100#issuecomment-1',
        },
      ];

      const mockReviewComments = [
        {
          id: 2,
          user: { login: 'commenter2', id: 4, type: 'User' },
          body: 'Review comment',
          created_at: '2025-10-01T01:00:00Z',
          updated_at: '2025-10-01T01:00:00Z',
          html_url: 'https://github.com/test-org/test-repo/pull/100#discussion_r2',
        },
      ];

      mockIssuesListComments.mockResolvedValue({ data: mockIssueComments });
      mockPullsListReviewComments.mockResolvedValue({ data: mockReviewComments });

      const comments = await client.fetchAllComments('test-repo', 100);

      expect(comments).toHaveLength(2);
      expect(comments[0]?.body).toBe('Issue comment');
      expect(comments[1]?.body).toBe('Review comment');
      expect(mockIssuesListComments).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        issue_number: 100,
        per_page: 100,
        page: 1,
      });
      expect(mockPullsListReviewComments).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        pull_number: 100,
        per_page: 100,
        page: 1,
      });
    });
  });

  describe('getRateLimit', () => {
    it('returns null before rate limit is checked', () => {
      const freshClient = new GitHubClient(testConfig, new SilentLogger());
      expect(freshClient.getRateLimit()).toBeNull();
    });

    it('returns rate limit after checking', async () => {
      await client.checkRateLimit();
      const rateLimit = client.getRateLimit();

      expect(rateLimit).not.toBeNull();
      expect(rateLimit?.remaining).toBe(4999);
    });
  });
});
