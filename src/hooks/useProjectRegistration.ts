import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

// 1. Define the TypeScript types based on your API response
export type RegistrationStatus = "pending" | "approved" | "denied" | "cancelled";

export interface ProjectRegistration {
  id: string;             // UUID
  event: string;        // Project UUID
  event_title: string;
  user: string;           // User UUID
  user_email: string;
  status: RegistrationStatus;
  created_at: string;     // ISO Date string
}

export interface UpdateRegistrationPayload {
  id: string;
  status: RegistrationStatus;
}

export const useProjectRegistration = (registrationId: string | null = null) => {
  const queryClient = useQueryClient();

  // 2. READ: Get registrations
  // Generics: <DataReceived, ErrorType>
  const registrationsQuery = useQuery<ProjectRegistration[] | ProjectRegistration>({
    queryKey: registrationId ? ['registrations', registrationId] : ['registrations'],
    queryFn: async () => {
      const url = registrationId 
        ? `event-registrations/${registrationId}/` 
        : 'event-registrations/';
      const response = await api.get(url);
      return response.data;
    },
  });

  // 3. CREATE: Register for a project
  const createRegistration = useMutation<ProjectRegistration, Error, string>({
    mutationFn: async (projectId: string) => {
      const response = await api.post('event-registrations/', { event: projectId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // 4. UPDATE: Change status
  const updateStatusMutation = useMutation<ProjectRegistration, Error, UpdateRegistrationPayload>({
    mutationFn: async ({ id, status }) => {
      const response = await api.patch(`event-registrations/${id}/`, { status });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['registrations', data.id] });
    },
  });

  // 5. DELETE: Cancel registration
  const deleteRegistration = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`event-registrations/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  return {
    // Cast to array safely for the list view
    registrations: (Array.isArray(registrationsQuery.data) ? registrationsQuery.data : []) as ProjectRegistration[],
    registration: (!Array.isArray(registrationsQuery.data) ? registrationsQuery.data : null) as ProjectRegistration | null,
    isLoading: registrationsQuery.isLoading,
    isError: registrationsQuery.isError,
    error: registrationsQuery.error,
    
    // Mutations
    register: createRegistration.mutate,
    updateStatus: updateStatusMutation.mutate,
    cancelRegistration: deleteRegistration.mutate,
    
    // Statuses
    isRegistering: createRegistration.isPending,
    isUpdating: updateStatusMutation.isPending,
    isCancelling: deleteRegistration.isPending,
  };
};