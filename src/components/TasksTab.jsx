import { useState, useEffect, useCallback } from 'react'
import { supabase, today } from '../lib/supabase'
import { Card } from './ui/Card'
import { SavedBadge } from './ui/SavedBadge'

const C = {
  bg: '#FDF6EE', primary: '#E8832A', sage: '#5A8A6A',
  blue: '#4A86B0', rose: '#D95F5F', amber: '#C9923A',
  white: '#FFFFFF', gray: '#6B7280', border: '#E8D5C0',
}
const TODAY = today()

function addDays(d, n) {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date.toISOString().split('T')[0]
}

const TOMORROW = addDays(TODAY, 1)
const WEEK_END = addDays(TODAY, 7)

const PRIORITY_CONFIG = {
  hoch: { label: 'Hoch', color: C.rose, bg: '#FFF0F0' },
  mittel: { label: 'Mittel', color: C.amber, bg: '#FFF8EE' },
  niedrig: { label: 'Niedrig', color: C.sage, bg: '#F0F7F2' },
}

function groupTasks(tasks) {
  const today_ = [], tomorrow_ = [], week_ = [], later_ = []
  for (const t of tasks) {
    if (!t.due || t.due <= TODAY) today_.push(t)
    else if (t.due === TOMORROW) tomorrow_.push(t)
    else if (t.due <= WEEK_END) week_.push(t)
    else later_.push(t)
  }
  return { today: today_, tomorrow: tomorrow_, week: week_, later: later_ }
}

export default function TasksTab() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPriority, setNewPriority] = useState('mittel')
  const [newDue, setNewDue] = useState(TODAY)
  const [showSaved, setShowSaved] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks').select('*').order('created_at', { ascending: true })
      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function toggleTask(task) {
    const next = !task.done
    const { error } = await supabase.from('tasks').update({ done: next }).eq('id', task.id)
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: next } : t))
      flashSaved()
    }
  }

  async function addTask() {
    if (!newName.trim()) return
    const { data, error } = await supabase
      .from('tasks')
      .insert({ name: newName.trim(), priority: newPriority, due: newDue, done: false })
      .select().single()
    if (!error && data) {
      setTasks(prev => [...prev, data])
      setNewName(''); setShowAdd(false)
      flashSaved()
    }
  }

  function flashSaved() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const openTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)
  const totalTasks = tasks.length
  const doneCount = doneTasks.length
  const pct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  const grouped = groupTasks(openTasks)

  const sections = [
    { key: 'today', label: '📅 Heute', items: grouped.today },
    { key: 'tomorrow', label: '🌅 Morgen', items: grouped.tomorrow },
    { key: 'week', label: '📆 Diese Woche', items: grouped.week },
    { key: 'later', label: '🗓 Später', items: grouped.later },
  ].filter(s => s.items.length > 0)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SavedBadge visible={showSaved} />

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Offen', value: openTasks.length, color: C.primary, bg: '#FFF5EC', icon: '📋' },
          { label: 'Erledigt', value: doneCount, color: C.sage, bg: '#F0F7F2', icon: '✅' },
          { label: 'Fortschritt', value: `${pct}%`, color: C.blue, bg: '#EDF4FB', icon: '📊' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: s.bg, borderRadius: 16, padding: '14px 12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div style={{ marginBottom: 14, background: C.white, borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.gray, marginBottom: 6, fontWeight: 600 }}>
            <span>Gesamtfortschritt</span>
            <span style={{ color: C.primary }}>{doneCount} / {totalTasks} Aufgaben</span>
          </div>
          <div style={{ height: 8, background: '#F3F0EB', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? C.sage : C.primary, borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* Task Sections */}
      {sections.length === 0 && doneTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: C.gray }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#333', marginBottom: 4 }}>Alles erledigt!</div>
          <div style={{ fontSize: 14 }}>Füge eine neue Aufgabe hinzu</div>
        </div>
      )}

      {sections.map(section => (
        <div key={section.key} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#444', marginBottom: 8, paddingLeft: 2 }}>
            {section.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {section.items.map(task => {
              const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.mittel
              return (
                <div
                  key={task.id}
                  style={{
                    background: task.done ? '#F9F9F9' : C.white,
                    borderRadius: 14, padding: '13px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                    animation: 'fadeIn 0.2s ease',
                    opacity: task.done ? 0.6 : 1,
                  }}
                >
                  <button
                    onClick={() => toggleTask(task)}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${task.done ? C.sage : C.border}`,
                      background: task.done ? C.sage : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'white', fontWeight: 700,
                      transition: 'all 0.2s',
                    }}
                  >
                    {task.done ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 14, color: '#333',
                      textDecoration: task.done ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.name}
                    </div>
                    {task.due && (
                      <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
                        {task.due === TODAY ? 'Heute' : task.due === TOMORROW ? 'Morgen' : task.due}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px',
                    background: pc.bg, color: pc.color, borderRadius: 6, flexShrink: 0,
                  }}>
                    {pc.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Done Tasks Toggle */}
      {doneTasks.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setShowDone(!showDone)}
            style={{
              width: '100%', padding: '10px', background: '#F9F5F0',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: C.gray,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {showDone ? '▲' : '▼'} {doneTasks.length} erledigte Aufgaben
          </button>
          {showDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {doneTasks.map(task => {
                const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.mittel
                return (
                  <div key={task.id} style={{
                    background: '#F9F9F9', borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6,
                  }}>
                    <button onClick={() => toggleTask(task)} style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${C.sage}`, background: C.sage,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'white', fontWeight: 700,
                    }}>✓</button>
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: C.gray, textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: pc.bg, color: pc.color, borderRadius: 6, flexShrink: 0 }}>
                      {pc.label}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Task */}
      {showAdd ? (
        <Card style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Neue Aufgabe</div>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Was möchtest du erledigen?"
            autoFocus
            style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, marginBottom: 10, background: '#FDF6EE' }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Priorität</div>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, background: C.white }}>
                <option value="hoch">🔴 Hoch</option>
                <option value="mittel">🟡 Mittel</option>
                <option value="niedrig">🟢 Niedrig</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Fällig</div>
              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 12, background: '#F3F0EB', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: C.gray }}>
              Abbrechen
            </button>
            <button onClick={addTask} style={{ flex: 2, padding: 12, background: C.primary, border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 700, color: 'white' }}>
              Aufgabe speichern
            </button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '14px', marginBottom: 8,
            background: `${C.primary}12`, border: `2px dashed ${C.primary}50`,
            borderRadius: 16, color: C.primary, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          + Aufgabe hinzufügen
        </button>
      )}
    </div>
  )
}
