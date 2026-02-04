import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Add the 'type' keyword here for purely architectural types
import type { UseQueryResult } from '@tanstack/react-query';
import api from '../api/axios';

export type ProjectStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type ProjectVisibility = 'public' | 'private' | 'members';

export interface Project {
  // Primary Key
  id: string; // UUID string
  
  // Basic Info
  title: string;
  summary: string | null;
  body: string | null;
  
  // Dates (Django DateField returns YYYY-MM-DD strings in JSON)
  start_date: string | null;
  end_date: string | null;

  // Location
  lat: number | null;
  lng: number | null;
  address: string | null;
  
  // Metadata
  status: ProjectStatus;
  visibility: ProjectVisibility;
  is_active: boolean;
  
  // Media (Django ImageField returns the absolute URL string)
  cover_image: string | null;
  
  // Relationships
  created_by: string | null; // Usually the User ID (UUID or Number)
  created_by_email?: string; // If included via Serializer ReadOnlyField
  
  // Auto-managed (Django DateTimeField returns ISO 8601 strings)
  created_at: string;
  updated_at: string;
}

/**
 * Data shape for creating or updating a project.
 * We use 'File' for the cover_image because it's sent via FormData.
 */
export interface ProjectInput extends Omit<Partial<Project>, 'id' | 'cover_image' | 'created_at' | 'updated_at'> {
  title: string;
  cover_image?: File | null;
}


export const useEvents = (projectId: string | null = null) => {
  const queryClient = useQueryClient();
  const BASE_URL = 'events/';

  // 1. READ: Fetches either an array of Projects or a single Project
  const eventsQuery: UseQueryResult<any> = useQuery({
    queryKey: projectId ? ['events', projectId] : ['events'],
    queryFn: async (): Promise<Project | Project[]> => {
      const url = projectId ? `${BASE_URL}${projectId}/` : BASE_URL;
      const response = await api.get(url);
      return response.data;
    },
  });

  // Helper function to convert Object to FormData for Multipart uploads
  const convertToFormData = (data: Partial<ProjectInput>) => {
    const formData = new FormData();
    (Object.keys(data) as Array<keyof ProjectInput>).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    return formData;
  };

  // 2. CREATE
  const createMutation = useMutation<Project, Error, ProjectInput>({
    mutationFn: async (newProject) => {
      const formData = convertToFormData(newProject);
      const response = await api.post<Project>(BASE_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // 3. UPDATE
  const updateMutation = useMutation<Project, Error, { id: string; data: Partial<ProjectInput> }>({
    mutationFn: async ({ id, data }) => {
      const formData = convertToFormData(data);
      const response = await api.patch<Project>(`${BASE_URL}${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', data.id] });
    },
  });

  // 4. DELETE
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`${BASE_URL}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  return {
    // Type casting based on the presence of projectId
    projects: (projectId ? eventsQuery.data : eventsQuery.data) as Project & Project[],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    
    // Mutation methods
    createEvent: createMutation.mutateAsync,
    updateEvent: updateMutation.mutateAsync,
    deleteEvent: deleteMutation.mutateAsync, // Using mutateAsync for consistency
    
    // Status indicators
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};