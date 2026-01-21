/**
 * Metrics Hooks
 * React Query hooks for fetching metrics data
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useOrganizationMetrics(params?: { since?: string; until?: string; team?: string }) {
  return useQuery({
    queryKey: ['organization-metrics', params],
    queryFn: () => api.getOrganizationMetrics(params),
  });
}

export function useEngineerMetrics(username: string, params?: { since?: string; until?: string }) {
  return useQuery({
    queryKey: ['engineer-metrics', username, params],
    queryFn: () => api.getEngineerMetrics(username, params),
    enabled: !!username,
  });
}

export function useEngineers() {
  return useQuery({
    queryKey: ['engineers'],
    queryFn: api.getEngineers,
  });
}

export function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: api.getRepositories,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
  });
}
