/**
 * Team Utilities
 * Helper functions for working with team configuration
 */

import type { TeamsConfig, Team } from './schema';

/**
 * Get all team IDs
 */
export function getTeamIds(teams: TeamsConfig): string[] {
  return Object.keys(teams);
}

/**
 * Get team by ID
 */
export function getTeam(teams: TeamsConfig, teamId: string): Team | undefined {
  return teams[teamId];
}

/**
 * Get all engineers in a team
 */
export function getTeamMembers(teams: TeamsConfig, teamId: string): string[] {
  const team = teams[teamId];
  return team?.members || [];
}

/**
 * Get all teams an engineer belongs to
 * Supports multi-team engineers (Phase 2 prep)
 */
export function getEngineerTeams(teams: TeamsConfig, engineer: string): string[] {
  return Object.entries(teams)
    .filter(([, team]) => team.members.includes(engineer))
    .map(([teamId]) => teamId);
}

/**
 * Check if an engineer is in a specific team
 */
export function isEngineerInTeam(teams: TeamsConfig, engineer: string, teamId: string): boolean {
  const team = teams[teamId];
  return team ? team.members.includes(engineer) : false;
}

/**
 * Get all engineers across all teams
 */
export function getAllEngineers(teams: TeamsConfig): string[] {
  const engineers = new Set<string>();
  Object.values(teams).forEach((team) => {
    team.members.forEach((member) => engineers.add(member));
  });
  return Array.from(engineers).sort();
}

/**
 * Get repositories for a team
 */
export function getTeamRepositories(teams: TeamsConfig, teamId: string): string[] {
  const team = teams[teamId];
  return team?.repositories || [];
}

/**
 * Find which team owns a repository (first match)
 */
export function getRepositoryTeam(teams: TeamsConfig, repository: string): string | undefined {
  return Object.entries(teams).find(([, team]) => team.repositories.includes(repository))?.[0];
}

/**
 * Validate team configuration
 */
export function validateTeams(teams: TeamsConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for empty team names
  Object.entries(teams).forEach(([teamId, team]) => {
    if (!team.name) {
      errors.push(`Team ${teamId} has no name`);
    }
    if (team.members.length === 0) {
      errors.push(`Team ${teamId} (${team.name}) has no members`);
    }
  });

  // Check for duplicate members across teams (warning only, not error)
  const memberTeams = new Map<string, string[]>();
  Object.entries(teams).forEach(([teamId, team]) => {
    team.members.forEach((member) => {
      const existing = memberTeams.get(member) || [];
      existing.push(teamId);
      memberTeams.set(member, existing);
    });
  });

  memberTeams.forEach((teamIds, member) => {
    if (teamIds.length > 1) {
      // This is actually OK for Phase 2 (multi-team engineers)
      // Just log it for awareness
      console.log(`ℹ️  Engineer ${member} belongs to multiple teams: ${teamIds.join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
