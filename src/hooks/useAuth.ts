import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// --- Types & Interfaces ---

export type UserRole = "connect" | "admin";
export type UserStatus = "active" | "inactive" | "suspended" | "pending";

export interface UserProfile {
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  phone: string | null;
  contact_number: string | null;
  address_line: string | null;
  barangay: string | null;
  birthday: string | null;
  birth_date: string | null;
  birth_city: string | null;
  id_type: string | null;
  id_value: string | null;
  id_number: string | null;
  id_no: string | null;
  avatar: string | null;
  bio: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  is_admin: boolean;
  is_staff: boolean;
  must_change_password: boolean;
  profile: UserProfile;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

// --- Labels for UI Display ---

export const ROLE_LABELS: Record<UserRole, string> = {
  connect: "Connect",
  admin: "Admin",
};

// --- Hooks ---

/**
 * Internal hook to fetch the currently authenticated user's profile.
 */
export const useUser = () => {
  return useQuery<AuthUser | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await api.get<AuthUser>('auth/me/');
        return response.data;
      } catch (error) {
        // Clear local storage if the user fetch fails significantly
        return null;
      }
    },
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Main Auth Hook for Login, Logout, and Auth State.
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isUserLoading, isFetching } = useUser();

  // 1. Login Mutation
  const loginMutation = useMutation<LoginResponse, Error, any>({
    mutationFn: async (credentials) => {
      const response = await api.post<LoginResponse>('auth/token/', credentials);
      return response.data;
    },
    onSuccess: async (data) => {
      // 1. Store tokens immediately
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      // 2. Manually trigger the fetch for the user profile
      // We use fetchQuery so we can await the result and see the role
      try {
        const userData = await queryClient.fetchQuery({
          queryKey: ['user'],
          queryFn: async () => {
            const res = await api.get<AuthUser>('auth/me/');
            return res.data;
          },
        });

        // 3. Conditional Navigation based on the fetched role
        if (userData?.profile?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Failed to fetch user profile after login", error);
        navigate('/'); // Fallback if profile fetch fails
      }
    },
  });

  // 2. Logout Function
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Hard reset of the cache for security
    queryClient.setQueryData(['user'], null);
    queryClient.clear();
    
    navigate('/');
  };

  return {
    // Actions
    login: loginMutation.mutate,
    logout,

    // State
    user, 
    isAuthenticated: !!user,
    
    // Role-based logic (now dependent on profile.role)
    isAdmin: user?.profile?.role === "admin",
    isConnect: user?.profile?.role === "connect",
    
    // Status-based logic
    isActive: user?.profile?.status === "active",
    isSuspended: user?.profile?.status === "suspended",
    isPending: user?.profile?.status === "pending",
    
    // UI Labels
    roleLabel: user?.profile?.role ? ROLE_LABELS[user.profile.role] : "",

    // Loading states
    isLoading: loginMutation.isPending || isUserLoading,
    isLoggingIn: loginMutation.isPending,
    isCheckingAuth: isFetching,
    
    // Errors
    loginError: loginMutation.error,
  };
};