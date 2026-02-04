import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export const useReports = (reportId = null) => {
  const queryClient = useQueryClient();

  // 1. READ
  const reportsQuery = useQuery({
    queryKey: reportId ? ['reports', reportId] : ['reports'],
    queryFn: async () => {
      const url = reportId ? `reports/reports/${reportId}/` : 'reports/reports/';
      const response = await api.get(url);
      return response.data;
    },
  });

  // 2. CREATE (Modified for File Uploads)
  const createMutation = useMutation({
    mutationFn: (newReport) => {
      const formData = new FormData();
      
      // Append text fields
      formData.append('title', newReport.title);
      formData.append('description', newReport.description || '');
      formData.append('lat', newReport.lat);
      formData.append('lng', newReport.lng);
      formData.append('address', newReport.address || '');
      
      // Append the file (Image or Video)
      // Check if attachment exists and is an instance of File
      if (newReport.attachment instanceof File) {
        formData.append('attachment', newReport.attachment);
      }

      return api.post('reports/reports/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  // 3. UPDATE (Modified for File Uploads)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const formData = new FormData();
      
      // Dynamically append whatever fields are being updated
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });

      return api.patch(`reports/reports/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports', variables.id] });
    },
  });

  // 4. DELETE
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`reports/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  return {
    reports: reportsQuery.data,
    isLoading: reportsQuery.isLoading,
    isError: reportsQuery.isError,
    // ... same returns as before
    createReport: createMutation.mutateAsync,
    updateReport: updateMutation.mutate,
    deleteReport: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};