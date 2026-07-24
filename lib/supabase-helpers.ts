import { supabase } from './supabase';
import { Task, User, Project, Notification, Asset, Column } from '../types';
import { authAPI } from './api';

// ============= USERS =============
export const userAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map database fields to TypeScript interface
    return (data || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      role: user.role
    }));
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      role: data.role
    };
  },

  async create(user: Omit<User, 'id'> & { password?: string }) {
    console.log('📝 Creating user:', user);

    if (!user.password) {
      throw new Error('Senha é obrigatória para criar um novo usuário');
    }

    // Use the backend endpoint to create user (handles password hashing)
    try {
      console.log('📤 Sending to backend /auth/create-user');
      const response = await authAPI.createUser(user.name, user.email, user.password, user.role);
      
      console.log('✅ User created:', response.user);
      
      return {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        avatarUrl: response.user.avatarUrl,
        role: response.user.role
      };
    } catch (error: any) {
      console.error('❌ User creation error:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<User> & { password?: string }) {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
    if (updates.role !== undefined) updateData.role = updates.role;

    // Password updates should go through the backend API
    if (updates.password) {
      updateData.password = updates.password;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      role: data.role
    };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============= PROJECTS =============
export const projectAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (
          user_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match Project interface
    return data.map((project: any) => ({
      id: project.id,
      name: project.name,
      clientName: project.client_name,
      budget: project.budget,
      color: project.color,
      members: project.project_members.map((pm: any) => pm.user_id)
    }));
  },

  async create(project: Omit<Project, 'id' | 'members'>, memberIds: string[] = []) {
    console.log('📝 Creating project:', project);
    console.log('👥 Member IDs:', memberIds);

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        client_name: project.clientName,
        budget: project.budget,
        color: project.color,
      })
      .select()
      .single();

    if (projectError) {
      console.error('❌ Project creation error:', projectError);
      throw projectError;
    }

    // Add members - validate UUIDs
    if (memberIds.length > 0) {
      // Filter out invalid UUIDs
      const validUuids = memberIds.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });

      console.log('✅ Valid UUIDs:', validUuids);
      console.log('❌ Invalid UUIDs:', memberIds.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return !uuidRegex.test(id);
      }));

      if (validUuids.length > 0) {
        const { error: membersError } = await supabase
          .from('project_members')
          .insert(validUuids.map(userId => ({
            project_id: projectData.id,
            user_id: userId
          })));

        if (membersError) {
          console.error('❌ Members add error:', membersError);
          throw membersError;
        }
      } else {
        console.warn('⚠️ No valid member UUIDs provided');
      }
    }

    return {
      ...projectData,
      members: memberIds
    };
  },

  async update(id: string, updates: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        client_name: updates.clientName,
        budget: updates.budget,
        color: updates.color,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addMember(projectId: string, userId: string) {
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId });

    if (error) throw error;
  },

  async removeMember(projectId: string, userId: string) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};

// ============= TASKS =============
export const taskAPI = {
  async getAll() {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees (
          user_id
        ),
        subtasks (*),
        attachments (*)
      `)
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    // Transform to match Task interface
    return tasksData.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignees: task.task_assignees.map((ta: any) => ta.user_id),
      dueDate: task.due_date,
      projectId: task.project_id,
      tags: task.tags || [],
      subtasks: task.subtasks.map((st: any) => ({
        id: st.id,
        title: st.title,
        completed: st.completed
      })),
      attachments: task.attachments.map((att: any) => ({
        id: att.id,
        name: att.name,
        url: att.url,
        type: att.type
      })),
      timeTracked: task.time_tracked || 0,
      isTracking: task.is_tracking || false,
      createdAt: task.created_at,
      createdBy: task.created_by || null
    }));
  },

  async create(task: Omit<Task, 'id' | 'createdAt' | 'timeTracked' | 'isTracking' | 'attachments'>) {
    console.log('📝 Creating task:', task);
    console.log('📋 Full task object:', JSON.stringify(task, null, 2));

    // Validate UUID format
    const isValidUUID = (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    // Ensure dueDate is null if empty string or undefined
    const dueDate = task.dueDate && task.dueDate !== '' ? task.dueDate : null;

    // Validate and set project_id (null if invalid UUID)
    let projectId = null;
    if (task.projectId && isValidUUID(task.projectId)) {
      projectId = task.projectId;
      console.log('✅ Valid project UUID:', projectId);
    } else if (task.projectId) {
      console.warn('⚠️ Invalid project UUID (mock data?):', task.projectId, '- will be set to null');
    }

    const insertData: any = {
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: dueDate,
      project_id: projectId,
    };

    // Add creator if provided
    if (task.createdBy) {
      insertData.created_by = task.createdBy;
    }

    // Only include tags if it has values
    if (task.tags && task.tags.length > 0) {
      insertData.tags = task.tags;
    }

    console.log('📤 Sending to Supabase:', JSON.stringify(insertData, null, 2));

    // Create task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (taskError) {
      console.error('❌ Task creation error:', taskError);
      console.error('📊 Error code:', taskError.code);
      console.error('📊 Error message:', taskError.message);
      console.error('📊 Error details:', taskError.details);
      console.error('📊 Error hint:', taskError.hint);
      console.error('📊 Full error object:', JSON.stringify(taskError, null, 2));
      console.error('📊 Data attempted to send:', insertData);
      throw taskError;
    }
    console.log('✅ Task created:', taskData);

    // Add assignees
    if (task.assignees.length > 0) {
      const { error: assigneesError } = await supabase
        .from('task_assignees')
        .insert(task.assignees.map(userId => ({
          task_id: taskData.id,
          user_id: userId
        })));

      if (assigneesError) throw assigneesError;
    }

    // Add subtasks
    if (task.subtasks.length > 0) {
      const { error: subtasksError } = await supabase
        .from('subtasks')
        .insert(task.subtasks.map(st => ({
          task_id: taskData.id,
          title: st.title,
          completed: st.completed
        })));

      if (subtasksError) throw subtasksError;
    }

    return taskData;
  },

  async update(id: string, updates: Partial<Task>) {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    // Ensure dueDate is null if empty string
    if (updates.dueDate !== undefined) {
      updateData.due_date = updates.dueDate && updates.dueDate !== '' ? updates.dueDate : null;
    }
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.tags !== undefined) updateData.tags = (updates.tags && updates.tags.length > 0) ? updates.tags : null;
    if (updates.timeTracked !== undefined) updateData.time_tracked = updates.timeTracked;
    if (updates.isTracking !== undefined) updateData.is_tracking = updates.isTracking;

    // Update task fields
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update assignees if provided
    if (updates.assignees !== undefined) {
      // Delete existing assignees
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', id);

      if (deleteError) throw deleteError;

      // Insert new assignees
      if (updates.assignees.length > 0) {
        const { error: insertError } = await supabase
          .from('task_assignees')
          .insert(updates.assignees.map(userId => ({
            task_id: id,
            user_id: userId
          })));

        if (insertError) throw insertError;
      }
    }

    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============= NOTIFICATIONS =============
export const notificationAPI = {
  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(notification: Omit<Notification, 'id' | 'date' | 'read'>, userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (error) throw error;
  }
};

// ============= BOARD COLUMNS =============
export const columnAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('board_columns')
      .select('*')
      .order('position', { ascending: true });

    if (error) throw error;

    return data.map((col: any) => ({
      id: col.id,
      title: col.title
    }));
  },

  async create(title: string, position: number) {
    const id = title.toLowerCase().replace(/\s+/g, '_');
    const { data, error } = await supabase
      .from('board_columns')
      .insert({ id, title, position })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, title: string) {
    const { data, error } = await supabase
      .from('board_columns')
      .update({ title })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('board_columns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============= ASSETS =============
export const assetAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(asset: Omit<Asset, 'id' | 'uploadedAt'>) {
    const { data, error } = await supabase
      .from('assets')
      .insert({
        name: asset.name,
        url: asset.url,
        path: asset.path,
        type: asset.type,
        mime_type: asset.mimeType,
        size: asset.size,
        project_id: asset.projectId,
        tags: asset.tags,
        uploaded_by: asset.uploadedBy,
        thumbnail_url: asset.thumbnailUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
