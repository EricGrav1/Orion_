import { supabase } from './supabase';
import type { Course, InsertCourse, UpdateCourse, Block, InsertBlock, Json } from '../types/database.types';

export type ShareEventType = 'view' | 'resume' | 'completion' | 'quiz_result';

export interface CourseAnalytics {
  courseId: string;
  views: number;
  uniqueSessions: number;
  completions: number;
  completionRate: number;
  resumes: number;
  resumeRate: number;
  quizAttempts: number;
  quizPasses: number;
  quizPassRate: number;
  lastActivityAt: string | null;
}

function toRecord(value: Json): Record<string, Json> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, Json>;
  }
  return {};
}

function toBoolean(value: Json): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

export const courseService = {
  /**
   * Get all courses for the current user
   */
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Course[];
  },

  /**
   * Get a single course by ID
   */
  async getCourse(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Course;
  },

  /**
   * Get a published course by share token (public access)
   */
  async getPublishedCourseByShareToken(shareToken: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .filter('settings->share->>token', 'eq', shareToken)
      .filter('settings->share->>published', 'eq', 'true')
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as Course | null;
  },

  /**
   * Track any public share analytics event
   */
  async trackShareEvent(input: {
    courseId: string;
    shareToken: string;
    eventType: ShareEventType;
    sessionId?: string;
    metadata?: Json;
  }): Promise<void> {
    const { error } = await supabase
      .from('course_share_events')
      .insert({
        course_id: input.courseId,
        share_token: input.shareToken,
        event_type: input.eventType,
        session_id: input.sessionId ?? null,
        metadata: input.metadata ?? {},
      });

    if (error) throw error;
  },

  /**
   * Track a public share view event
   */
  async trackShareView(courseId: string, shareToken: string, sessionId?: string): Promise<void> {
    await this.trackShareEvent({
      courseId,
      shareToken,
      eventType: 'view',
      sessionId,
    });
  },

  async trackShareResume(
    courseId: string,
    shareToken: string,
    sessionId?: string,
    metadata?: Json
  ): Promise<void> {
    await this.trackShareEvent({
      courseId,
      shareToken,
      eventType: 'resume',
      sessionId,
      metadata,
    });
  },

  async trackShareCompletion(
    courseId: string,
    shareToken: string,
    sessionId?: string,
    metadata?: Json
  ): Promise<void> {
    await this.trackShareEvent({
      courseId,
      shareToken,
      eventType: 'completion',
      sessionId,
      metadata,
    });
  },

  async trackShareQuizResult(
    courseId: string,
    shareToken: string,
    sessionId?: string,
    metadata?: Json
  ): Promise<void> {
    await this.trackShareEvent({
      courseId,
      shareToken,
      eventType: 'quiz_result',
      sessionId,
      metadata,
    });
  },

  /**
   * Count share views for an owned course
   */
  async getShareViewCount(courseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('course_share_events')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('event_type', 'view');

    if (error) throw error;
    return count ?? 0;
  },

  /**
   * Course-level analytics aggregated from share events
   */
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    const { data, error } = await supabase
      .from('course_share_events')
      .select('event_type, session_id, metadata, created_at')
      .eq('course_id', courseId)
      .in('event_type', ['view', 'resume', 'completion', 'quiz_result']);
    if (error) throw error;

    const viewSessions = new Set<string>();
    const resumeSessions = new Set<string>();
    const completionSessions = new Set<string>();
    let quizAttempts = 0;
    let quizPasses = 0;
    let lastActivityAt: string | null = null;

    (data ?? []).forEach((event, index) => {
      const sessionId = event.session_id || `anon-${index}`;
      const eventType = event.event_type as ShareEventType;

      if (!lastActivityAt || new Date(event.created_at).getTime() > new Date(lastActivityAt).getTime()) {
        lastActivityAt = event.created_at;
      }

      if (eventType === 'view') {
        viewSessions.add(sessionId);
        return;
      }
      if (eventType === 'resume') {
        resumeSessions.add(sessionId);
        return;
      }
      if (eventType === 'completion') {
        completionSessions.add(sessionId);
        return;
      }
      if (eventType === 'quiz_result') {
        const metadata = toRecord((event.metadata ?? {}) as Json);
        quizAttempts += 1;
        if (toBoolean(metadata.pass ?? false)) {
          quizPasses += 1;
        }
      }
    });

    const views = viewSessions.size;
    const completions = completionSessions.size;
    const resumes = resumeSessions.size;
    const completionRate = views > 0 ? Math.round((completions / views) * 100) : 0;
    const resumeRate = views > 0 ? Math.round((resumes / views) * 100) : 0;
    const quizPassRate = quizAttempts > 0 ? Math.round((quizPasses / quizAttempts) * 100) : 0;

    return {
      courseId,
      views,
      uniqueSessions: views,
      completions,
      completionRate,
      resumes,
      resumeRate,
      quizAttempts,
      quizPasses,
      quizPassRate,
      lastActivityAt,
    };
  },

  /**
   * Create a new course
   */
  async createCourse(course: Partial<InsertCourse>): Promise<Course> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('courses')
      .insert({
        user_id: userData.user.id,
        title: course.title || 'Untitled Course',
        description: course.description || null,
        status: course.status || 'draft',
        settings: course.settings || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data as Course;
  },

  /**
   * Update a course
   */
  async updateCourse(id: string, updates: UpdateCourse): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Course;
  },

  /**
   * Delete a course
   */
  async deleteCourse(id: string): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Duplicate a course
   */
  async duplicateCourse(id: string): Promise<Course> {
    const original = await this.getCourse(id);
    if (!original) throw new Error('Course not found');

    const { data: blocksData } = await supabase
      .from('blocks')
      .select('*')
      .eq('course_id', id)
      .order('order', { ascending: true });

    const blocks = (blocksData ?? []) as Block[];

    const newCourse = await this.createCourse({
      title: `${original.title} (Copy)`,
      description: original.description,
      status: 'draft',
      settings: original.settings,
    });

    if (blocks.length > 0) {
      const newBlocks: InsertBlock[] = blocks.map((block) => ({
        course_id: newCourse.id,
        type: block.type,
        content: block.content,
        settings: block.settings,
        order: block.order,
      }));

      await supabase.from('blocks').insert(newBlocks);
    }

    return newCourse;
  },
};
