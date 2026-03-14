import type { Json } from '../types/database.types';

export interface CourseShareSettings {
  published: boolean;
  token: string | null;
}

export const defaultCourseShareSettings: CourseShareSettings = {
  published: false,
  token: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCourseShareSettings(settings: Json): CourseShareSettings {
  if (!isRecord(settings)) return defaultCourseShareSettings;
  const share = isRecord(settings.share) ? settings.share : {};
  return {
    published: share.published === true,
    token: safeToken(share.token),
  };
}

export function applyShareToSettings(
  settings: Json,
  sharePatch: Partial<CourseShareSettings>
): Json {
  const current = parseCourseShareSettings(settings);
  const nextShare = {
    ...current,
    ...sharePatch,
  };

  if (!isRecord(settings)) {
    return {
      share: nextShare as unknown as Json,
    };
  }

  return {
    ...settings,
    share: nextShare as unknown as Json,
  } as Json;
}

export function generateShareToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `shr_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  return `shr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
