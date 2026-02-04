import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

// --- Types ---

export interface FacilityHour {
  id: number;
  dow: number;
  day_display: string;
  open_time: string | null;
  close_time: string | null;
}

export interface FacilityPhoto {
  id: string;
  image: string; 
  sort_order: number;
}

export interface Facility {
  id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  is_active: boolean;
  hours: FacilityHour[];
  photos: FacilityPhoto[];
  is_open_now: boolean;
  created_at: string;
  updated_at: string;
}

// Input type for creation/updates
export interface FacilityInput {
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  address?: string;
  is_active?: boolean;
  // Use File for new uploads, string for existing URLs
  cover_image?: File | null; 
}

// --- Hook ---

export const useFacilities = (facilityId: string | null = null) => {
  const queryClient = useQueryClient();
  const BASE_URL = '/facilities/facilities/';

  // 1. READ (List or Single)
  const facilitiesQuery = useQuery({
    queryKey: facilityId ? ['facilities', facilityId] : ['facilities'],
    queryFn: async (): Promise<Facility | Facility[]> => {
      const url = facilityId ? `${BASE_URL}${facilityId}/` : BASE_URL;
      const { data } = await api.get(url);
      return data;
    },
  });

  // Helper to convert object to FormData (Required for Image/File uploads)
  const convertToFormData = (data: Partial<FacilityInput>) => {
    const formData = new FormData();
    (Object.keys(data) as Array<keyof FacilityInput>).forEach((key) => {
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
  const createMutation = useMutation({
    mutationFn: async (newFacility: FacilityInput) => {
      const formData = convertToFormData(newFacility);
      const { data } = await api.post<Facility>(BASE_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });

  // 3. UPDATE
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FacilityInput> }) => {
      const formData = convertToFormData(data);
      const response = await api.patch<Facility>(`${BASE_URL}${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', data.id] });
    },
  });

  // 4. DELETE
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE_URL}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });

  return {
    // Data
    facilities: (Array.isArray(facilitiesQuery.data) ? facilitiesQuery.data : []) as Facility[],
    facility: (!Array.isArray(facilitiesQuery.data) ? facilitiesQuery.data : null) as Facility | null,
    isLoading: facilitiesQuery.isLoading,
    isError: facilitiesQuery.isError,

    // Mutations
    createFacility: createMutation.mutateAsync,
    updateFacility: updateMutation.mutateAsync,
    deleteFacility: deleteMutation.mutateAsync,

    // Loading States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};