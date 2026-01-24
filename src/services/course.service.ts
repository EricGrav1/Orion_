import { supabase } from './supabase';
import type { Course, InsertCourse, UpdateCourse } from '../types/database.types';

/**
 * Course Service
 * Handles all course-related database operations
 */

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
    return data || [];
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
    return data;
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
    return data;
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
    return data;
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
    // Get original course
    const original = await this.getCourse(id);
    if (!original) throw new Error('Course not found');

    // Get blocks
    const { data: blocks } = await supabase
      .from('blocks')
      .select('*')
      .eq('course_id', id)
      .order('order', { ascending: true });

    // Create new course
    const newCourse = await this.createCourse({
      title: `${original.title} (Copy)`,
      description: original.description,
      status: 'draft',
      settings: original.settings,
    });

    // Duplicate blocks
    if (blocks && blocks.length > 0) {
      const newBlocks = blocks.map((block) => ({
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
