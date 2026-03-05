import { useState, useEffect, useCallback } from 'react'
import { supabase, today } from '../lib/supabase'
import { Ring } from './ui/Ring'
import { Card } from './ui/Card'
import { SavedBadge } from './ui/SavedBadge'

const C = {
  bg: '#EFF5FC', primary: '#1E6FBF', sage: '#2A9D8F',
  blue: '#4A7FA5', rose: '#D95F5F', amber: '#E07B39',
  white: '#FFFFFF', gray: '#6B7280', border: '#C5D9EF',
}

const TODAY = today()
const WEEK_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getWeekDates() {
  const d = new Date()
  const dow = d.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + mondayOffset + i)
    return dd.toISOString().split('T')[0]
  })
}

const EMOJI_OPTIONS = ['⭐', '🏃', '💧', '📚', '🧘', '💪', '🍎', '😴', '🎯', '✍️', '🎸', '🌿', '🧹', '☕', '🚶', '🎨', '🙏', '📝']

export default function HabitsTab() {
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState({})
  const [weekLogs, setWeekLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('⭐')
  const [newTarget, setNewTarget] = useState(1)
  const [showSaved, setShowSaved] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('⭐')
  const [editTarget, setEditTarget] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sortMode, setSortMode] = useState(false)
  const weekDates = getWeekDates()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: habitsData, error: hErr } = await supabase
        .from('habits').select('*')
      if (hErr) throw hErr
      // Sort by position (nulls last), then created_at
      ;(habitsData || []).sort((a, b) => {
        if (a.position != null && b.position != null) return a.position - b.position
        if (a.position != null) return -1
        if (b.position != null) return 1
        return new Date(a.created_at) - new Date(b.created_at)
      })
      // Initialize positions for habits without one
      const toInit = (habitsData || []).filter(h => h.position == null)
      if (toInit.length > 0) {
        ;(habitsData || []).forEach((h, i) => {
          if (h.position == null) {
            h.position = i + 1
            supabase.from('habits').update({ position: i + 1 }).eq('id', h.id)
          }
        })
      }

      const allDates = weekDates
      const { data: allLogs } = await supabase
        .from('habit_logs').select('*').in('datum', allDates)

      const todayLogs = (allLogs || []).filter(l => l.datum === TODAY)
      const logsMap = {}
      for (const l of todayLogs) logsMap[l.habit_id] = { done: l.done, id: l.id }

      if (habitsData) {
        for (const h of habitsData) {
          if (!logsMap[h.id]) {
            const { data: nl } = await supabase
              .from('habit_logs').insert({ habit_id: h.id, datum: TODAY, done: 0 }).select().single()
            if (nl) logsMap[h.id] = { done: 0, id: nl.id }
          }
        }
      }

      const wMap = {}
      for (const d of weekDates) {
        const dayLogs = (allLogs || []).filter(l => l.datum === d)
        const total = (habitsData || []).length
        const done = dayLogs.filter(l => {
          const h = (habitsData || []).find(hh => hh.id === l.habit_id)
          return h && l.done >= h.target
        }).length
        wMap[d] = { done, total }
      }

      setHabits(habitsData || [])
      setLogs(logsMap)
      setWeekLogs(wMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function toggleHabit(habit) {
    const log = logs[habit.id]
    if (!log) return
    const prev = log.done
    let next
    if (habit.target === 1) {
      next = prev >= 1 ? 0 : 1
    } else {
      next = prev < habit.target ? prev + 1 : 0
    }
    setLogs(l => ({ ...l, [habit.id]: { ...l[habit.id], done: next } }))
    const { error } = await supabase.from('habit_logs').update({ done: next }).eq('id', log.id)
    if (error) { setLogs(l => ({ ...l, [habit.id]: { ...l[habit.id], done: prev } })); return }

    const wasComplete = prev >= habit.target
    const isComplete = next >= habit.target
    if (!wasComplete && isComplete) {
      const ns = (habit.streak || 0) + 1
      await supabase.from('habits').update({ streak: ns }).eq('id', habit.id)
      setHabits(h => h.map(hh => hh.id === habit.id ? { ...hh, streak: ns } : hh))
    } else if (wasComplete && !isComplete) {
      const ns = Math.max(0, (habit.streak || 0) - 1)
      await supabase.from('habits').update({ streak: ns }).eq('id', habit.id)
      setHabits(h => h.map(hh => hh.id === habit.id ? { ...hh, streak: ns } : hh))
    }
    flashSaved()
  }

  async function decrementHabit(habit) {
    const log = logs[habit.id]
    if (!log || log.done <= 0) return
    const prev = log.done
    const next = prev - 1
    setLogs(l => ({ ...l, [habit.id]: { ...l[habit.id], done: next } }))
    const { error } = await supabase.from('habit_logs').update({ done: next }).eq('id', log.id)
    if (error) { setLogs(l => ({ ...l, [habit.id]: { ...l[habit.id], done: prev } })); return }
    // Streak: war fertig, jetzt nicht mehr
    if (prev >= habit.target && next < habit.target) {
      const ns = Math.max(0, (habit.streak || 0) - 1)
      await supabase.from('habits').update({ streak: ns }).eq('id', habit.id)
      setHabits(h => h.map(hh => hh.id === habit.id ? { ...hh, streak: ns } : hh))
    }
    flashSaved()
  }

  async function addHabit() {
    if (!newName.trim()) return
    const { data, error } = await supabase
      .from('habits')
      .insert({ name: newName.trim(), emoji: newEmoji, target: newTarget, streak: 0, color: C.primary })
      .select().single()
    if (error) { console.error('Habit hinzufügen fehlgeschlagen:', error); return }
    const pos = habits.length + 1
    await supabase.from('habits').update({ position: pos }).eq('id', data.id)
    setHabits(h => [...h, { ...data, position: pos }])
    const { data: nl } = await supabase
      .from('habit_logs').insert({ habit_id: data.id, datum: TODAY, done: 0 }).select().single()
    if (nl) setLogs(l => ({ ...l, [data.id]: { done: 0, id: nl.id } }))
    setNewName(''); setNewEmoji('⭐'); setNewTarget(1); setShowAdd(false)
    flashSaved()
  }

  function openEdit(habit) {
    setEditingHabit(habit)
    setEditName(habit.name)
    setEditEmoji(habit.emoji)
    setEditTarget(habit.target)
    setConfirmDelete(false)
  }

  function closeEdit() {
    setEditingHabit(null)
    setConfirmDelete(false)
  }

  async function saveEdit() {
    if (!editName.trim() || !editingHabit) return
    const updates = { name: editName.trim(), emoji: editEmoji, target: editTarget }
    const { error } = await supabase.from('habits').update(updates).eq('id', editingHabit.id)
    if (!error) {
      setHabits(h => h.map(hh => hh.id === editingHabit.id ? { ...hh, ...updates } : hh))
      closeEdit()
      flashSaved()
    }
  }

  async function deleteHabit() {
    if (!editingHabit) return
    const { error } = await supabase.from('habits').delete().eq('id', editingHabit.id)
    if (!error) {
      setHabits(h => h.filter(hh => hh.id !== editingHabit.id))
      setLogs(l => { const nl = { ...l }; delete nl[editingHabit.id]; return nl })
      closeEdit()
      flashSaved()
    }
  }

  function moveHabit(index, dir) {
    const next = [...habits]
    const targetIdx = index + dir
    if (targetIdx < 0 || targetIdx >= next.length) return
    ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]
    setHabits(next)
    next.forEach((h, i) => supabase.from('habits').update({ position: i + 1 }).eq('id', h.id))
  }

  function flashSaved() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const doneCount = habits.filter(h => (logs[h.id]?.done || 0) >= h.target).length
  const progress = habits.length > 0 ? (doneCount / habits.length) * 100 : 0

  function greeting() {
    if (progress === 100) return '🎉 Alles geschafft! Du bist grossartig!'
    if (progress >= 75) return '💪 Fast am Ziel! Weiter so!'
    if (progress >= 50) return '🌟 Gute Arbeit – du bist auf Kurs!'
    if (progress >= 25) return '🌱 Guter Start! Bleib dran!'
    return '☀️ Guten Morgen! Mach deinen Tag fantastisch!'
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SavedBadge visible={showSaved} />

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.sage} 100%)`,
        borderRadius: 20, padding: '20px 20px', marginBottom: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 4px 20px rgba(30,111,191,0.3)',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 4 }}>Meine Gewohnheiten</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{greeting()}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            {doneCount} / {habits.length} heute erledigt
          </div>
        </div>
        <Ring percent={progress} size={74} color="white" trackColor="rgba(255,255,255,0.25)" />
      </div>

      {/* Week */}
      <Card style={{ marginBottom: 14, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Diese Woche
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {WEEK_LABELS.map((label, i) => {
            const d = weekDates[i]
            const isToday = d === TODAY
            const isFuture = d > TODAY
            const wl = weekLogs[d]
            const isDone = !isFuture && wl && wl.total > 0 && wl.done === wl.total
            const isPartial = !isFuture && wl && wl.done > 0 && wl.done < wl.total
            let bg = '#E8EEF5', textColor = C.gray
            if (isDone) { bg = C.primary; textColor = 'white' }
            else if (isPartial) { bg = `${C.primary}55`; textColor = C.primary }
            else if (isToday) { bg = `${C.primary}18`; textColor = C.primary }
            return (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? C.primary : C.gray }}>{label}</div>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: bg, color: textColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  border: isToday ? `2px solid ${C.primary}` : '2px solid transparent', transition: 'all 0.2s',
                }}>
                  {isDone ? '✓' : isPartial ? wl.done : ''}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Habit List Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {habits.length} Habit{habits.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setSortMode(s => !s)}
          style={{
            padding: '5px 12px', borderRadius: 10,
            background: sortMode ? C.primary : '#E8EEF5',
            color: sortMode ? 'white' : C.gray,
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
          }}
        >
          {sortMode ? '✓ Fertig' : '↕ Sortieren'}
        </button>
      </div>

      {/* Habit List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {habits.map((habit, index) => {
          const done = logs[habit.id]?.done || 0
          const completed = done >= habit.target
          const pct = habit.target > 1 ? Math.min(done / habit.target, 1) : 0
          const col = habit.color || C.primary
          return (
            <div
              key={habit.id}
              onClick={sortMode ? undefined : () => toggleHabit(habit)}
              style={{
                background: C.white, borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                border: `2px solid ${!sortMode && completed ? col + '60' : 'transparent'}`,
                boxShadow: !sortMode && completed ? `0 2px 12px ${col}25` : '0 1px 6px rgba(0,0,0,0.05)',
                cursor: sortMode ? 'default' : 'pointer', transition: 'all 0.2s ease',
                transform: !sortMode && completed ? 'scale(1.01)' : 'scale(1)',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: !sortMode && completed ? col : `${col}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, transition: 'all 0.2s',
              }}>
                {habit.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 15, color: '#222',
                  textDecoration: !sortMode && completed && habit.target === 1 ? 'line-through' : 'none',
                  opacity: !sortMode && completed && habit.target === 1 ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}>
                  {habit.name}
                </div>
                {!sortMode && habit.target > 1 ? (
                  <div style={{ marginTop: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); decrementHabit(habit) }}
                        disabled={done <= 0}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', border: 'none', flexShrink: 0,
                          background: done > 0 ? `${col}20` : '#E8EEF5',
                          color: done > 0 ? col : '#CCC',
                          fontWeight: 900, fontSize: 16, lineHeight: 1,
                          cursor: done > 0 ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >−</button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.gray }}>{done} / {habit.target}</span>
                      <span style={{ fontSize: 11, color: C.gray, marginLeft: 'auto' }}>{Math.round(pct * 100)}%</span>
                    </div>
                    <div style={{ height: 5, background: '#E8EEF5', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct * 100}%`, background: col, borderRadius: 3, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                ) : !sortMode && habit.streak > 0 ? (
                  <div style={{ fontSize: 12, color: '#F39C12', marginTop: 2, fontWeight: 600 }}>
                    🔥 {habit.streak} {habit.streak === 1 ? 'Tag' : 'Tage'} Serie
                  </div>
                ) : null}
              </div>

              {sortMode ? (
                /* Sort Mode: ▲/▼ Buttons */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); moveHabit(index, -1) }}
                    disabled={index === 0}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      background: index === 0 ? '#E8EEF5' : `${C.primary}20`,
                      color: index === 0 ? '#CCC' : C.primary,
                      cursor: index === 0 ? 'default' : 'pointer',
                      fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▲</button>
                  <button
                    onClick={e => { e.stopPropagation(); moveHabit(index, 1) }}
                    disabled={index === habits.length - 1}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      background: index === habits.length - 1 ? '#E8EEF5' : `${C.primary}20`,
                      color: index === habits.length - 1 ? '#CCC' : C.primary,
                      cursor: index === habits.length - 1 ? 'default' : 'pointer',
                      fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▼</button>
                </div>
              ) : (
                <>
                  {/* Check */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: completed ? col : '#E8EEF5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, color: completed ? 'white' : C.gray,
                    fontWeight: 700, transition: 'all 0.2s',
                  }}>
                    {completed ? '✓' : habit.target > 1 ? done : ''}
                  </div>
                  {/* Edit Button */}
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(habit) }}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: '#E8EEF5', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: C.gray,
                    }}
                  >⋯</button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Habit */}
      {showAdd ? (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#333', marginBottom: 14 }}>Neuen Habit hinzufügen</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              style={{ width: 52, height: 44, textAlign: 'center', fontSize: 22, border: `1.5px solid ${C.border}`, borderRadius: 12, background: '#F4F8FD' }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Name des Habits" autoFocus
              style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 15, background: '#F4F8FD' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {EMOJI_OPTIONS.map(em => (
              <button key={em} onClick={() => setNewEmoji(em)} style={{
                width: 36, height: 36, borderRadius: 10, border: `2px solid ${newEmoji === em ? C.primary : C.border}`,
                background: newEmoji === em ? `${C.primary}15` : C.white, fontSize: 18, cursor: 'pointer',
              }}>{em}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Tagesziel:</span>
            <input type="number" min={1} max={20} value={newTarget}
              onChange={e => setNewTarget(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 64, padding: '8px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 15, textAlign: 'center' }} />
            <span style={{ fontSize: 14, color: C.gray }}>× pro Tag</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 12, background: '#E8EEF5', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: C.gray }}>
              Abbrechen
            </button>
            <button onClick={addHabit} style={{ flex: 2, padding: 12, background: C.primary, border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 700, color: 'white' }}>
              Habit hinzufügen
            </button>
          </div>
        </Card>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          width: '100%', padding: '14px', marginBottom: 8,
          background: `${C.primary}12`, border: `2px dashed ${C.primary}50`,
          borderRadius: 16, color: C.primary, fontSize: 15, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          + Neuen Habit hinzufügen
        </button>
      )}

      {/* Edit Modal */}
      {editingHabit && (
        <div onClick={closeEdit} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430, margin: '0 auto',
            background: C.white, borderRadius: '24px 24px 0 0',
            padding: '20px 20px 36px', animation: 'slideUp 0.3s ease',
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#C5D9EF', margin: '0 auto 20px' }} />

            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 16 }}>Habit bearbeiten</div>

            {/* Name & Emoji */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                style={{ width: 52, height: 44, textAlign: 'center', fontSize: 22, border: `1.5px solid ${C.border}`, borderRadius: 12, background: '#F4F8FD' }} />
              <input value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Name des Habits" autoFocus
                style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 15, background: '#F4F8FD' }} />
            </div>

            {/* Emoji Picker */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {EMOJI_OPTIONS.map(em => (
                <button key={em} onClick={() => setEditEmoji(em)} style={{
                  width: 36, height: 36, borderRadius: 10, border: `2px solid ${editEmoji === em ? C.primary : C.border}`,
                  background: editEmoji === em ? `${C.primary}15` : C.white, fontSize: 18, cursor: 'pointer',
                }}>{em}</button>
              ))}
            </div>

            {/* Target */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Tagesziel:</span>
              <input type="number" min={1} max={20} value={editTarget}
                onChange={e => setEditTarget(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 64, padding: '8px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 15, textAlign: 'center' }} />
              <span style={{ fontSize: 14, color: C.gray }}>× pro Tag</span>
            </div>

            {/* Save */}
            <button onClick={saveEdit} style={{
              width: '100%', padding: 14, background: C.primary, border: 'none',
              borderRadius: 14, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 10,
            }}>
              Änderungen speichern
            </button>

            {/* Delete */}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{
                width: '100%', padding: 12, background: '#FFF0F0', border: `1.5px solid ${C.rose}30`,
                borderRadius: 14, color: C.rose, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                🗑 Habit löschen
              </button>
            ) : (
              <div style={{ background: '#FFF0F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 10, textAlign: 'center' }}>
                  Wirklich löschen? Alle Einträge gehen verloren.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{
                    flex: 1, padding: 10, background: '#E8EEF5', border: 'none',
                    borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', color: C.gray,
                  }}>
                    Abbrechen
                  </button>
                  <button onClick={deleteHabit} style={{
                    flex: 1, padding: 10, background: C.rose, border: 'none',
                    borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'white',
                  }}>
                    Ja, löschen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
