import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MemberRole = 'owner' | 'admin' | 'member' | 'visitor'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Family {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string | null
  name: string
  avatar: string
  color: string
  role: MemberRole
  email: string | null
  is_temporary: boolean
  joined_at: string
  updated_at: string
}

export interface Category {
  id: string
  family_id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  created_at: string
}

export interface Task {
  id: string
  family_id: string
  category_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  due_time: string | null
  recurrence: RecurrenceType
  recurrence_type: string | null
  recurrence_days: number[] | null
  recurrence_day_of_month: number | null
  recurrence_end_date: string | null
  has_reminder: boolean
  reminder_minutes_before: number
  is_for_everyone: boolean
  created_by: string
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  task_assignments?: TaskAssignment[]
}

export interface TaskAssignment {
  id: string
  task_id: string
  member_id: string
  family_id?: string
  assigned_at: string
  completed_at: string | null
}
