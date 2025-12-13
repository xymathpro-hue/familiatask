'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Home, Users, Settings, Plus, Check, Calendar, Star,
  Bell, Trash2, Edit3, Copy, Eye, Clock, ClipboardList,
  ShieldCheck, Crown, BarChart3, Download, ChevronLeft, ChevronRight,
  LogOut, Share2, AlertCircle, CheckCircle, X, Mail, Lock, User, Repeat, Filter,
  FileText, TrendingUp, Award, Target, Percent, ArrowUp, ArrowDown,
  ShoppingCart, ShoppingBag, Package, Pill, Coffee, Beef, Apple, Sparkles, MoreHorizontal
} from 'lucide-react'
import { supabase, Family, FamilyMember, Task, Category, TaskAssignment, ShoppingItem, ShoppingCategory } from '@/lib/supabase'

// ============================================
// CONFIGURAÇÕES
// ============================================

const MEMBER_ROLES = {
  owner: { label: 'Dono', icon: Crown, color: '#FFD700' },
  admin: { label: 'Admin', icon: ShieldCheck, color: '#667EEA' },
  member: { label: 'Membro', icon: Users, color: '#4CAF50' },
  visitor: { label: 'Visitante', icon: Eye, color: '#9E9E9E' }
}

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: '#FFC107', bg: '#FFF8E1' },
  in_progress: { label: 'Em Andamento', color: '#2196F3', bg: '#E3F2FD' },
  completed: { label: 'Concluída', color: '#4CAF50', bg: '#E8F5E9' },
  overdue: { label: 'Atrasada', color: '#F44336', bg: '#FFEBEE' }
}

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: '#9E9E9E' },
  medium: { label: 'Média', color: '#FFC107' },
  high: { label: 'Alta', color: '#F44336' }
}

const CATEGORY_ICONS: Record<string, string> = {
  'Casa': '🏠', 'Trabalho': '💼', 'Escola': '📚', 'Saúde': '💊',
  'Família': '👨‍👩‍👧‍👦', 'Lazer': '🎮', 'Compras': '🛒', 'Finanças': '💰', 'Outros': '📋'
}

const SHOPPING_CATEGORIES: { id: ShoppingCategory; label: string; icon: string; color: string }[] = [
  { id: 'mercado', label: 'Mercado', icon: '🛒', color: '#4CAF50' },
  { id: 'farmacia', label: 'Farmácia', icon: '💊', color: '#F44336' },
  { id: 'padaria', label: 'Padaria', icon: '🥖', color: '#FF9800' },
  { id: 'acougue', label: 'Açougue', icon: '🥩', color: '#E91E63' },
  { id: 'hortifruti', label: 'Hortifruti', icon: '🍎', color: '#8BC34A' },
  { id: 'limpeza', label: 'Limpeza', icon: '🧹', color: '#00BCD4' },
  { id: 'higiene', label: 'Higiene', icon: '🧴', color: '#9C27B0' },
  { id: 'outros', label: 'Outros', icon: '📦', color: '#607D8B' }
]

const AVATAR_OPTIONS = ['👨', '👩', '👦', '👧', '👴', '👵', '🧑', '👶', '🐕', '🐈', '🦊', '🦁']
const COLOR_OPTIONS = ['#667EEA', '#F093FB', '#4ECDC4', '#FF6B6B', '#FFE66D', '#95E1D3', '#A8E6CF', '#DDA0DD']

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function FamiliaTaskApp() {
  // Estados de autenticação
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  // Estados principais
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [currentMember, setCurrentMember] = useState<FamilyMember | null>(null)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])

  // Estados de UI
  const [activeTab, setActiveTab] = useState('tasks')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'week'>('today')

  // Estados do formulário de tarefa
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskCategoryId, setTaskCategoryId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskDueTime, setTaskDueTime] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [taskAssignees, setTaskAssignees] = useState<string[]>([])
  const [taskRecurrence, setTaskRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [taskTimes, setTaskTimes] = useState<string[]>(['']) // Múltiplos horários
  const [taskWeekDays, setTaskWeekDays] = useState<number[]>([]) // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  const [savingTask, setSavingTask] = useState(false)
  
  // Estado do Relatório
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())
  const [reportYear, setReportYear] = useState(new Date().getFullYear())

  // Estado do Calendário
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Estado da Lista de Compras - TODOS os estados aqui no componente principal
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<ShoppingCategory>('mercado')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [shoppingFilter, setShoppingFilter] = useState<ShoppingCategory | 'all'>('all')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  // Estados das Configurações - TODOS aqui no componente principal
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('👨')
  const [profileColor, setProfileColor] = useState('#667EEA')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // ============================================
  // AUTENTICAÇÃO
  // ============================================

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) loadUserData()
  }, [user])

  useEffect(() => {
    if (currentMember) {
      setProfileName(currentMember.name)
      setProfileAvatar(currentMember.avatar)
      setProfileColor(currentMember.color)
    }
  }, [currentMember])

  const loadUserData = async () => {
    if (!user) return

    try {
      const { data: memberData } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', user.id)
        .single()

      if (memberData) {
        setCurrentMember(memberData)
        setFamily(memberData.families)

        const { data: membersData } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', memberData.family_id)
          .order('role', { ascending: true })

        setMembers(membersData || [])

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('family_id', memberData.family_id)

        setCategories(categoriesData || [])

        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('family_id', memberData.family_id)
          .order('due_date', { ascending: true })

        setTasks(tasksData || [])

        const { data: assignmentsData } = await supabase
          .from('task_assignments')
          .select('*')
          .eq('family_id', memberData.family_id)

        setAssignments(assignmentsData || [])

        // Carregar itens de compras
        const { data: shoppingData } = await supabase
          .from('shopping_items')
          .select('*')
          .eq('family_id', memberData.family_id)
          .order('created_at', { ascending: false })

        setShoppingItems(shoppingData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const handleLogin = async () => {
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
  }

  const handleRegister = async () => {
    setAuthError('')
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    
    if (authError) {
      setAuthError(authError.message)
      return
    }

    if (authData.user) {
      if (inviteCode) {
        const { data: familyData } = await supabase
          .from('families')
          .select('*')
          .eq('invite_code', inviteCode.toUpperCase())
          .single()

        if (familyData) {
          await supabase.from('family_members').insert({
            family_id: familyData.id,
            user_id: authData.user.id,
            name: email.split('@')[0],
            avatar: '👨',
            color: '#667EEA',
            role: 'member'
          })
        } else {
          setAuthError('Código de convite inválido')
        }
      } else {
        const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        
        const { data: newFamily } = await supabase
          .from('families')
          .insert({ name: 'Minha Família', owner_id: authData.user.id, invite_code: newInviteCode })
          .select()
          .single()

        if (newFamily) {
          await supabase.from('family_members').insert({
            family_id: newFamily.id,
            user_id: authData.user.id,
            name: email.split('@')[0],
            avatar: '👨',
            color: '#667EEA',
            role: 'owner'
          })

          const defaultCategories = [
            { name: 'Casa', icon: '🏠', color: '#4CAF50' },
            { name: 'Trabalho', icon: '💼', color: '#2196F3' },
            { name: 'Escola', icon: '📚', color: '#FF9800' },
            { name: 'Saúde', icon: '💊', color: '#F44336' },
            { name: 'Família', icon: '👨‍👩‍👧‍👦', color: '#9C27B0' },
            { name: 'Lazer', icon: '🎮', color: '#00BCD4' }
          ]

          for (const cat of defaultCategories) {
            await supabase.from('categories').insert({
              family_id: newFamily.id,
              ...cat,
              is_default: true
            })
          }
        }
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setFamily(null)
    setMembers([])
    setTasks([])
  }

  // ============================================
  // FUNÇÕES DE NOTIFICAÇÃO
  // ============================================

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // ============================================
  // FUNÇÕES DO MODAL DE TAREFA
  // ============================================

  const resetTaskForm = () => {
    setTaskTitle('')
    setTaskDescription('')
    setTaskCategoryId(categories[0]?.id || '')
    setTaskDueDate(new Date().toISOString().split('T')[0])
    setTaskDueTime('')
    setTaskPriority('medium')
    setTaskAssignees([])
    setTaskRecurrence('none')
    setTaskTimes([''])
    setTaskWeekDays([])
  }

  const openTaskModal = (task?: Task | null) => {
    if (task) {
      setEditingTask(task)
      setTaskTitle(task.title)
      setTaskDescription(task.description || '')
      setTaskCategoryId(task.category_id || '')
      setTaskDueDate(task.due_date || '')
      setTaskDueTime(task.due_time || '')
      setTaskPriority(task.priority)
      setTaskRecurrence((task.recurrence as any) || 'none')
      setTaskTimes(task.due_time ? [task.due_time] : [''])
      setTaskWeekDays([]) // Não temos campo no banco para isso ainda
      // Carregar assignees
      const taskAssigns = assignments.filter(a => a.task_id === task.id).map(a => a.member_id)
      setTaskAssignees(taskAssigns)
    } else {
      setEditingTask(null)
      resetTaskForm()
    }
    setShowTaskModal(true)
  }

  const closeTaskModal = () => {
    setShowTaskModal(false)
    setEditingTask(null)
    resetTaskForm()
  }

  // Funções para gerenciar múltiplos horários
  const addTimeSlot = () => {
    setTaskTimes(prev => [...prev, ''])
  }

  const removeTimeSlot = (index: number) => {
    setTaskTimes(prev => prev.filter((_, i) => i !== index))
  }

  const updateTimeSlot = (index: number, value: string) => {
    setTaskTimes(prev => prev.map((t, i) => i === index ? value : t))
  }

  // Toggle dia da semana
  const toggleWeekDay = (day: number) => {
    setTaskWeekDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  // Calcular dia da semana usando DATA ÂNCORA (mais confiável)
  // Sabemos que 01/01/2025 é Quarta-feira (3)
  // Retorna: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  const getDayOfWeek = (year: number, month: number, day: number): number => {
    // Data âncora: 01/01/2025 = Quarta-feira (3)
    const anchorYear = 2025
    const anchorDayOfWeek = 3 // Quarta
    
    // Calcular dias desde 01/01/2025
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    
    // Verificar ano bissexto
    const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
    
    let totalDays = 0
    
    // Anos completos desde 2025
    for (let y = anchorYear; y < year; y++) {
      totalDays += isLeapYear(y) ? 366 : 365
    }
    
    // Anos completos antes de 2025 (se necessário)
    for (let y = year; y < anchorYear; y++) {
      totalDays -= isLeapYear(y) ? 366 : 365
    }
    
    // Meses completos do ano atual
    const febDays = isLeapYear(year) ? 29 : 28
    const monthDays = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    
    for (let m = 1; m < month; m++) {
      totalDays += monthDays[m - 1]
    }
    
    // Dias do mês atual
    totalDays += day - 1
    
    // Calcular dia da semana
    let dayOfWeek = (anchorDayOfWeek + totalDays) % 7
    if (dayOfWeek < 0) dayOfWeek += 7
    
    return dayOfWeek
  }

  // Gerar datas futuras baseado na recorrência
  const generateRecurringDates = (startDate: string, recurrence: string, weekDays: number[] = [], count: number = 30): string[] => {
    const dates: string[] = []
    
    // Parsear a data manualmente
    const [year, month, day] = startDate.split('-').map(Number)
    
    // Função para obter dias no mês
    const getDaysInMonth = (y: number, m: number): number => {
      const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      if (m === 2) {
        // Ano bissexto
        const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
        return isLeap ? 29 : 28
      }
      return daysPerMonth[m - 1]
    }
    
    if (recurrence === 'weekly' && weekDays.length > 0) {
      let currentYear = year
      let currentMonth = month
      let currentDay = day
      let addedCount = 0
      
      // Percorrer os próximos 120 dias
      for (let i = 0; i < 120 && addedCount < count; i++) {
        const weekDay = getDayOfWeek(currentYear, currentMonth, currentDay)
        
        if (weekDays.includes(weekDay)) {
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
          dates.push(dateStr)
          addedCount++
        }
        
        // Avançar para o próximo dia
        currentDay++
        const daysInMonth = getDaysInMonth(currentYear, currentMonth)
        if (currentDay > daysInMonth) {
          currentDay = 1
          currentMonth++
          if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
          }
        }
      }
      
      return dates
    }
    
    // Comportamento original para daily e monthly
    dates.push(startDate)
    
    let currentYear = year
    let currentMonth = month
    let currentDay = day
    
    for (let i = 1; i < count; i++) {
      if (recurrence === 'daily') {
        currentDay++
        const daysInMonth = getDaysInMonth(currentYear, currentMonth)
        if (currentDay > daysInMonth) {
          currentDay = 1
          currentMonth++
          if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
          }
        }
      } else if (recurrence === 'weekly') {
        currentDay += 7
        let daysInMonth = getDaysInMonth(currentYear, currentMonth)
        while (currentDay > daysInMonth) {
          currentDay -= daysInMonth
          currentMonth++
          if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
          }
          daysInMonth = getDaysInMonth(currentYear, currentMonth)
        }
      } else if (recurrence === 'monthly') {
        currentMonth++
        if (currentMonth > 12) {
          currentMonth = 1
          currentYear++
        }
        const daysInMonth = getDaysInMonth(currentYear, currentMonth)
        if (currentDay > daysInMonth) {
          currentDay = daysInMonth
        }
      }
      
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
      dates.push(dateStr)
    }
    
    return dates
  }

  const handleSaveTask = async () => {
    if (!taskTitle.trim() || !family || !currentMember) return

    setSavingTask(true)

    try {
      // Filtrar horários válidos
      const validTimes = taskTimes.filter(t => t.trim() !== '')
      
      if (editingTask) {
        // Atualizar tarefa existente (só atualiza essa, não cria novas)
        await supabase
          .from('tasks')
          .update({
            title: taskTitle.trim(),
            description: taskDescription.trim() || null,
            category_id: taskCategoryId || null,
            due_date: taskDueDate || null,
            due_time: validTimes[0] || null,
            priority: taskPriority,
            recurrence: taskRecurrence,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id)

        // Atualizar assignments
        await supabase.from('task_assignments').delete().eq('task_id', editingTask.id)
        
        if (taskAssignees.length > 0) {
          const assignmentInserts = taskAssignees.map(memberId => ({
            task_id: editingTask.id,
            member_id: memberId,
            family_id: family.id
          }))
          await supabase.from('task_assignments').insert(assignmentInserts)
        }

        showNotification('success', 'Tarefa atualizada!')
      } else {
        // Criar novas tarefas
        // Gerar datas baseado na recorrência
        let dates: string[] = []
        
        if (taskDueDate) {
          if (taskRecurrence === 'none') {
            dates = [taskDueDate]
          } else if (taskRecurrence === 'weekly' && taskWeekDays.length > 0) {
            // Semanal com dias específicos
            dates = generateRecurringDates(taskDueDate, taskRecurrence, taskWeekDays, 30)
            
            // DEBUG temporário - mostrar o que foi gerado
            alert('DEBUG:\nData inicial: ' + taskDueDate + '\nDias selecionados: ' + taskWeekDays.join(',') + '\nPrimeiras datas: ' + dates.slice(0, 5).join(', '))
          } else {
            // Diário, semanal simples ou mensal
            dates = generateRecurringDates(taskDueDate, taskRecurrence, [], 30)
          }
        } else {
          dates = ['']
        }

        // Se não tem horários definidos, usar array com string vazia
        const timesToUse = validTimes.length > 0 ? validTimes : ['']
        
        let totalCreated = 0

        // Criar uma tarefa para cada combinação de data + horário
        for (const date of dates) {
          for (const time of timesToUse) {
            const { data: newTask } = await supabase
              .from('tasks')
              .insert({
                family_id: family.id,
                title: taskTitle.trim(),
                description: taskDescription.trim() || null,
                category_id: taskCategoryId || null,
                due_date: date || null,
                due_time: time || null,
                priority: taskPriority,
                recurrence: taskRecurrence,
                status: 'pending',
                created_by: currentMember.id
              })
              .select()
              .single()

            if (newTask && taskAssignees.length > 0) {
              const assignmentInserts = taskAssignees.map(memberId => ({
                task_id: newTask.id,
                member_id: memberId,
                family_id: family.id
              }))
              await supabase.from('task_assignments').insert(assignmentInserts)
            }
            
            totalCreated++
          }
        }

        const msg = totalCreated > 1 
          ? `${totalCreated} tarefas criadas!` 
          : 'Tarefa criada!'
        showNotification('success', msg)
      }

      closeTaskModal()
      loadUserData()
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error)
      showNotification('error', 'Erro ao salvar tarefa')
    } finally {
      setSavingTask(false)
    }
  }

  const toggleAssignee = (memberId: string) => {
    setTaskAssignees(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  // ============================================
  // FUNÇÕES DE TAREFAS
  // ============================================

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    
    await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_by: newStatus === 'completed' ? currentMember?.id : null,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', task.id)

    loadUserData()
    showNotification('success', newStatus === 'completed' ? 'Tarefa concluída! ✅' : 'Tarefa reaberta')
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Excluir esta tarefa?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    loadUserData()
    showNotification('success', 'Tarefa excluída')
  }

  const getTaskStatus = (task: Task) => {
    if (task.status === 'completed') return 'completed'
    if (task.due_date) {
      // Usar comparação de strings para evitar problema de timezone
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const taskDateStr = task.due_date.split('T')[0]
      if (taskDateStr < todayStr) return 'overdue'
    }
    return task.status
  }

  const filteredTasks = useMemo(() => {
    // Usar data local sem problemas de timezone
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 7)
    const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`

    return tasks.filter(task => {
      // Se não tem data, só mostra em "Todas"
      if (!task.due_date) return taskFilter === 'all'
      
      // Comparar strings de data diretamente (evita problemas de timezone)
      const taskDateStr = task.due_date.split('T')[0]
      
      if (taskFilter === 'today') {
        return taskDateStr === todayStr
      } else if (taskFilter === 'week') {
        return taskDateStr >= todayStr && taskDateStr <= endOfWeekStr
      }
      return true
    }).sort((a, b) => {
      // Primeiro por status (atrasadas primeiro, depois pendentes, depois concluídas)
      const statusOrder = { overdue: 0, pending: 1, in_progress: 2, completed: 3 }
      const statusA = getTaskStatus(a)
      const statusB = getTaskStatus(b)
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB]
      }
      // Depois por horário
      const timeA = a.due_time || '99:99'
      const timeB = b.due_time || '99:99'
      return timeA.localeCompare(timeB)
    })
  }, [tasks, taskFilter])

  // ============================================
  // FUNÇÕES DE COMPRAS
  // ============================================

  const addShoppingItem = async () => {
    if (!newItemName.trim() || !family || !currentMember) return

    await supabase.from('shopping_items').insert({
      family_id: family.id,
      name: newItemName.trim(),
      quantity: newItemQuantity,
      category: newItemCategory,
      added_by: currentMember.id
    })

    setNewItemName('')
    setNewItemQuantity(1)
    loadUserData()
    showNotification('success', 'Item adicionado!')
  }

  const toggleShoppingItem = async (item: ShoppingItem) => {
    await supabase
      .from('shopping_items')
      .update({
        is_purchased: !item.is_purchased,
        purchased_by: !item.is_purchased ? currentMember?.id : null,
        purchased_at: !item.is_purchased ? new Date().toISOString() : null
      })
      .eq('id', item.id)

    loadUserData()
  }

  const deleteShoppingItem = async (itemId: string) => {
    await supabase.from('shopping_items').delete().eq('id', itemId)
    loadUserData()
  }

  const clearPurchasedItems = async () => {
    if (!confirm('Limpar todos os itens comprados?')) return
    
    await supabase
      .from('shopping_items')
      .delete()
      .eq('family_id', family?.id)
      .eq('is_purchased', true)

    loadUserData()
    showNotification('success', 'Itens comprados removidos!')
  }

  const markAllAsPurchased = async () => {
    if (!confirm('Marcar TODOS os itens pendentes como comprados?')) return
    
    const pendingItems = shoppingItems.filter(i => !i.is_purchased)
    
    for (const item of pendingItems) {
      await supabase
        .from('shopping_items')
        .update({
          is_purchased: true,
          purchased_by: currentMember?.id,
          purchased_at: new Date().toISOString()
        })
        .eq('id', item.id)
    }

    loadUserData()
    showNotification('success', `${pendingItems.length} itens marcados como comprados! ✅`)
  }

  const shoppingStats = useMemo(() => {
    const total = shoppingItems.length
    const purchased = shoppingItems.filter(i => i.is_purchased).length
    return { total, purchased, pending: total - purchased }
  }, [shoppingItems])

  const groupedShoppingItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {}
    
    const itemsToShow = shoppingFilter === 'all' 
      ? shoppingItems 
      : shoppingItems.filter(i => i.category === shoppingFilter)

    itemsToShow.forEach(item => {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    })

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.is_purchased === b.is_purchased) return 0
        return a.is_purchased ? 1 : -1
      })
    })

    return groups
  }, [shoppingItems, shoppingFilter])

  // ============================================
  // FUNÇÕES DE CONFIGURAÇÕES
  // ============================================

  const handleUpdateProfile = async () => {
    if (!currentMember) return
    setSavingSettings(true)
    
    try {
      await supabase
        .from('family_members')
        .update({ name: profileName, avatar: profileAvatar, color: profileColor })
        .eq('id', currentMember.id)

      showNotification('success', 'Perfil atualizado!')
      setEditingProfile(false)
      loadUserData()
    } catch (error) {
      showNotification('error', 'Erro ao atualizar perfil')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail) return
    setSavingSettings(true)
    
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      
      showNotification('success', 'Email de confirmação enviado!')
      setEditingEmail(false)
      setNewEmail('')
    } catch (error: any) {
      showNotification('error', error.message || 'Erro ao atualizar email')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showNotification('error', 'As senhas não coincidem')
      return
    }
    if (newPassword.length < 6) {
      showNotification('error', 'A senha deve ter pelo menos 6 caracteres')
      return
    }
    
    setSavingSettings(true)
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      
      showNotification('success', 'Senha atualizada!')
      setEditingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      showNotification('error', error.message || 'Erro ao atualizar senha')
    } finally {
      setSavingSettings(false)
    }
  }

  // ============================================
  // DADOS DO RELATÓRIO
  // ============================================

  const reportData = useMemo(() => {
    const monthTasks = tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate.getMonth() === reportMonth && taskDate.getFullYear() === reportYear
    })

    const total = monthTasks.length
    const completed = monthTasks.filter(t => t.status === 'completed').length
    const pending = monthTasks.filter(t => t.status === 'pending').length
    const overdue = monthTasks.filter(t => getTaskStatus(t) === 'overdue').length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    return { monthTasks, total, completed, pending, overdue, rate }
  }, [tasks, reportMonth, reportYear])

  const memberStats = useMemo(() => {
    return members.map(member => {
      const memberTasks = reportData.monthTasks.filter(task => 
        assignments.some(a => a.task_id === task.id && a.member_id === member.id)
      )
      const total = memberTasks.length
      const completed = memberTasks.filter(t => t.status === 'completed').length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0
      return { member, total, completed, rate }
    }).filter(s => s.total > 0).sort((a, b) => b.rate - a.rate)
  }, [members, reportData.monthTasks, assignments])

  const categoryStats = useMemo(() => {
    return categories.map(category => {
      const catTasks = reportData.monthTasks.filter(t => t.category_id === category.id)
      const total = catTasks.length
      const completed = catTasks.filter(t => t.status === 'completed').length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0
      return { category, total, completed, rate }
    }).filter(s => s.total > 0).sort((a, b) => b.rate - a.rate)
  }, [categories, reportData.monthTasks])

  // ============================================
  // DADOS DO CALENDÁRIO
  // ============================================

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
    const startPadding = firstDay.getDay()
    const days: (Date | null)[] = []

    for (let i = 0; i < startPadding; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(calendarYear, calendarMonth, i))
    }

    return days
  }, [calendarMonth, calendarYear])

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate.toDateString() === date.toDateString()
    })
  }

  // ============================================
  // LOADING E AUTENTICAÇÃO
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Home className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">FamíliaTask</h1>
            <p className="text-white/60">Organize sua família</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
            <div className="flex mb-6 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${authMode === 'login' ? 'bg-violet-500 text-white' : 'text-white/60'}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${authMode === 'register' ? 'bg-violet-500 text-white' : 'text-white/60'}`}
              >
                Cadastrar
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-violet-500"
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-violet-500"
              />
              
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Código de convite (opcional)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-violet-500"
                />
              )}

              {authError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {authError}
                </div>
              )}

              <button
                onClick={authMode === 'login' ? handleLogin : handleRegister}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold hover:opacity-90 transition-opacity"
              >
                {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
      </div>
    )
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Notificação */}
      {notification && (
        <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Modal de Tarefa */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 px-4 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <button onClick={closeTaskModal} className="p-2 rounded-xl hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Título *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Nome da tarefa"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Descrição</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Detalhes da tarefa (opcional)"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white resize-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setTaskCategoryId(cat.id)}
                      className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                        taskCategoryId === cat.id ? 'bg-violet-500' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Data</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                />
              </div>

              {/* Horários (múltiplos) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">Horários</label>
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar horário
                  </button>
                </div>
                <div className="space-y-2">
                  {taskTimes.map((time, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateTimeSlot(index, e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                        placeholder="00:00"
                      />
                      {taskTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="px-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {taskTimes.length > 1 && (
                  <p className="text-xs text-white/40 mt-2">
                    💡 Serão criadas {taskTimes.filter(t => t).length} tarefas, uma para cada horário
                  </p>
                )}
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Prioridade</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setTaskPriority(p)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        taskPriority === p ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ 
                        backgroundColor: PRIORITY_CONFIG[p].color + '30',
                        color: PRIORITY_CONFIG[p].color 
                      }}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repetição */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Repetição</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'none', label: 'Não repetir' },
                    { id: 'daily', label: 'Diária' },
                    { id: 'weekly', label: 'Semanal' },
                    { id: 'monthly', label: 'Mensal' }
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setTaskRecurrence(r.id as any)
                        if (r.id !== 'weekly') setTaskWeekDays([])
                      }}
                      className={`px-3 py-2 rounded-xl text-sm transition-all ${
                        taskRecurrence === r.id ? 'bg-violet-500' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Seleção de dias da semana */}
                {taskRecurrence === 'weekly' && (
                  <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-white/60 mb-2">Quais dias da semana?</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 0, label: 'Dom', short: 'D' },
                        { id: 1, label: 'Seg', short: 'S' },
                        { id: 2, label: 'Ter', short: 'T' },
                        { id: 3, label: 'Qua', short: 'Q' },
                        { id: 4, label: 'Qui', short: 'Q' },
                        { id: 5, label: 'Sex', short: 'S' },
                        { id: 6, label: 'Sáb', short: 'S' }
                      ].map(day => (
                        <button
                          key={day.id}
                          onClick={() => toggleWeekDay(day.id)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                            taskWeekDays.includes(day.id) 
                              ? 'bg-violet-500 text-white' 
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {taskWeekDays.length === 0 && (
                      <p className="text-xs text-amber-400/80 mt-2">
                        ⚠️ Selecione pelo menos um dia
                      </p>
                    )}
                    {taskWeekDays.length > 0 && (
                      <>
                        <p className="text-xs text-green-400/80 mt-2">
                          ✅ {taskWeekDays.length} dia{taskWeekDays.length > 1 ? 's' : ''} selecionado{taskWeekDays.length > 1 ? 's' : ''}: {taskWeekDays.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}
                        </p>
                        {taskDueDate && (
                          <div className="mt-2 p-2 bg-white/5 rounded-lg">
                            <p className="text-xs text-white/60 mb-1">📅 Próximas datas:</p>
                            <p className="text-xs text-white/80">
                              {(() => {
                                const [y, m, d] = taskDueDate.split('-').map(Number)
                                const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
                                const getDaysInMonth = (year: number, month: number) => {
                                  const dpm = [31,28,31,30,31,30,31,31,30,31,30,31]
                                  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29
                                  return dpm[month - 1]
                                }
                                const results: string[] = []
                                let cy = y, cm = m, cd = d, count = 0
                                for (let i = 0; i < 60 && count < 6; i++) {
                                  let tm = cm, ty = cy
                                  if (tm < 3) { tm += 12; ty -= 1 }
                                  const k = ty % 100, j = Math.floor(ty / 100)
                                  let h = (cd + Math.floor((13 * (tm + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
                                  if (h < 0) h += 7
                                  const dow = [6,0,1,2,3,4,5][h]
                                  if (taskWeekDays.includes(dow)) {
                                    results.push(`${cd}/${cm} (${dias[dow]})`)
                                    count++
                                  }
                                  cd++
                                  if (cd > getDaysInMonth(cy, cm)) { cd = 1; cm++; if (cm > 12) { cm = 1; cy++ } }
                                }
                                return results.join(', ')
                              })()}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {taskRecurrence !== 'none' && taskRecurrence !== 'weekly' && (
                  <p className="text-xs text-amber-400/80 mt-2">
                    ⚡ Serão criadas 30 tarefas {taskRecurrence === 'daily' ? 'para os próximos 30 dias' : 'para os próximos 30 meses'}
                  </p>
                )}
                {taskRecurrence === 'weekly' && taskWeekDays.length > 0 && (
                  <p className="text-xs text-amber-400/80 mt-2">
                    ⚡ Serão criadas ~{Math.min(30, taskWeekDays.length * 5)} tarefas para as próximas semanas
                  </p>
                )}
              </div>

              {/* Responsáveis */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Responsáveis</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => toggleAssignee(member.id)}
                      className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                        taskAssignees.includes(member.id) ? 'ring-2 ring-violet-500 bg-violet-500/20' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: member.color }}>
                        {member.avatar}
                      </span>
                      <span>{member.name}</span>
                      {taskAssignees.includes(member.id) && <Check className="w-4 h-4 text-violet-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeTaskModal}
                  className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={!taskTitle.trim() || savingTask || (taskRecurrence === 'weekly' && taskWeekDays.length === 0)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {savingTask ? 'Salvando...' : editingTask ? 'Atualizar' : 'Criar Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: currentMember?.color }}>
                {currentMember?.avatar}
              </div>
              <div>
                <h1 className="font-bold">{family?.name}</h1>
                <p className="text-xs text-white/50">{members.length} membros</p>
              </div>
            </div>
            {activeTab === 'tasks' && (
              <button 
                onClick={() => openTaskModal(null)} 
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-4 pb-24">
        
        {/* ============================================ */}
        {/* TAB: TAREFAS */}
        {/* ============================================ */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['today', 'week', 'all'] as const).map(filter => (
                <button 
                  key={filter} 
                  onClick={() => setTaskFilter(filter)} 
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${taskFilter === filter ? 'bg-violet-500' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {filter === 'today' ? 'Hoje' : filter === 'week' ? 'Semana' : 'Todas'}
                </button>
              ))}
            </div>

            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map(task => {
                  const status = getTaskStatus(task)
                  const category = categories.find(c => c.id === task.category_id)
                  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
                  const completedByMember = members.find(m => m.id === task.completed_by)

                  return (
                    <div key={task.id} className={`p-4 rounded-2xl border ${status === 'completed' ? 'bg-green-500/10 border-green-500/30' : status === 'overdue' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            status === 'completed' ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-violet-500'
                          }`}
                        >
                          {status === 'completed' && <Check className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{category?.icon || CATEGORY_ICONS[category?.name || ''] || '📋'}</span>
                            <h3 className={`font-medium ${status === 'completed' ? 'line-through text-white/50' : ''}`}>{task.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                                {task.due_time && ` ${task.due_time}`}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: statusConfig.color + '30', color: statusConfig.color }}>
                              {statusConfig.label}
                            </span>
                          </div>
                          {status === 'completed' && completedByMember && (
                            <p className="text-xs text-green-400/70 mt-1 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Concluída por {completedByMember.name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openTaskModal(task)} className="p-2 rounded-lg hover:bg-white/10">
                            <Edit3 className="w-4 h-4 text-white/50" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} className="p-2 rounded-lg hover:bg-red-500/20">
                            <Trash2 className="w-4 h-4 text-red-400/50" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma tarefa {taskFilter === 'today' ? 'para hoje' : taskFilter === 'week' ? 'esta semana' : ''}</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: CALENDÁRIO */}
        {/* ============================================ */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => { 
                if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) } 
                else setCalendarMonth(m => m - 1) 
              }} className="p-2 rounded-xl bg-white/10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-lg">{MONTHS[calendarMonth]} {calendarYear}</h2>
              <button onClick={() => { 
                if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) } 
                else setCalendarMonth(m => m + 1) 
              }} className="p-2 rounded-xl bg-white/10">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS_SHORT.map(day => (
                <div key={day} className="text-center text-xs text-white/50 py-2">{day}</div>
              ))}
              {calendarDays.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />
                
                const dayTasks = getTasksForDate(date)
                const isToday = date.toDateString() === new Date().toDateString()
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                const hasOverdue = dayTasks.some(t => getTaskStatus(t) === 'overdue')
                const hasPending = dayTasks.some(t => t.status === 'pending')
                const allCompleted = dayTasks.length > 0 && dayTasks.every(t => t.status === 'completed')

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all ${
                      isSelected ? 'bg-violet-500' : isToday ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    {date.getDate()}
                    {dayTasks.length > 0 && (
                      <div className={`w-2 h-2 rounded-full absolute bottom-1 ${
                        hasOverdue ? 'bg-red-500' : hasPending ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                    )}
                  </button>
                )
              })}
            </div>

            {selectedDate && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="font-bold mb-3">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                {getTasksForDate(selectedDate).length > 0 ? (
                  <div className="space-y-2">
                    {getTasksForDate(selectedDate).map(task => {
                      const status = getTaskStatus(task)
                      return (
                        <div key={task.id} className={`p-3 rounded-xl flex items-center gap-3 ${status === 'completed' ? 'bg-green-500/20' : status === 'overdue' ? 'bg-red-500/20' : 'bg-white/10'}`}>
                          <button onClick={() => toggleTaskStatus(task)} className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${status === 'completed' ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>
                            {status === 'completed' && <Check className="w-3 h-3" />}
                          </button>
                          <span className={status === 'completed' ? 'line-through text-white/50' : ''}>{task.title}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm">Nenhuma tarefa para este dia</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: COMPRAS */}
        {/* ============================================ */}
        {activeTab === 'shopping' && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-xl bg-white/5 text-center">
                <p className="text-2xl font-bold">{shoppingStats.total}</p>
                <p className="text-xs text-white/50">Total</p>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-amber-500/10 text-center">
                <p className="text-2xl font-bold text-amber-400">{shoppingStats.pending}</p>
                <p className="text-xs text-white/50">Pendentes</p>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-green-500/10 text-center">
                <p className="text-2xl font-bold text-green-400">{shoppingStats.purchased}</p>
                <p className="text-xs text-white/50">Comprados</p>
              </div>
            </div>

            {/* Adicionar Item */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Adicionar item..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                  onKeyDown={(e) => e.key === 'Enter' && addShoppingItem()}
                />
                <input
                  type="number"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white text-center"
                  min="1"
                />
                <button 
                  onClick={addShoppingItem} 
                  disabled={!newItemName.trim()}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Categoria selecionada */}
              <button
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <span>{SHOPPING_CATEGORIES.find(c => c.id === newItemCategory)?.icon}</span>
                  <span className="text-sm">{SHOPPING_CATEGORIES.find(c => c.id === newItemCategory)?.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${showCategoryPicker ? 'rotate-90' : ''}`} />
              </button>

              {showCategoryPicker && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                  {SHOPPING_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setNewItemCategory(cat.id); setShowCategoryPicker(false) }}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                        newItemCategory === cat.id ? 'bg-violet-500' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ações Rápidas */}
            {shoppingStats.pending > 0 && (
              <button
                onClick={markAllAsPurchased}
                className="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-medium flex items-center justify-center gap-2 hover:bg-green-500/30"
              >
                <Check className="w-5 h-5" />
                Comprei Tudo ({shoppingStats.pending})
              </button>
            )}

            {/* Filtro */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setShoppingFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${shoppingFilter === 'all' ? 'bg-violet-500' : 'bg-white/10'}`}
                >
                  Todas
                </button>
                {SHOPPING_CATEGORIES.map(cat => {
                  const count = shoppingItems.filter(i => i.category === cat.id && !i.is_purchased).length
                  if (count === 0 && shoppingFilter !== cat.id) return null
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setShoppingFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap ${shoppingFilter === cat.id ? 'bg-violet-500' : 'bg-white/10'}`}
                    >
                      <span>{cat.icon}</span>
                      {count > 0 && <span className="text-xs bg-white/20 px-1.5 rounded-full">{count}</span>}
                    </button>
                  )
                })}
              </div>

              {shoppingStats.purchased > 0 && (
                <button onClick={clearPurchasedItems} className="text-xs text-red-400 hover:text-red-300 whitespace-nowrap ml-2">
                  Limpar comprados
                </button>
              )}
            </div>

            {/* Lista de Itens */}
            {Object.keys(groupedShoppingItems).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedShoppingItems).map(([categoryId, items]) => {
                  const cat = SHOPPING_CATEGORIES.find(c => c.id === categoryId)
                  const pendingInCategory = items.filter(i => !i.is_purchased).length

                  return (
                    <div key={categoryId} className="space-y-2">
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-lg">{cat?.icon}</span>
                        <span className="font-medium text-sm">{cat?.label}</span>
                        {pendingInCategory > 0 && (
                          <span className="text-xs text-white/40">{pendingInCategory} pendente{pendingInCategory > 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {items.map(item => {
                        const addedBy = members.find(m => m.id === item.added_by)
                        const purchasedBy = members.find(m => m.id === item.purchased_by)

                        return (
                          <div 
                            key={item.id} 
                            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                              item.is_purchased ? 'bg-green-500/10 border-green-500/20 opacity-60' : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <button
                              onClick={() => toggleShoppingItem(item)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                item.is_purchased ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-green-500'
                              }`}
                            >
                              {item.is_purchased && <Check className="w-4 h-4" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${item.is_purchased ? 'line-through text-white/50' : ''}`}>{item.name}</p>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                {addedBy && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-4 h-4 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: addedBy.color + '40' }}>
                                      {addedBy.avatar}
                                    </span>
                                    {addedBy.name}
                                  </span>
                                )}
                                {item.is_purchased && purchasedBy && (
                                  <span className="text-green-400/60">• ✓ {purchasedBy.name}</span>
                                )}
                              </div>
                            </div>

                            <span className={`px-2 py-1 rounded-lg text-sm ${item.is_purchased ? 'bg-green-500/20' : 'bg-white/10'}`}>
                              {item.quantity}x
                            </span>

                            <button onClick={() => deleteShoppingItem(item.id)} className="p-2 rounded-lg hover:bg-red-500/20">
                              <Trash2 className="w-4 h-4 text-red-400/50" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Lista de compras vazia</p>
                <p className="text-sm">Adicione itens acima</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: RELATÓRIO */}
        {/* ============================================ */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => { 
                if (reportMonth === 0) { setReportMonth(11); setReportYear(y => y - 1) } 
                else setReportMonth(m => m - 1) 
              }} className="p-2 rounded-xl bg-white/10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-lg">{MONTHS[reportMonth]} {reportYear}</h2>
              <button onClick={() => { 
                if (reportMonth === 11) { setReportMonth(0); setReportYear(y => y + 1) } 
                else setReportMonth(m => m + 1) 
              }} className="p-2 rounded-xl bg-white/10">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 text-center">
                <p className="text-3xl font-bold">{reportData.total}</p>
                <p className="text-xs text-white/50">Total</p>
              </div>
              <div className="p-4 rounded-2xl bg-green-500/10 text-center">
                <p className="text-3xl font-bold text-green-400">{reportData.completed}</p>
                <p className="text-xs text-white/50">Concluídas</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 text-center">
                <p className="text-3xl font-bold text-amber-400">{reportData.pending}</p>
                <p className="text-xs text-white/50">Pendentes</p>
              </div>
              <div className="p-4 rounded-2xl bg-red-500/10 text-center">
                <p className="text-3xl font-bold text-red-400">{reportData.overdue}</p>
                <p className="text-xs text-white/50">Atrasadas</p>
              </div>
            </div>

            {/* Taxa de conclusão */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Taxa de Conclusão</span>
                <span className={`text-2xl font-bold ${reportData.rate >= 80 ? 'text-green-400' : reportData.rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {reportData.rate}%
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${reportData.rate}%` }} />
              </div>
            </div>

            {/* Por Membro */}
            {memberStats.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="font-medium">Desempenho por Membro</span>
                </div>
                <div className="space-y-3">
                  {memberStats.map(({ member, total, completed, rate }, index) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <span className="text-lg w-6">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</span>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: member.color }}>{member.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{member.name}</span>
                          <span className={`text-sm font-bold ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{rate}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${rate}%`, backgroundColor: member.color }} />
                          </div>
                          <span className="text-xs text-white/40">{completed}/{total}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Por Categoria */}
            {categoryStats.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Por Categoria</span>
                </div>
                <div className="space-y-3">
                  {categoryStats.map(({ category, total, completed, rate }) => (
                    <div key={category.id} className="flex items-center gap-3">
                      <span className="text-xl w-8 text-center">{category.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{category.name}</span>
                          <span className={`text-sm font-bold ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{rate}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-white/40">{completed}/{total}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportData.total === 0 && (
              <div className="text-center py-12 text-white/40">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma tarefa neste mês</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: FAMÍLIA */}
        {/* ============================================ */}
        {activeTab === 'family' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Membros da Família</h2>
                <span className="text-sm text-white/50">{members.length}</span>
              </div>
              <div className="space-y-3">
                {members.map(member => {
                  const RoleIcon = MEMBER_ROLES[member.role as keyof typeof MEMBER_ROLES]?.icon || Users
                  const memberTasks = tasks.filter(t => assignments.some(a => a.task_id === t.id && a.member_id === member.id) && t.status === 'completed')
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: member.color + '30' }}>{member.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          <RoleIcon className="w-4 h-4" style={{ color: MEMBER_ROLES[member.role as keyof typeof MEMBER_ROLES]?.color }} />
                        </div>
                        <p className="text-xs text-white/50">{memberTasks.length} tarefas concluídas</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {(currentMember?.role === 'owner' || currentMember?.role === 'admin') && family?.invite_code && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10">
                <h3 className="font-medium mb-2 flex items-center gap-2"><Share2 className="w-4 h-4" />Código de Convite</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 py-2 px-3 rounded-lg bg-white/10 font-mono text-lg tracking-wider">{family.invite_code}</code>
                  <button onClick={() => { navigator.clipboard.writeText(family.invite_code); showNotification('success', 'Código copiado!') }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-2">Compartilhe este código para convidar novos membros</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: CONFIGURAÇÕES */}
        {/* ============================================ */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Meu Perfil */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Meu Perfil</h3>
                {!editingProfile && (
                  <button onClick={() => setEditingProfile(true)} className="text-sm text-violet-400 hover:text-violet-300">Editar</button>
                )}
              </div>

              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Nome</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map(a => (
                        <button
                          key={a}
                          onClick={() => setProfileAvatar(a)}
                          className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                            profileAvatar === a ? 'bg-violet-500 ring-2 ring-violet-300' : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Cor</label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c}
                          onClick={() => setProfileColor(c)}
                          className={`w-10 h-10 rounded-lg transition-all ${profileColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditingProfile(false)} className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20">Cancelar</button>
                    <button onClick={handleUpdateProfile} disabled={savingSettings} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50">
                      {savingSettings ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: currentMember?.color }}>{currentMember?.avatar}</div>
                  <div>
                    <p className="font-medium">{currentMember?.name}</p>
                    <p className="text-sm text-white/60">{user?.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Alterar Email */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2"><Mail className="w-4 h-4" />Email</h3>
                {!editingEmail && (
                  <button onClick={() => setEditingEmail(true)} className="text-sm text-violet-400 hover:text-violet-300">Alterar</button>
                )}
              </div>

              {editingEmail ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Email atual</label>
                    <p className="px-4 py-3 rounded-xl bg-white/5 text-white/50">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Novo email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                      placeholder="novo@email.com"
                    />
                  </div>
                  <p className="text-xs text-white/40">Um email de confirmação será enviado para o novo endereço.</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingEmail(false); setNewEmail('') }} className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20">Cancelar</button>
                    <button onClick={handleUpdateEmail} disabled={savingSettings || !newEmail} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50">
                      {savingSettings ? 'Enviando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-white/60">{user?.email}</p>
              )}
            </div>

            {/* Alterar Senha */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2"><Lock className="w-4 h-4" />Senha</h3>
                {!editingPassword && (
                  <button onClick={() => setEditingPassword(true)} className="text-sm text-violet-400 hover:text-violet-300">Alterar</button>
                )}
              </div>

              {editingPassword ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Nova senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Confirmar nova senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingPassword(false); setNewPassword(''); setConfirmPassword('') }} className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20">Cancelar</button>
                    <button onClick={handleUpdatePassword} disabled={savingSettings || !newPassword || !confirmPassword} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50">
                      {savingSettings ? 'Salvando...' : 'Alterar Senha'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-white/60">••••••••</p>
              )}
            </div>

            {/* Sair */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors">
                <LogOut className="w-5 h-5" />
                <span>Sair da conta</span>
              </button>
            </div>

            <div className="text-center text-xs text-white/30 pt-4">FamíliaTask v1.0.0</div>
          </div>
        )}
      </main>

      {/* Menu Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-white/10">
        <div className="flex justify-around py-2">
          {[
            { id: 'tasks', icon: ClipboardList, label: 'Tarefas', badge: tasks.filter(t => getTaskStatus(t) === 'overdue').length },
            { id: 'calendar', icon: Calendar, label: 'Calendário' },
            { id: 'shopping', icon: ShoppingCart, label: 'Compras', badge: shoppingStats.pending },
            { id: 'report', icon: BarChart3, label: 'Relatório' },
            { id: 'family', icon: Users, label: 'Família' },
            { id: 'settings', icon: Settings, label: 'Config' },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all relative ${isActive ? 'text-violet-400' : 'text-white/50'}`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] mt-1">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
