/**
 * React Query hooks for Alerts API
 * Provides CRUD operations with caching and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { getAlerts, createAlert, updateAlert, deleteAlert } from '../services/api';
import type { Alert, CreateAlertRequest } from '../services/types';
import { toast } from 'sonner';

// ============================================================================
// Query Keys
// ============================================================================

export const alertsKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertsKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...alertsKeys.lists(), activeOnly] as const,
  detail: (id: number) => [...alertsKeys.all, 'detail', id] as const,
  active: () => [...alertsKeys.all, 'active'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all alerts with optional filtering
 * Short cache for frequently changing alert data
 */
export function useAlerts(
  activeOnly?: boolean,
  options?: Omit<UseQueryOptions<Alert[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Alert[], Error>({
    queryKey: alertsKeys.list(activeOnly),
    queryFn: () => getAlerts(activeOnly),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    retry: 2,
    ...options,
  });
}

/**
 * Fetch only active alerts
 */
export function useActiveAlerts(
  options?: Omit<UseQueryOptions<Alert[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Alert[], Error>({
    queryKey: alertsKeys.active(),
    queryFn: () => getAlerts(true),
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 20 * 1000, // More frequent for active alerts
    retry: 2,
    ...options,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new alert
 * Includes optimistic updates and cache invalidation
 */
export function useCreateAlert(
  options?: Omit<UseMutationOptions<Alert, Error, CreateAlertRequest, { previousAlerts?: Alert[] }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Alert, Error, CreateAlertRequest, { previousAlerts?: Alert[] }>({
    mutationFn: createAlert,
    onMutate: async (newAlert) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: alertsKeys.lists() });
      
      // Snapshot previous value
      const previousAlerts = queryClient.getQueryData<Alert[]>(alertsKeys.list());
      
      // Optimistically update - create temporary alert
      const optimisticAlert: Alert = {
        id: Date.now(), // Temporary ID
        ...newAlert,
        is_active: true,
        created_at: new Date().toISOString(),
        trigger_count: 0,
      } as Alert;
      
      queryClient.setQueryData<Alert[]>(alertsKeys.list(), (old) => 
        old ? [...old, optimisticAlert] : [optimisticAlert]
      );
      
      return { previousAlerts };
    },
    onError: (err, newAlert, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(alertsKeys.list(), context.previousAlerts);
      }
      toast.error(`Failed to create alert: ${err.message}`);
    },
    onSuccess: (data) => {
      toast.success(`Alert created for ${data.symbol}`);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
    },
    ...options,
  });
}

/**
 * Update an existing alert
 */
export function useUpdateAlert(
  options?: Omit<UseMutationOptions<Alert, Error, { id: number; data: Partial<CreateAlertRequest> }, { previousAlerts?: Alert[] }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Alert, Error, { id: number; data: Partial<CreateAlertRequest> }, { previousAlerts?: Alert[] }>({
    mutationFn: ({ id, data }) => updateAlert(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: alertsKeys.lists() });
      
      const previousAlerts = queryClient.getQueryData<Alert[]>(alertsKeys.list());
      
      // Optimistically update
      queryClient.setQueryData<Alert[]>(alertsKeys.list(), (old) =>
        old?.map((alert) => (alert.id === id ? { ...alert, ...data } : alert))
      );
      
      return { previousAlerts };
    },
    onError: (err, variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(alertsKeys.list(), context.previousAlerts);
      }
      toast.error(`Failed to update alert: ${err.message}`);
    },
    onSuccess: (data) => {
      toast.success(`Alert updated for ${data.symbol}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
    },
    ...options,
  });
}

/**
 * Delete an alert
 */
export function useDeleteAlert(
  options?: Omit<UseMutationOptions<void, Error, number, { previousAlerts?: Alert[] }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, number, { previousAlerts?: Alert[] }>({
    mutationFn: deleteAlert,
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: alertsKeys.lists() });
      
      const previousAlerts = queryClient.getQueryData<Alert[]>(alertsKeys.list());
      
      // Optimistically remove from cache
      queryClient.setQueryData<Alert[]>(alertsKeys.list(), (old) =>
        old?.filter((alert) => alert.id !== alertId)
      );
      
      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(alertsKeys.list(), context.previousAlerts);
      }
      toast.error(`Failed to delete alert: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Alert deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
    },
    ...options,
  });
}

/**
 * Bulk toggle alert status (activate/deactivate)
 */
export function useToggleAlerts(
  options?: Omit<UseMutationOptions<Alert[], Error, { alertIds: number[]; isActive: boolean }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Alert[], Error, { alertIds: number[]; isActive: boolean }>({
    mutationFn: async ({ alertIds, isActive }) => {
      // Update each alert
      const promises = alertIds.map((id) => updateAlert(id, { is_active: isActive }));
      return Promise.all(promises);
    },
    onSuccess: (data, variables) => {
      toast.success(
        `${variables.alertIds.length} alert(s) ${variables.isActive ? 'activated' : 'deactivated'}`
      );
      queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
    },
    onError: (err) => {
      toast.error(`Failed to toggle alerts: ${err.message}`);
    },
    ...options,
  });
}
