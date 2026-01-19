/**
 * User Filtering Utilities
 * Helper functions for filtering users in reports
 */

/**
 * Check if a username appears to be a bot
 * Detects:
 * - Usernames containing [bot]
 * - Username equals "Copilot" (case-insensitive)
 */
export function isBot(username: string): boolean {
  return username.includes('[bot]') || username.toLowerCase() === 'copilot';
}

/**
 * Filter out bot users from a list of usernames
 */
export function filterBots(usernames: string[]): string[] {
  return usernames.filter((username) => !isBot(username));
}

/**
 * Check if a user should be excluded based on exclusion list
 */
export function isExcluded(username: string, excludedUsers: string[]): boolean {
  return excludedUsers.includes(username);
}

/**
 * Filter users based on bot detection and exclusion list
 */
export function filterUsers(
  usernames: string[],
  options: {
    includeBots?: boolean;
    excludedUsers?: string[];
  } = {}
): string[] {
  const { includeBots = false, excludedUsers = [] } = options;

  return usernames.filter((username) => {
    // Filter bots if not including them
    if (!includeBots && isBot(username)) {
      return false;
    }

    // Filter excluded users
    if (isExcluded(username, excludedUsers)) {
      return false;
    }

    return true;
  });
}
