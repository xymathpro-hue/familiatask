'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Home, Users, Settings, Plus, Check, Calendar, Star,
  Bell, Trash2, Edit3, Copy, Eye, Clock,
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
  'Casa': '🏠',
  'Trabalho': '💼',
  'Escola': '📚',
  'Saúde': '💊',
  'Família': '👨‍👩‍👧‍👦',
  'Lazer': '🎮',
  'Compras': '🛒',
  'Finanças': '💰',
  'Outros': '📋'
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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

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
  
  // Estado do Relatório
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())
  const [reportYear, setReportYear] = useState(new Date().getFullYear())

  // Estado do Calendário
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Estado da Lista de Compras
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<ShoppingCategory>('mercado')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [shoppingFilter, setShoppingFilter] = useState<ShoppingCategory | 'all'>('all')

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
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    try {
      // Buscar membro atual
      const { data: memberData } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', user.id)
        .single()

      if (memberData) {
        setCurrentMember(memberData)
        setFamily(memberData.families)

        // Buscar outros membros
        const { data: membersData } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', memberData.family_id)
          .order('role', { ascending: true })

        setMembers(membersData || [])

        // Buscar tarefas
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('family_id', memberData.family_id)
          .order('due_date', { ascending: true })

        setTasks(tasksData || [])

        // Buscar categorias
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('family_id', memberData.family_id)

        setCategories(categoriesData || [])

        // Buscar atribuições
        const { data: assignmentsData } = await supabase
          .from('task_assignments')
          .select('*')

        setAssignments(assignmentsData || [])

        // Buscar lista de compras
        const { data: shoppingData } = await supabase
          .from('shopping_items')
          .select('*')
          .eq('family_id', memberData.family_id)
          .order('created_at', { ascending: false })

        setShoppingItems(shoppingData || [])

        // Realtime
        setupRealtimeSubscriptions(memberData.family_id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const setupRealtimeSubscriptions = (familyId: string) => {
    supabase
      .channel('family-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `family_id=eq.${familyId}` }, () => loadUserData())
      .subscribe()
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

        if (authData.user) {
          if (inviteCode) {
            // Entrar em família existente
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
                role: 'member',
                avatar: '🧑',
                color: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]
              })
            } else {
              setAuthError('Código de convite inválido')
              return
            }
          } else {
            // Criar nova família
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            const { data: newFamily } = await supabase
              .from('families')
              .insert({ name: 'Minha Família', invite_code: newCode })
              .select()
              .single()

            if (newFamily) {
              await supabase.from('family_members').insert({
                family_id: newFamily.id,
                user_id: authData.user.id,
                name: email.split('@')[0],
                role: 'owner',
                avatar: '👨',
                color: '#667EEA'
              })

              // Criar categorias padrão
              const defaultCategories = ['Casa', 'Trabalho', 'Escola', 'Saúde', 'Família', 'Lazer']
              for (const cat of defaultCategories) {
                await supabase.from('categories').insert({
                  family_id: newFamily.id,
                  name: cat,
                  icon: CATEGORY_ICONS[cat] || '📋',
                  color: COLOR_OPTIONS[defaultCategories.indexOf(cat) % COLOR_OPTIONS.length]
                })
              }
            }
          }
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'Erro na autenticação')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setFamily(null)
    setMembers([])
    setTasks([])
    setCurrentMember(null)
    setShoppingItems([])
  }

  // ============================================
  // FUNÇÕES DE TAREFAS
  // ============================================

  const getTaskStatus = (task: Task): string => {
    if (task.status === 'completed') return 'completed'
    if (task.due_date) {
      const dueDate = new Date(task.due_date)
      const now = new Date()
      if (dueDate < now) return 'overdue'
    }
    return task.status
  }

  const filteredTasks = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)

    return tasks.filter(task => {
      if (taskFilter === 'all') return true
      if (!task.due_date) return false
      
      const taskDate = new Date(task.due_date)
      
      if (taskFilter === 'today') {
        return taskDate >= today && taskDate < new Date(today.getTime() + 86400000)
      }
      if (taskFilter === 'week') {
        return taskDate >= today && taskDate < weekEnd
      }
      return true
    }).sort((a, b) => {
      const statusOrder = { overdue: 0, pending: 1, in_progress: 2, completed: 3 }
      const statusA = getTaskStatus(a)
      const statusB = getTaskStatus(b)
      if (statusOrder[statusA as keyof typeof statusOrder] !== statusOrder[statusB as keyof typeof statusOrder]) {
        return statusOrder[statusA as keyof typeof statusOrder] - statusOrder[statusB as keyof typeof statusOrder]
      }
      return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()
    })
  }, [tasks, taskFilter])

  const overdueCount = useMemo(() => {
    return tasks.filter(t => getTaskStatus(t) === 'overdue').length
  }, [tasks])

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    
    await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        completed_by: newStatus === 'completed' ? currentMember?.id : null
      })
      .eq('id', task.id)

    loadUserData()
    showNotification('success', newStatus === 'completed' ? 'Tarefa concluída! ✅' : 'Tarefa reaberta')
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Excluir esta tarefa?')) return
    
    await supabase.from('task_assignments').delete().eq('task_id', taskId)
    await supabase.from('tasks').delete().eq('id', taskId)
    
    loadUserData()
    showNotification('success', 'Tarefa excluída')
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // ============================================
  // FUNÇÕES DA LISTA DE COMPRAS
  // ============================================

  const addShoppingItem = async () => {
    if (!newItemName.trim() || !family) return

    await supabase.from('shopping_items').insert({
      family_id: family.id,
      name: newItemName.trim(),
      quantity: newItemQuantity,
      category: newItemCategory,
      is_purchased: false,
      added_by: currentMember?.id
    })

    setNewItemName('')
    setNewItemQuantity(1)
    loadUserData()
    showNotification('success', 'Item adicionado! 🛒')
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

  const shoppingStats = useMemo(() => {
    const total = shoppingItems.length
    const purchased = shoppingItems.filter(i => i.is_purchased).length
    const pending = total - purchased
    return { total, purchased, pending }
  }, [shoppingItems])

  // ============================================
  // DADOS DO RELATÓRIO
  // ============================================

  const reportData = useMemo(() => {
    const startDate = new Date(reportYear, reportMonth, 1)
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59)

    const monthTasks = tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate >= startDate && taskDate <= endDate
    })

    const total = monthTasks.length
    const completed = monthTasks.filter(t => t.status === 'completed').length
    const overdue = monthTasks.filter(t => getTaskStatus(t) === 'overdue').length
    const pending = monthTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const memberStats = members.map(member => {
      const memberAssignments = assignments.filter(a => a.member_id === member.id)
      const memberTaskIds = memberAssignments.map(a => a.task_id)
      const memberTasks = monthTasks.filter(t => memberTaskIds.includes(t.id))
      
      const memberTotal = memberTasks.length
      const memberCompleted = memberTasks.filter(t => t.status === 'completed').length
      const memberRate = memberTotal > 0 ? Math.round((memberCompleted / memberTotal) * 100) : 0

      return { member, total: memberTotal, completed: memberCompleted, rate: memberRate }
    }).filter(m => m.total > 0).sort((a, b) => b.rate - a.rate)

    const categoryStats = categories.map(category => {
      const catTasks = monthTasks.filter(t => t.category_id === category.id)
      const catTotal = catTasks.length
      const catCompleted = catTasks.filter(t => t.status === 'completed').length
      
      return {
        category,
        total: catTotal,
        completed: catCompleted,
        rate: catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0
      }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    return { total, completed, overdue, pending, completionRate, memberStats, categoryStats, monthTasks }
  }, [tasks, assignments, members, categories, reportMonth, reportYear])

  // ============================================
  // DADOS DO CALENDÁRIO
  // ============================================

  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean; tasks: Task[] }[] = []

    // Dias do mês anterior
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(calendarYear, calendarMonth, -i)
      days.push({ date, isCurrentMonth: false, tasks: [] })
    }

    // Dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      const dayTasks = tasks.filter(task => {
        if (!task.due_date) return false
        const taskDate = new Date(task.due_date)
        return taskDate.getDate() === i && 
               taskDate.getMonth() === calendarMonth && 
               taskDate.getFullYear() === calendarYear
      })
      days.push({ date, isCurrentMonth: true, tasks: dayTasks })
    }

    // Completar até 42 dias (6 semanas)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(calendarYear, calendarMonth + 1, i)
      days.push({ date, isCurrentMonth: false, tasks: [] })
    }

    return days
  }, [tasks, calendarMonth, calendarYear])

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return []
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate.getDate() === selectedDate.getDate() &&
             taskDate.getMonth() === selectedDate.getMonth() &&
             taskDate.getFullYear() === selectedDate.getFullYear()
    })
  }, [tasks, selectedDate])

  // ============================================
  // EXPORTAR PDF
  // ============================================

  const exportToPDF = () => {
    const content = generateReportHTML()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const generateReportHTML = () => {
    const { total, completed, overdue, pending, completionRate, memberStats, categoryStats } = reportData
    const monthName = MONTHS[reportMonth]

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório ${monthName}/${reportYear} - ${family?.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #667EEA; }
    .header h1 { color: #667EEA; font-size: 28px; margin-bottom: 8px; }
    .header p { color: #666; font-size: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; border-left: 4px solid #667EEA; }
    .stat-card.completed { border-left-color: #4CAF50; }
    .stat-card.pending { border-left-color: #FFC107; }
    .stat-card.overdue { border-left-color: #F44336; }
    .stat-number { font-size: 32px; font-weight: bold; color: #333; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; color: #333; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #eee; }
    .member-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
    .member-avatar { font-size: 24px; margin-right: 12px; }
    .member-info { flex: 1; }
    .member-name { font-weight: 600; }
    .member-stats { font-size: 13px; color: #666; }
    .progress-bar { width: 150px; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-right: 12px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #667EEA, #764BA2); border-radius: 4px; }
    .rate { font-weight: bold; min-width: 45px; text-align: right; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Relatório Mensal</h1>
    <p>${monthName} de ${reportYear} • ${family?.name}</p>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
    <div class="stat-card completed"><div class="stat-number">${completed}</div><div class="stat-label">Concluídas</div></div>
    <div class="stat-card pending"><div class="stat-number">${pending}</div><div class="stat-label">Pendentes</div></div>
    <div class="stat-card overdue"><div class="stat-number">${overdue}</div><div class="stat-label">Atrasadas</div></div>
  </div>
  <div class="section">
    <div class="section-title">📈 Taxa de Conclusão: ${completionRate}%</div>
    <div class="progress-bar" style="width: 100%; height: 20px;"><div class="progress-fill" style="width: ${completionRate}%"></div></div>
  </div>
  <div class="section">
    <div class="section-title">👥 Desempenho por Membro</div>
    ${memberStats.map(({ member, total, completed, rate }, index) => `
      <div class="member-row">
        <div class="member-avatar">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''} ${member.avatar}</div>
        <div class="member-info"><div class="member-name">${member.name}</div><div class="member-stats">${completed} de ${total} tarefas</div></div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${rate}%; background: ${member.color}"></div></div>
        <div class="rate" style="color: ${rate >= 80 ? '#4CAF50' : rate >= 50 ? '#FFC107' : '#F44336'}">${rate}%</div>
      </div>
    `).join('')}
  </div>
  <div class="section">
    <div class="section-title">📂 Por Categoria</div>
    ${categoryStats.map(({ category, total, completed, rate }) => `
      <div class="member-row">
        <div class="member-avatar">${category.icon}</div>
        <div class="member-info"><div class="member-name">${category.name}</div><div class="member-stats">${completed} de ${total} tarefas</div></div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${rate}%"></div></div>
        <div class="rate" style="color: ${rate >= 80 ? '#4CAF50' : rate >= 50 ? '#FFC107' : '#F44336'}">${rate}%</div>
      </div>
    `).join('')}
  </div>
  <div class="footer">Gerado em ${new Date().toLocaleDateString('pt-BR')} • FamíliaTask</div>
</body>
</html>`
  }

  // ============================================
  // COMPONENTE: RELATÓRIO
  // ============================================

  const ReportTab = () => {
    const { total, completed, overdue, pending, completionRate, memberStats, categoryStats } = reportData

    return (
      <div className="space-y-6">
        {/* Navegação do Mês */}
        <div className="flex items-center justify-between">
          <button onClick={() => { if (reportMonth === 0) { setReportMonth(11); setReportYear(reportYear - 1) } else { setReportMonth(reportMonth - 1) } }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold">{MONTHS[reportMonth]}</h2>
            <p className="text-white/60">{reportYear}</p>
          </div>
          <button onClick={() => { if (reportMonth === 11) { setReportMonth(0); setReportYear(reportYear + 1) } else { setReportMonth(reportMonth + 1) } }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-violet-400" />
              <span className="text-sm text-white/60">Total</span>
            </div>
            <p className="text-3xl font-bold">{total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-white/60">Concluídas</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{completed}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-white/60">Pendentes</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">{pending}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-white/60">Atrasadas</span>
            </div>
            <p className="text-3xl font-bold text-red-400">{overdue}</p>
          </div>
        </div>

        {/* Taxa de Conclusão */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-violet-400" />
              <span className="font-medium">Taxa de Conclusão</span>
            </div>
            <span className={`text-2xl font-bold ${completionRate >= 80 ? 'text-green-400' : completionRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {completionRate}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : completionRate >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Desempenho por Membro */}
        {memberStats.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="font-medium">Desempenho por Membro</span>
            </div>
            <div className="space-y-3">
              {memberStats.map(({ member, total, completed, rate }, index) => (
                <div key={member.id} className="flex items-center gap-3">
                  {index === 0 && <span className="text-lg">🥇</span>}
                  {index === 1 && <span className="text-lg">🥈</span>}
                  {index === 2 && <span className="text-lg">🥉</span>}
                  {index > 2 && <span className="w-7" />}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: member.color + '30' }}>{member.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{member.name}</span>
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

        {/* Botão Exportar */}
        <button onClick={exportToPDF} className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Download className="w-5 h-5" />
          Exportar PDF
        </button>

        {total === 0 && (
          <div className="text-center py-8 text-white/40">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa neste mês</p>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // COMPONENTE: CALENDÁRIO
  // ============================================

  const CalendarTab = () => {
    const today = new Date()
    
    return (
      <div className="space-y-4">
        {/* Navegação do Mês */}
        <div className="flex items-center justify-between">
          <button onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1) } else { setCalendarMonth(calendarMonth - 1) } }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold">{MONTHS[calendarMonth]}</h2>
            <p className="text-white/60">{calendarYear}</p>
          </div>
          <button onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1) } else { setCalendarMonth(calendarMonth + 1) } }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map(day => (
            <div key={day} className="text-center text-xs font-medium text-white/50 py-2">{day}</div>
          ))}
        </div>

        {/* Grid do Calendário */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((day, index) => {
            const isToday = day.date.toDateString() === today.toDateString()
            const isSelected = selectedDate?.toDateString() === day.date.toDateString()
            const hasCompleted = day.tasks.some(t => t.status === 'completed')
            const hasOverdue = day.tasks.some(t => getTaskStatus(t) === 'overdue')
            const hasPending = day.tasks.some(t => t.status === 'pending' || t.status === 'in_progress')

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day.date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  !day.isCurrentMonth ? 'opacity-30' : ''
                } ${isSelected ? 'bg-violet-500 ring-2 ring-violet-300' : isToday ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>
                  {day.date.getDate()}
                </span>
                {day.tasks.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {hasOverdue && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legenda */}
        <div className="flex justify-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Atrasada</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Pendente</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Concluída</div>
        </div>

        {/* Tarefas do Dia Selecionado */}
        {selectedDate && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDateTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDateTasks.map(task => {
                  const status = getTaskStatus(task)
                  const category = categories.find(c => c.id === task.category_id)
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl flex items-center gap-3 ${
                        status === 'completed' ? 'bg-green-500/10' :
                        status === 'overdue' ? 'bg-red-500/10' : 'bg-white/5'
                      }`}
                    >
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                          status === 'completed' ? 'bg-green-500 border-green-500' : 'border-white/30'
                        }`}
                      >
                        {status === 'completed' && <Check className="w-3 h-3" />}
                      </button>
                      <span className="text-sm">{category?.icon}</span>
                      <span className={`flex-1 ${status === 'completed' ? 'line-through text-white/50' : ''}`}>
                        {task.title}
                      </span>
                      {task.due_time && (
                        <span className="text-xs text-white/50">{task.due_time.slice(0, 5)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-white/40 py-4">Nenhuma tarefa neste dia</p>
            )}

            <button
              onClick={() => { setShowTaskModal(true); setEditingTask(null) }}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // COMPONENTE: LISTA DE COMPRAS
  // ============================================

  const ShoppingTab = () => {
    const [showCategoryPicker, setShowCategoryPicker] = useState(false)

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

    const markCategoryAsPurchased = async (category: ShoppingCategory) => {
      const categoryItems = shoppingItems.filter(i => i.category === category && !i.is_purchased)
      
      if (categoryItems.length === 0) {
        showNotification('error', 'Nenhum item pendente nesta categoria')
        return
      }

      for (const item of categoryItems) {
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
      showNotification('success', `${categoryItems.length} itens de ${SHOPPING_CATEGORIES.find(c => c.id === category)?.label} comprados! ✅`)
    }

    // Agrupar itens por categoria
    const groupedItems = useMemo(() => {
      const groups: Record<string, ShoppingItem[]> = {}
      
      const itemsToShow = shoppingFilter === 'all' 
        ? shoppingItems 
        : shoppingItems.filter(i => i.category === shoppingFilter)

      itemsToShow.forEach(item => {
        if (!groups[item.category]) {
          groups[item.category] = []
        }
        groups[item.category].push(item)
      })

      // Ordenar: pendentes primeiro, depois comprados
      Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => {
          if (a.is_purchased === b.is_purchased) return 0
          return a.is_purchased ? 1 : -1
        })
      })

      return groups
    }, [shoppingItems, shoppingFilter])

    return (
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

          {/* Seletor de Categorias */}
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
          <div className="flex gap-2">
            <button
              onClick={markAllAsPurchased}
              className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium flex items-center justify-center gap-2 hover:bg-green-500/30"
            >
              <Check className="w-5 h-5" />
              Comprei Tudo ({shoppingStats.pending})
            </button>
          </div>
        )}

        {/* Filtro */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setShoppingFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                shoppingFilter === 'all' ? 'bg-violet-500' : 'bg-white/10'
              }`}
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
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap ${
                    shoppingFilter === cat.id ? 'bg-violet-500' : 'bg-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {count > 0 && <span className="text-xs bg-white/20 px-1.5 rounded-full">{count}</span>}
                </button>
              )
            })}
          </div>

          {shoppingStats.purchased > 0 && (
            <button 
              onClick={clearPurchasedItems} 
              className="text-xs text-red-400 hover:text-red-300 whitespace-nowrap ml-2"
            >
              Limpar comprados
            </button>
          )}
        </div>

        {/* Lista de Itens Agrupados por Categoria */}
        {Object.keys(groupedItems).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([categoryId, items]) => {
              const cat = SHOPPING_CATEGORIES.find(c => c.id === categoryId)
              const pendingInCategory = items.filter(i => !i.is_purchased).length
              const purchasedInCategory = items.filter(i => i.is_purchased).length

              return (
                <div key={categoryId} className="space-y-2">
                  {/* Cabeçalho da Categoria */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat?.icon}</span>
                      <span className="font-medium text-sm">{cat?.label}</span>
                      <span className="text-xs text-white/40">
                        {pendingInCategory > 0 && `${pendingInCategory} pendente${pendingInCategory > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    {pendingInCategory > 1 && (
                      <button
                        onClick={() => markCategoryAsPurchased(categoryId as ShoppingCategory)}
                        className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Comprar todos
                      </button>
                    )}
                  </div>

                  {/* Itens da Categoria */}
                  {items.map(item => {
                    const addedBy = members.find(m => m.id === item.added_by)
                    const purchasedBy = members.find(m => m.id === item.purchased_by)

                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                          item.is_purchased 
                            ? 'bg-green-500/10 border-green-500/20 opacity-60' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <button
                          onClick={() => toggleShoppingItem(item)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.is_purchased 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-white/30 hover:border-green-500'
                          }`}
                        >
                          {item.is_purchased && <Check className="w-4 h-4" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${item.is_purchased ? 'line-through text-white/50' : ''}`}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            {addedBy && (
                              <span className="flex items-center gap-1">
                                <span 
                                  className="w-4 h-4 rounded flex items-center justify-center text-[10px]"
                                  style={{ backgroundColor: addedBy.color + '40' }}
                                >
                                  {addedBy.avatar}
                                </span>
                                {addedBy.name}
                              </span>
                            )}
                            {item.is_purchased && purchasedBy && (
                              <span className="text-green-400/60">
                                • ✓ {purchasedBy.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`px-2 py-1 rounded-lg text-sm ${
                          item.is_purchased ? 'bg-green-500/20' : 'bg-white/10'
                        }`}>
                          {item.quantity}x
                        </span>

                        <button 
                          onClick={() => deleteShoppingItem(item.id)} 
                          className="p-2 rounded-lg hover:bg-red-500/20"
                        >
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

        {/* Dica */}
        {shoppingStats.total > 0 && shoppingStats.pending > 0 && (
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-center">
            💡 Dica: Todos da família podem adicionar e marcar itens em tempo real!
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // COMPONENTE: CONFIGURAÇÕES
  // ============================================

  const SettingsTab = ({ 
    user, 
    currentMember, 
    onLogout, 
    onUpdateMember,
    showNotification 
  }: { 
    user: any
    currentMember: FamilyMember | null
    onLogout: () => void
    onUpdateMember: () => void
    showNotification: (type: 'success' | 'error', message: string) => void
  }) => {
    const [editingProfile, setEditingProfile] = useState(false)
    const [editingEmail, setEditingEmail] = useState(false)
    const [editingPassword, setEditingPassword] = useState(false)
    
    // Estados do perfil
    const [profileName, setProfileName] = useState(currentMember?.name || '')
    const [profileAvatar, setProfileAvatar] = useState(currentMember?.avatar || '👨')
    const [profileColor, setProfileColor] = useState(currentMember?.color || '#667EEA')
    
    // Estados de email/senha
    const [newEmail, setNewEmail] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleUpdateProfile = async () => {
      if (!currentMember) return
      setLoading(true)
      
      try {
        await supabase
          .from('family_members')
          .update({
            name: profileName,
            avatar: profileAvatar,
            color: profileColor
          })
          .eq('id', currentMember.id)

        showNotification('success', 'Perfil atualizado!')
        setEditingProfile(false)
        onUpdateMember()
      } catch (error) {
        showNotification('error', 'Erro ao atualizar perfil')
      } finally {
        setLoading(false)
      }
    }

    const handleUpdateEmail = async () => {
      if (!newEmail) return
      setLoading(true)
      
      try {
        const { error } = await supabase.auth.updateUser({ email: newEmail })
        
        if (error) throw error
        
        showNotification('success', 'Email de confirmação enviado para o novo endereço!')
        setEditingEmail(false)
        setNewEmail('')
      } catch (error: any) {
        showNotification('error', error.message || 'Erro ao atualizar email')
      } finally {
        setLoading(false)
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
      
      setLoading(true)
      
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        
        if (error) throw error
        
        showNotification('success', 'Senha atualizada com sucesso!')
        setEditingPassword(false)
        setNewPassword('')
        setConfirmPassword('')
        setCurrentPassword('')
      } catch (error: any) {
        showNotification('error', error.message || 'Erro ao atualizar senha')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="space-y-4">
        {/* Meu Perfil */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Meu Perfil</h3>
            {!editingProfile && (
              <button 
                onClick={() => setEditingProfile(true)}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Editar
              </button>
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
                  placeholder="Seu nome"
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
                      className={`w-10 h-10 rounded-lg transition-all ${
                        profileColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: currentMember?.color }}
              >
                {currentMember?.avatar}
              </div>
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
            <h3 className="font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </h3>
            {!editingEmail && (
              <button 
                onClick={() => setEditingEmail(true)}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Alterar
              </button>
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
              <p className="text-xs text-white/40">
                Um email de confirmação será enviado para o novo endereço.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingEmail(false); setNewEmail('') }}
                  className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateEmail}
                  disabled={loading || !newEmail}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Confirmar'}
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
            <h3 className="font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Senha
            </h3>
            {!editingPassword && (
              <button 
                onClick={() => setEditingPassword(true)}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Alterar
              </button>
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
                  minLength={6}
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
                  minLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingPassword(false); setNewPassword(''); setConfirmPassword('') }}
                  className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdatePassword}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-white/60">••••••••</p>
          )}
        </div>

        {/* Sair */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="font-medium mb-4">Conta</h3>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair da conta</span>
          </button>
        </div>

        {/* Versão */}
        <div className="text-center text-xs text-white/30 pt-4">
          FamíliaTask v1.0.0
        </div>
      </div>
    )
  }

  // ============================================
  // COMPONENTE: TASK CARD
  // ============================================

  const TaskCard = ({ task }: { task: Task }) => {
    const status = getTaskStatus(task)
    const category = categories.find(c => c.id === task.category_id)
    const taskAssignments = assignments.filter(a => a.task_id === task.id)
    const assignedMembers = members.filter(m => taskAssignments.some(a => a.member_id === m.id))
    const completedByMember = members.find(m => m.id === task.completed_by)

    return (
      <div className={`p-4 rounded-2xl border transition-all ${
        status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
        status === 'overdue' ? 'bg-red-500/10 border-red-500/30' :
        'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleTaskStatus(task)}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              status === 'completed' ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white/50'
            }`}
          >
            {status === 'completed' && <Check className="w-4 h-4" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {category && <span className="text-sm">{category.icon}</span>}
              <h3 className={`font-medium truncate ${status === 'completed' ? 'line-through text-white/50' : ''}`}>
                {task.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50">
              {task.due_date && (
                <span className={status === 'overdue' ? 'text-red-400' : ''}>
                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  {task.due_time && ` ${task.due_time.slice(0, 5)}`}
                </span>
              )}
              {task.recurrence && task.recurrence !== 'none' && (
                <span className="flex items-center gap-1"><Repeat className="w-3 h-3" /></span>
              )}
            </div>

            {assignedMembers.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {assignedMembers.slice(0, 3).map(member => (
                  <div key={member.id} className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: member.color + '40' }} title={member.name}>
                    {member.avatar}
                  </div>
                ))}
                {assignedMembers.length > 3 && <span className="text-xs text-white/40">+{assignedMembers.length - 3}</span>}
              </div>
            )}

            {status === 'completed' && completedByMember && (
              <p className="text-xs text-green-400 mt-2">✓ Concluída por {completedByMember.name}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => { setEditingTask(task); setShowTaskModal(true) }} className="p-2 rounded-lg hover:bg-white/10">
              <Edit3 className="w-4 h-4 text-white/50" />
            </button>
            <button onClick={() => deleteTask(task.id)} className="p-2 rounded-lg hover:bg-red-500/20">
              <Trash2 className="w-4 h-4 text-red-400/50" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // TELA DE LOGIN
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h1 className="text-3xl font-bold text-white mb-2">FamíliaTask</h1>
            <p className="text-white/60">Organize as tarefas da sua família</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
            <div className="flex mb-6 bg-white/10 rounded-xl p-1">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg font-medium transition-all ${authMode === 'login' ? 'bg-violet-500' : ''}`}>Entrar</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-lg font-medium transition-all ${authMode === 'register' ? 'bg-violet-500' : ''}`}>Criar Conta</button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white" placeholder="seu@email.com" required />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white" placeholder="••••••••" required minLength={6} />
                </div>
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-sm text-white/60 mb-2">Código de Convite <span className="text-white/40">(opcional)</span></label>
                  <div className="relative">
                    <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white uppercase" placeholder="ABC123" maxLength={6} />
                  </div>
                  <p className="text-xs text-white/40 mt-1">Tem código? Entre na família existente. Não tem? Crie uma nova!</p>
                </div>
              )}

              {authError && <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{authError}</div>}

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-bold hover:opacity-90 transition-opacity">
                {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // APP PRINCIPAL
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
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
              <button onClick={() => { setEditingTask(null); setShowTaskModal(true) }} className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-4 pb-24">
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['today', 'week', 'all'] as const).map(filter => (
                <button key={filter} onClick={() => setTaskFilter(filter)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${taskFilter === filter ? 'bg-violet-500' : 'bg-white/10 hover:bg-white/20'}`}>
                  {filter === 'today' ? 'Hoje' : filter === 'week' ? 'Semana' : 'Todas'}
                </button>
              ))}
            </div>

            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma tarefa {taskFilter === 'today' ? 'para hoje' : taskFilter === 'week' ? 'esta semana' : ''}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'shopping' && <ShoppingTab />}
        {activeTab === 'report' && <ReportTab />}

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

        {activeTab === 'settings' && (
          <SettingsTab 
            user={user}
            currentMember={currentMember}
            onLogout={handleLogout}
            onUpdateMember={loadUserData}
            showNotification={showNotification}
          />
        )}
      </main>

      {/* Menu Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50">
        <div className="flex justify-around">
          {[
            { id: 'tasks', icon: Home, label: 'Início', badge: overdueCount },
            { id: 'calendar', icon: Calendar, label: 'Calendário' },
            { id: 'shopping', icon: ShoppingCart, label: 'Compras', badge: shoppingStats.pending },
            { id: 'report', icon: BarChart3, label: 'Relatório' },
            { id: 'family', icon: Users, label: 'Família' },
            { id: 'settings', icon: Settings, label: 'Config' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center py-2 px-2 rounded-xl transition-all relative ${activeTab === tab.id ? 'text-violet-400' : 'text-white/50'}`}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] mt-1">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center">{tab.badge > 9 ? '9+' : tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Notificação */}
      {notification && (
        <div className={`fixed top-4 left-4 right-4 p-4 rounded-2xl z-50 flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
    </div>
  )
}
