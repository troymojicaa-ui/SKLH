// src/features/reports/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReports, createReport, updateReportOnce, adminUpdateReportStatus } from './api';

export const reportsKeys = {
  all: ['reports'] as const,
};

export function useReports() {
  return useQuery({
    queryKey: reportsKeys.all,
    queryFn: fetchReports,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKeys.all }),
  });
}

export function useUpdateReportOnce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateReportOnce,
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKeys.all }),
  });
}

export function useAdminUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminUpdateReportStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKeys.all }),
  });
}
