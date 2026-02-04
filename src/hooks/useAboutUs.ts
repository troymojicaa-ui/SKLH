import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

// --- Types ---

export interface AboutUsData {
  id: number;
  hero_image: string;
  mission_text: string;
  why_text: string;
  why_image: string;
  cta_tagline: string;
  cta_heading: string;
  cta_text: string;
  cta_button_label: string;
  cta_button_url: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  sort_order: number;
}

export interface TimelineEvent {
  id: string;
  date_text: string;
  title: string;
  description: string;
  button_label: string | null;
  button_url: string | null;
  sort_order: number;
}

// --- Hook ---

export const useAboutUs = () => {
  // 1. General About Info
  const aboutQuery = useQuery<AboutUsData>({
    queryKey: ['about-us'],
    queryFn: async () => {
      const response = await api.get<AboutUsData>('about-us/');
      return response.data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // 2. Team List
  const teamQuery = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: async () => {
      const response = await api.get<TeamMember[]>('team/');
      return (response.data ?? []).sort((a, b) => a.sort_order - b.sort_order);
    },
    staleTime: 1000 * 60 * 60,
  });

  // 3. Timeline Events
  const timelineQuery = useQuery<TimelineEvent[]>({
    queryKey: ['timeline'],
    queryFn: async () => {
      const response = await api.get<TimelineEvent[]>('timeline/');
      // Sort by sort_order (0, 1, 2...)
      return (response.data ?? []).sort((a, b) => a.sort_order - b.sort_order);
    },
    staleTime: 1000 * 60 * 60,
  });

  return {
    // Data
    aboutUs: aboutQuery.data,
    team: teamQuery.data ?? [],
    timeline: timelineQuery.data ?? [],

    // Loading states
    isAboutLoading: aboutQuery.isLoading,
    isTeamLoading: teamQuery.isLoading,
    isTimelineLoading: timelineQuery.isLoading,
    
    // Combined states
    isLoading: aboutQuery.isLoading || teamQuery.isLoading || timelineQuery.isLoading,
    isError: aboutQuery.isError || teamQuery.isError || timelineQuery.isError,
    
    refetchAll: () => {
      aboutQuery.refetch();
      teamQuery.refetch();
      timelineQuery.refetch();
    },
  };
};