import { supabase } from './supabase';
import type { Block, InsertBlock, UpdateBlock } from '../types/database.types';

export const blockService = {
  /**
   * Get all blocks for a course, ordered by position
   */
  async getBlocksByCourse(courseId: string): Promise<Block[]> {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Block[];
  },

  /**
   * Get a single block by ID
   */
  async getBlock(id: string): Promise<Block | null> {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Block;
  },

  /**
   * Create a new block
   */
  async createBlock(block: InsertBlock): Promise<Block> {
    const { data, error } = await supabase
      .from('blocks')
      .insert(block)
      .select()
      .single();

    if (error) throw error;
    return data as Block;
  },

  /**
   * Update a block
   */
  async updateBlock(id: string, updates: UpdateBlock): Promise<Block> {
    const { data, error } = await supabase
      .from('blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Block;
  },

  /**
   * Delete a block
   */
  async deleteBlock(id: string): Promise<void> {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Batch update block orders (for reordering)
   */
  async updateBlockOrders(updates: Array<{ id: string; order: number }>): Promise<void> {
    const results = await Promise.all(
      updates.map(({ id, order }) =>
        supabase
          .from('blocks')
          .update({ order })
          .eq('id', id)
      )
    );

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error('Failed to update block orders');
    }
  },

  /**
   * Batch create multiple blocks (for course duplication)
   */
  async createBlocks(blocks: InsertBlock[]): Promise<Block[]> {
    const { data, error } = await supabase
      .from('blocks')
      .insert(blocks)
      .select();

    if (error) throw error;
    return (data ?? []) as Block[];
  },
};
