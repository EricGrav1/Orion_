import { supabase } from './supabase';
import type { Json, LmsIntegration } from '../types/database.types';

export type LmsProvider = 'moodle' | 'scorm_cloud';
export type LmsHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'failed';

export interface LmsIntegrationInput {
  teamId: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
  credentials?: Record<string, string>;
}

export interface LmsCheckResult {
  status: LmsHealthStatus;
  error: string | null;
  last_checked_at: string | null;
}

export const lmsService = {
  async getTeamIntegrations(teamId: string): Promise<LmsIntegration[]> {
    const { data, error } = await supabase
      .from('lms_integrations')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as LmsIntegration[];
  },

  async upsertIntegration(input: LmsIntegrationInput): Promise<LmsIntegration> {
    const { data, error } = await supabase.functions.invoke('lms-integrations-upsert', {
      body: {
        team_id: input.teamId,
        provider: input.provider,
        config: input.config as Json,
        credentials: input.credentials ?? null,
      },
    });
    if (error) throw error;
    if (!data?.integration) {
      throw new Error('Integration upsert failed.');
    }
    return data.integration as LmsIntegration;
  },

  async checkIntegration(teamId: string, provider: LmsProvider): Promise<LmsCheckResult> {
    const { data, error } = await supabase.functions.invoke('lms-integrations-check', {
      body: {
        team_id: teamId,
        provider,
      },
    });
    if (error) throw error;
    return {
      status: (data?.status ?? 'unknown') as LmsHealthStatus,
      error: (typeof data?.error === 'string' ? data.error : null),
      last_checked_at: (typeof data?.last_checked_at === 'string' ? data.last_checked_at : null),
    };
  },
};
