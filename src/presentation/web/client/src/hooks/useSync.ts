/**
 * Sync Hooks
 * React Query hooks for sync operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: api.getSyncStatus,
    refetchInterval: (query) => {
      // Poll more frequently when sync is running
      return query.state.data?.isRunning ? 2000 : 30000;
    },
  });
}

export function useSyncProgress(jobId: string | undefined) {
  return useQuery({
    queryKey: ['sync-progress', jobId],
    queryFn: () => api.getSyncProgress(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll while job is running
      const status = query.state.data?.status;
      return status === 'running' || status === 'pending' ? 1000 : false;
    },
  });
}

export function useSyncJobs() {
  return useQuery({
    queryKey: ['sync-jobs'],
    queryFn: api.getSyncJobs,
  });
}

export function useStartSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params?: {
      since?: string;
      until?: string;
      repository?: string;
      force?: boolean;
    }) => api.startSync(params),
    onSuccess: () => {
      // Invalidate sync status to refresh
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
    },
  });
}
