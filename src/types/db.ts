// src/features/reports/api.ts
import { supabase } from '@/lib/supabaseClient';
import type { Report, ReportStatus } from '@/types/db';

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Report[];
}

export async function createReport(params: {
  user_id: string;
  title: string;
  details?: string;
}): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: params.user_id,
      title: params.title,
      details: params.details ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Report;
}

// user edit (one time) -> server policy requires edited=false; we flip edited to true
export async function updateReportOnce(params: {
  id: string;
  user_id: string; // for extra safety in eq filter
  title: string;
  details?: string;
}): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      title: params.title,
      details: params.details ?? null,
      edited: true, // 🔒 mark as edited now
    })
    .eq('id', params.id)
    .eq('user_id', params.user_id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Report;
}

// admin status update (admins only via RLS)
export async function adminUpdateReportStatus(params: {
  id: string;
  status: ReportStatus;
}): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({ status: params.status })
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Report;
}
