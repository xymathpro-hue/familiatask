'use client'

import React, { useState, useEffect } from 'react'
import { 
  Home, Users, Settings, Plus, Check, Calendar, Star,
  Bell, Trash2, Edit3, Copy, Eye, Clock,
  ShieldCheck, Crown,
  LogOut, Share2, AlertCircle, CheckCircle, X, Mail, Lock, User, Repeat
} from 'lucide-react'
import { supabase, Family, FamilyMember, Task, Category, TaskAssignment } from '@/lib/supabase'

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

const WEEKDAYS = [
  { value: 0, label: 'Dom', short: 'D' },
  { value: 1, label: 'Seg', short: 'S' },
  { value: 2, label: 'Ter', short: 'T' },
  { value: 3, label: 'Qua', short: 'Q' },
  { value: 4, label: 'Qui', short: 'Q' },
  { value: 5, label: 'Sex', short: 'S' },
  { value: 6, label: 'Sáb', short: 'S' }
]

// Função para verificar se tarefa está atrasada
const isTaskOverdue = (task: Task) => {
  if (task.status === 'completed') return false
  if (!task.due_date) return false
  
  const now = new Date()
  const dueDate = new Date(task.due_date)
  
  if (task.due_time) {
    const [hours, minutes] = task.due_time.split(':')
    dueDate.setHours(parseInt(hours), parseInt(minutes))
  } else {
    dueDate.setHours(23, 59, 59)
  }
  
  return now > dueDate
}

// Função para obter status real (incluindo atrasada)
const getTaskStatus = (task: Task) => {
  if (task.status === 'completed') return 'completed'
  if (isTaskOverdue(task)) return 'overdue'
  return task.status
}

export default function FamiliaTaskApp() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [activeTab, setActiveTab] = useState('tasks')
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currentMember, setCurrentMember] = useState<FamilyMember | null>(null)
  const [filterMember, setFilterMember] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadFamilyData(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    if (session?.user) await loadFamilyData(session.user.id)
    setLoading(false)
  }

  const loadFamilyData = async (userId: string) => {
    try {
      const { data: memberData } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', userId)
        .single()

      if (memberData) {
        setCurrentMember(memberData)
        setFamily(memberData.families)
        
        const { data: membersData } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', memberData.family_id)
        if (membersData) setMembers(membersData)

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('family_id', memberData.family_id)
        if (categoriesData) setCategories(categoriesData)

        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*, task_assignments(*)')
          .eq('family_id', memberData.family_id)
          .order('created_at', { ascending: false })
        if (tasksData) setTasks(tasksData)

        supabase
          .channel('family-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${memberData.family_id}` }, () => loadFamilyData(userId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${memberData.family_id}` }, () => loadFamilyData(userId))
          .subscribe()
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const isAdmin = ['owner', 'admin'].includes(currentMember?.role || '')

  const copyInviteCode = async () => {
    if (family?.invite_code) {
      await navigator.clipboard.writeText(family.invite_code)
      showToast('Código copiado!', 'success')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setFamily(null)
    setCurrentMember(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
            <Home className="w-8 h-8 text-white" />
          </div>
          <p className="text-white/60">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user || !family) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onSuccess={checkUser} showToast={showToast} />
  }

  const filteredTasks = tasks.filter(task => {
    if (filterMember !== 'all') {
      const assignments = task.task_assignments?.map((a: TaskAssignment) => a.member_id) || []
      if (filterMember === 'family' && !task.is_for_everyone) return false
      if (filterMember !== 'family' && !assignments.includes(filterMember) && !task.is_for_everyone) return false
    }
    if (filterStatus !== 'all') {
      const realStatus = getTaskStatus(task)
      if (realStatus !== filterStatus) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 safe-area-pt">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{family.name}</h1>
              <p className="text-xs text-white/60">FamíliaTask</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setShowCodeModal(true)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                <Share2 className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
              <span className="text-xl">{currentMember?.avatar}</span>
              <span className="text-sm font-medium">{currentMember?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-24">
        {activeTab === 'tasks' && (
          <div className="py-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">
                <option value="all">Todos</option>
                <option value="family">👨‍👩‍👧‍👦 Família</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">
                <option value="all">Todos Status</option>
                <option value="pending">⏳ Pendente</option>
                <option value="in_progress">🔄 Em Andamento</option>
                <option value="overdue">🔴 Atrasada</option>
                <option value="completed">✅ Concluída</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-white/60">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa encontrada</p>
                  <p className="text-sm mt-2">Toque no + para criar</p>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const category = categories.find(c => c.id === task.category_id)
                  const assignments = task.task_assignments?.map((a: TaskAssignment) => a.member_id) || []
                  const assignedMembers = members.filter(m => assignments.includes(m.id))
                  const canComplete = isAdmin || task.is_for_everyone || assignments.includes(currentMember?.id || '')
                  const realStatus = getTaskStatus(task)
                  const statusConfig = STATUS_CONFIG[realStatus as keyof typeof STATUS_CONFIG]
                  const completedByMember = task.completed_by ? members.find(m => m.id === task.completed_by) : null
                  
                  return (
                    <div key={task.id} className={`p-4 rounded-2xl bg-white/5 border transition-all ${
                      realStatus === 'completed' ? 'border-green-500/30 opacity-70' : 
                      realStatus === 'overdue' ? 'border-red-500/50' : 'border-white/10'
                    }`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={async () => {
                            if (!canComplete) return
                            const newStatus = task.status === 'completed' ? 'pending' : 'completed'
                            await supabase.from('tasks').update({ 
                              status: newStatus, 
                              completed_by: newStatus === 'completed' ? currentMember?.id : null, 
                              completed_at: newStatus === 'completed' ? new Date().toISOString() : null 
                            }).eq('id', task.id)
                            if (user) loadFamilyData(user.id)
                          }}
                          disabled={!canComplete}
                          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            realStatus === 'completed' ? 'bg-green-500 border-green-500' : 
                            realStatus === 'overdue' ? 'border-red-500 hover:bg-red-500/20' :
                            canComplete ? 'border-white/30 hover:border-violet-500' : 'border-white/20 opacity-50'
                          }`}
                        >
                          {realStatus === 'completed' && <Check className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{category?.icon || '📋'}</span>
                            <h3 className={`font-medium ${realStatus === 'completed' ? 'line-through text-white/50' : ''}`}>{task.title}</h3>
                            {task.priority === 'high' && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                            {task.recurrence_type && <Repeat className="w-4 h-4 text-violet-400" />}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                            {task.due_date && (
                              <span className={`flex items-center gap-1 ${realStatus === 'overdue' ? 'text-red-400' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {task.due_time && (
                              <span className={`flex items-center gap-1 ${realStatus === 'overdue' ? 'text-red-400' : ''}`}>
                                <Clock className="w-3 h-3" />
                                {task.due_time.substring(0, 5)}
                              </span>
                            )}
                            {task.has_reminder && <span className="flex items-center gap-1 text-amber-400"><Bell className="w-3 h-3" />Lembrete</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.is_for_everyone ? (
                              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs">👨‍👩‍👧‍👦 Toda Família</span>
                            ) : assignedMembers.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <div className="flex -space-x-2">
                                  {assignedMembers.slice(0, 3).map(m => (
                                    <div key={m.id} className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-slate-900" style={{ backgroundColor: m.color }}>{m.avatar}</div>
                                  ))}
                                </div>
                                {assignedMembers.length > 3 && <span className="text-xs text-white/60">+{assignedMembers.length - 3}</span>}
                              </div>
                            ) : null}
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                              {statusConfig.label}
                            </span>
                          </div>
                          {realStatus === 'completed' && completedByMember && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                              <Check className="w-3 h-3" />
                              <span>Concluída por {completedByMember.avatar} {completedByMember.name}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => { setEditingTask(task); setShowTaskModal(true) }} className="p-2 rounded-lg hover:bg-white/10">
                          <Edit3 className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'family' && (
          <div className="py-4 space-y-6">
            {isAdmin && family.invite_code && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2"><Share2 className="w-5 h-5" />Código de Convite</h3>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 rounded-xl bg-black/30 font-mono text-2xl tracking-widest text-center">{family.invite_code}</code>
                  <button onClick={copyInviteCode} className="p-3 rounded-xl bg-violet-500 hover:bg-violet-600"><Copy className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-white/60 mt-2">Compartilhe para adicionar membros</p>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg mb-4">Membros ({members.length})</h3>
              <div className="space-y-3">
                {members.map(member => {
                  const roleConfig = MEMBER_ROLES[member.role as keyof typeof MEMBER_ROLES]
                  return (
                    <div key={member.id} className={`p-4 rounded-2xl bg-white/5 border ${member.is_temporary ? 'border-dashed border-amber-500/50' : 'border-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: member.color }}>{member.avatar}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            {member.user_id === user?.id && <span className="px-2 py-0.5 rounded text-xs bg-white/20">Você</span>}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-white/60">
                            {React.createElement(roleConfig.icon, { className: 'w-4 h-4', style: { color: roleConfig.color } })}
                            <span>{roleConfig.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
            user={user} 
            currentMember={currentMember} 
            onLogout={handleLogout} 
            onUpdate={async (updates: any) => {
              if (currentMember) {
                await supabase.from('family_members').update(updates).eq('id', currentMember.id)
                if (user) loadFamilyData(user.id)
                showToast('Perfil atualizado!', 'success')
              }
            }}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 safe-area-pb">
        <div className="max-w-lg mx-auto flex">
          {[{ id: 'tasks', icon: Check, label: 'Tarefas' }, { id: 'family', icon: Users, label: 'Família' }, { id: 'settings', icon: Settings, label: 'Config' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-3 ${activeTab === tab.id ? 'text-violet-400' : 'text-white/60'}`}>
              <tab.icon className="w-6 h-6 mb-1" /><span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'tasks' && currentMember?.role !== 'visitor' && (
        <button onClick={() => { setEditingTask(null); setShowTaskModal(true) }} className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg flex items-center justify-center">
          <Plus className="w-7 h-7 text-white" />
        </button>
      )}

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          categories={categories}
          members={members}
          familyId={family.id}
          isAdmin={isAdmin}
          onSave={async (taskData: any, selectedMembers: string[]) => {
            const { assignedMembers, ...taskFields } = taskData
            
            if (editingTask) {
              await supabase.from('tasks').update(taskFields).eq('id', editingTask.id)
              // Atualizar atribuições
              await supabase.from('task_assignments').delete().eq('task_id', editingTask.id)
              if (!taskFields.is_for_everyone && selectedMembers.length > 0) {
                const assignments = selectedMembers.map(memberId => ({
                  task_id: editingTask.id,
                  member_id: memberId,
                  family_id: family.id
                }))
                await supabase.from('task_assignments').insert(assignments)
              }
            } else {
              const { data: newTask } = await supabase.from('tasks').insert({ 
                ...taskFields, 
                family_id: family.id, 
                created_by: currentMember?.id 
              }).select().single()
              
              if (newTask && !taskFields.is_for_everyone && selectedMembers.length > 0) {
                const assignments = selectedMembers.map(memberId => ({
                  task_id: newTask.id,
                  member_id: memberId,
                  family_id: family.id
                }))
                await supabase.from('task_assignments').insert(assignments)
              }
            }
            setShowTaskModal(false)
            setEditingTask(null)
            if (user) loadFamilyData(user.id)
            showToast(editingTask ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success')
          }}
          onDelete={editingTask && isAdmin ? async () => {
            await supabase.from('task_assignments').delete().eq('task_id', editingTask.id)
            await supabase.from('tasks').delete().eq('id', editingTask.id)
            setShowTaskModal(false)
            setEditingTask(null)
            if (user) loadFamilyData(user.id)
            showToast('Tarefa excluída', 'success')
          } : undefined}
          onClose={() => { setShowTaskModal(false); setEditingTask(null) }}
        />
      )}

      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-800 border border-white/10">
            <h3 className="text-xl font-bold mb-4 text-center">Convide sua Família!</h3>
            <code className="block px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 font-mono text-3xl tracking-widest text-center mb-4">{family.invite_code || 'N/A'}</code>
            <p className="text-sm text-white/60 text-center mb-4">Compartilhe este código</p>
            <div className="flex gap-2">
              <button onClick={copyInviteCode} className="flex-1 py-3 rounded-xl bg-violet-500 font-medium flex items-center justify-center gap-2"><Copy className="w-5 h-5" />Copiar</button>
              <button onClick={() => setShowCodeModal(false)} className="px-6 py-3 rounded-xl bg-white/10 font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

// ==================== AUTH SCREEN (SIMPLIFICADO - 2 ABAS) ====================
function AuthScreen({ mode, setMode, onSuccess, showToast }: { mode: 'login' | 'register'; setMode: (m: any) => void; onSuccess: () => void; showToast: (m: string, t: 'success' | 'error') => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          showToast(error.message, 'error')
        } else {
          onSuccess()
        }
      } else if (mode === 'register') {
        // Verificar se tem código de convite
        const hasInviteCode = inviteCode.trim().length > 0

        // 1. Criar usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
        if (authError || !authData.user) {
          showToast(authError?.message || 'Erro ao criar conta', 'error')
          setLoading(false)
          return
        }

        if (hasInviteCode) {
          // ENTRAR EM FAMÍLIA EXISTENTE
          const { data: familyData, error: familyError } = await supabase
            .from('families')
            .select('id')
            .eq('invite_code', inviteCode.toUpperCase())
            .single()

          if (familyError || !familyData) {
            showToast('Código de convite inválido', 'error')
            setLoading(false)
            return
          }

          const { error: memberError } = await supabase
            .from('family_members')
            .insert({ 
              family_id: familyData.id, 
              user_id: authData.user.id, 
              name: name, 
              role: 'member', 
              email: email, 
              avatar: '👤', 
              color: '#4CAF50' 
            })

          if (memberError) {
            showToast('Erro ao entrar na família', 'error')
            setLoading(false)
            return
          }

          showToast('Você entrou na família!', 'success')
        } else {
          // CRIAR NOVA FAMÍLIA
          if (!familyName.trim()) {
            showToast('Digite o nome da família', 'error')
            setLoading(false)
            return
          }

          const newInviteCode = generateInviteCode()
          const { data: familyData, error: familyError } = await supabase
            .from('families')
            .insert({ 
              name: familyName, 
              owner_id: authData.user.id,
              invite_code: newInviteCode
            })
            .select()
            .single()

          if (familyError || !familyData) {
            showToast('Erro ao criar família: ' + (familyError?.message || 'desconhecido'), 'error')
            setLoading(false)
            return
          }

          const { error: memberError } = await supabase
            .from('family_members')
            .insert({ 
              family_id: familyData.id, 
              user_id: authData.user.id, 
              name: name, 
              role: 'owner', 
              email: email, 
              avatar: '👨', 
              color: '#667EEA' 
            })

          if (memberError) {
            showToast('Erro ao criar membro: ' + memberError.message, 'error')
            setLoading(false)
            return
          }

          // Criar categorias padrão
          const defaultCategories = [
            { family_id: familyData.id, name: 'Casa', icon: '🏠', color: '#4CAF50', is_default: true },
            { family_id: familyData.id, name: 'Trabalho', icon: '💼', color: '#2196F3', is_default: true },
            { family_id: familyData.id, name: 'Escola', icon: '📚', color: '#FF9800', is_default: true },
            { family_id: familyData.id, name: 'Saúde', icon: '💊', color: '#E91E63', is_default: true },
            { family_id: familyData.id, name: 'Compras', icon: '🛒', color: '#9C27B0', is_default: true },
            { family_id: familyData.id, name: 'Lazer', icon: '🎮', color: '#00BCD4', is_default: true }
          ]
          await supabase.from('categories').insert(defaultCategories)

          showToast('Família criada com sucesso!', 'success')
        }

        onSuccess()
      }
    } catch (error: any) {
      showToast('Erro: ' + error.message, 'error')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-2xl">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FamíliaTask</h1>
          <p className="text-white/60 mt-2">Organize sua família</p>
        </div>

        <div className="flex mb-6 bg-white/10 rounded-xl p-1">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-violet-500 text-white' : 'text-white/60'}`}>Entrar</button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'register' ? 'bg-violet-500 text-white' : 'text-white/60'}`}>Criar Conta</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white" placeholder="seu@email.com" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white" placeholder="••••••••" required minLength={6} />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm text-white/60 mb-1">Seu Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white" placeholder="Ex: Papai, Mamãe, João" required />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <p className="text-sm text-white/80 font-medium">Tem código de convite?</p>
                <div>
                  <input 
                    type="text" 
                    value={inviteCode} 
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())} 
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white font-mono text-center text-xl tracking-widest" 
                    placeholder="CÓDIGO" 
                    maxLength={8} 
                  />
                  <p className="text-xs text-white/40 mt-1 text-center">Deixe vazio para criar nova família</p>
                </div>

                {!inviteCode && (
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Nome da Nova Família</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none text-white" placeholder="Ex: Família Silva" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold disabled:opacity-50">
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : inviteCode ? 'Entrar na Família' : 'Criar Família'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ==================== TASK MODAL (ATUALIZADO) ====================
function TaskModal({ task, categories, members, isAdmin, onSave, onDelete, onClose }: any) {
  const existingAssignments = task?.task_assignments?.map((a: any) => a.member_id) || []
  
  const [form, setForm] = useState({
    title: task?.title || '',
    category_id: task?.category_id || categories[0]?.id || '',
    is_for_everyone: task?.is_for_everyone ?? true,
    due_date: task?.due_date || '',
    due_time: task?.due_time?.substring(0, 5) || '',
    priority: task?.priority || 'medium',
    has_reminder: task?.has_reminder || false,
    status: task?.status || 'pending',
    recurrence_type: task?.recurrence_type || '',
    recurrence_days: task?.recurrence_days || [],
    recurrence_day_of_month: task?.recurrence_day_of_month || 1
  })
  
  const [selectedMembers, setSelectedMembers] = useState<string[]>(existingAssignments)

  const toggleDay = (day: number) => {
    if (form.recurrence_days.includes(day)) {
      setForm({ ...form, recurrence_days: form.recurrence_days.filter((d: number) => d !== day) })
    } else {
      setForm({ ...form, recurrence_days: [...form.recurrence_days, day] })
    }
  }

  const toggleMember = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId))
    } else {
      setSelectedMembers([...selectedMembers, memberId])
    }
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return
    
    const taskData = {
      ...form,
      due_time: form.due_time || null,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: form.recurrence_type === 'weekly' ? form.recurrence_days : null,
      recurrence_day_of_month: form.recurrence_type === 'monthly' ? form.recurrence_day_of_month : null
    }
    
    onSave(taskData, selectedMembers)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-800 border border-white/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">{task ? 'Editar' : 'Nova'} Tarefa</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-2">Título *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none" placeholder="Ex: Colocar lixo pra fora" required />
            </div>

            {/* Status (só na edição) */}
            {task && (
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none">
                  <option value="pending">⏳ Pendente</option>
                  <option value="in_progress">🔄 Em Andamento</option>
                  <option value="completed">✅ Concluída</option>
                </select>
              </div>
            )}

            {/* Categoria */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Categoria</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat: Category) => (
                    <button key={cat.id} type="button" onClick={() => setForm({ ...form, category_id: cat.id })} className={`p-3 rounded-xl border ${form.category_id === cat.id ? 'border-violet-500 bg-violet-500/20' : 'border-white/20'}`}>
                      <span className="text-xl">{cat.icon}</span>
                      <span className="block text-xs mt-1">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Atribuição */}
            <div>
              <label className="block text-sm font-medium mb-2">Quem faz?</label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/20 cursor-pointer mb-2">
                <input type="checkbox" checked={form.is_for_everyone} onChange={(e) => setForm({ ...form, is_for_everyone: e.target.checked })} className="w-5 h-5 rounded accent-violet-500" />
                <span className="text-xl">👨‍👩‍👧‍👦</span>
                <span>Toda a família</span>
              </label>
              
              {!form.is_for_everyone && (
                <div className="grid grid-cols-2 gap-2">
                  {members.map((member: FamilyMember) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className={`p-3 rounded-xl border flex items-center gap-2 ${selectedMembers.includes(member.id) ? 'border-violet-500 bg-violet-500/20' : 'border-white/20'}`}
                    >
                      <span className="text-xl">{member.avatar}</span>
                      <span className="text-sm">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Data</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Horário</label>
                <input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none" />
              </div>
            </div>

            {/* Recorrência */}
            <div>
              <label className="block text-sm font-medium mb-2">Repetir</label>
              <select value={form.recurrence_type} onChange={(e) => setForm({ ...form, recurrence_type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none">
                <option value="">Não repetir</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>

              {form.recurrence_type === 'weekly' && (
                <div className="flex gap-1 mt-3">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.recurrence_days.includes(day.value) ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/60'}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}

              {form.recurrence_type === 'monthly' && (
                <div className="mt-3">
                  <label className="block text-sm text-white/60 mb-1">Dia do mês</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={form.recurrence_day_of_month} 
                    onChange={(e) => setForm({ ...form, recurrence_day_of_month: parseInt(e.target.value) })} 
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium mb-2">Prioridade</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-violet-500 focus:outline-none">
                <option value="low">🟢 Baixa</option>
                <option value="medium">🟡 Média</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>

            {/* Lembrete */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-white/20 cursor-pointer">
              <input type="checkbox" checked={form.has_reminder} onChange={(e) => setForm({ ...form, has_reminder: e.target.checked })} className="w-5 h-5 rounded accent-violet-500" />
              <Bell className="w-5 h-5 text-amber-400" />
              <span>Ativar lembrete</span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3 mt-6">
            {onDelete && <button type="button" onClick={onDelete} className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400"><Trash2 className="w-5 h-5" /></button>}
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 font-medium">Cancelar</button>
            <button type="button" onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== SETTINGS TAB ====================
const AVATAR_OPTIONS = ['👨', '👩', '👴', '👵', '👦', '👧', '🧔', '👱‍♀️', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '🧑', '👤']
const COLOR_OPTIONS = ['#667EEA', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#F44336', '#3F51B5']

function SettingsTab({ user, currentMember, onLogout, onUpdate }: any) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentMember?.name || '')
  const [avatar, setAvatar] = useState(currentMember?.avatar || '👤')
  const [color, setColor] = useState(currentMember?.color || '#667EEA')

  const handleSave = () => {
    onUpdate({ name, avatar, color })
    setEditing(false)
  }

  return (
    <div className="py-4 space-y-4">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Meu Perfil</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-sm flex items-center gap-1">
              <Edit3 className="w-4 h-4" /> Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Seu Nome</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
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
                    onClick={() => setAvatar(a)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center ${avatar === a ? 'bg-violet-500 ring-2 ring-violet-300' : 'bg-white/10'}`}
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
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-lg ${color === c ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl bg-white/10 font-medium">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium">Salvar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: currentMember?.color }}>
                {currentMember?.avatar}
              </div>
              <div>
                <p className="font-medium">{currentMember?.name}</p>
                <p className="text-sm text-white/60">{user?.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="font-medium mb-4">Conta</h3>
        <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/20 text-red-400">
          <LogOut className="w-5 h-5" /><span>Sair da conta</span>
        </button>
      </div>
    </div>
  )
}
