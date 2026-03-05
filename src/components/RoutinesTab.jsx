import { useState, useEffect, useCallback } from 'react'
import { supabase, today } from '../lib/supabase'
import { Card } from './ui/Card'
import { SavedBadge } from './ui/SavedBadge'

const C = {
  bg: '#EFF5FC', primary: '#1E6FBF', sage: '#2A9D8F',
  blue: '#4A7FA5', rose: '#D95F5F', amber: '#E07B39',
  white: '#FFFFFF', gray: '#6B7280', border: '#C5D9EF',
}
const TODAY = today()

const TAG_TABS = [
  { id: 'morgen', label: 'Morgen', icon: '🌅' },
  { id: 'nachmittag', label: 'Nachmittag', icon: '☀️' },
  { id: 'abend', label: 'Abend', icon: '🌙' },
  { id: 'letzte', label: 'Letzte', icon: '🕐' },
]

const ROUTINE_TEMPLATES = [
  {
    name: 'Morning Success', emoji: '🌟', time: '06:00', tag: 'morgen',
    steps: [
      { name: 'Sofort aufstehen (kein Snooze)', duration: 1 },
      { name: 'Kalt duschen', duration: 5 },
      { name: 'Meditation', duration: 10 },
      { name: 'Tagebuch & Ziele', duration: 10 },
      { name: 'Sport', duration: 30 },
      { name: 'Gesundes Frühstück', duration: 15 },
      { name: 'Wichtigste Aufgabe starten', duration: 60 },
    ]
  },
  {
    name: 'Clean Girl Morning', emoji: '✨', time: '07:00', tag: 'morgen',
    steps: [
      { name: 'Warmes Wasser mit Zitrone', duration: 5 },
      { name: 'Yoga / Stretching', duration: 20 },
      { name: 'Hautpflege-Routine', duration: 10 },
      { name: 'Gesundes Frühstück zubereiten', duration: 15 },
      { name: 'Tagesplan in Notizbuch', duration: 10 },
    ]
  },
  {
    name: 'Productive Morning', emoji: '🚀', time: '06:30', tag: 'morgen',
    steps: [
      { name: 'E-Mails NICHT checken', duration: 1 },
      { name: 'Tages-Prioritäten setzen', duration: 10 },
      { name: 'MIT (Most Important Task)', duration: 90 },
      { name: 'Kurzpause & Snack', duration: 10 },
      { name: 'Zweite Priorität bearbeiten', duration: 60 },
    ]
  },
  {
    name: 'Wind Down', emoji: '🍃', time: '20:00', tag: 'abend',
    steps: [
      { name: 'Blaulicht-Filter aktivieren', duration: 2 },
      { name: 'Leichtes Abendessen', duration: 20 },
      { name: 'Spaziergang oder Yoga', duration: 20 },
      { name: 'Buch lesen', duration: 30 },
      { name: 'Meditation / Atemübung', duration: 10 },
      { name: 'Schlaf-Routine', duration: 10 },
    ]
  },
  {
    name: 'Evening Review', emoji: '📊', time: '21:00', tag: 'abend',
    steps: [
      { name: 'Tagesreview: Was lief gut?', duration: 5 },
      { name: 'Morgige Aufgaben planen', duration: 10 },
      { name: '3 Dankbarkeiten aufschreiben', duration: 5 },
      { name: 'Lerneinheit (Buch/Kurs)', duration: 30 },
      { name: 'Handy weglegen', duration: 1 },
    ]
  },
  {
    name: 'Deep Work', emoji: '🎯', time: '09:00', tag: 'nachmittag',
    steps: [
      { name: 'Alle Ablenkungen beseitigen', duration: 5 },
      { name: 'Ziel für Session definieren', duration: 5 },
      { name: 'Pomodoro Block 1', duration: 25 },
      { name: 'Pause', duration: 5 },
      { name: 'Pomodoro Block 2', duration: 25 },
      { name: 'Pause', duration: 5 },
      { name: 'Pomodoro Block 3', duration: 25 },
      { name: 'Ergebnisse dokumentieren', duration: 10 },
    ]
  },
  {
    name: 'Student Schedule', emoji: '📖', time: '08:00', tag: 'morgen',
    steps: [
      { name: 'Lernstoff des Vortags wiederholen', duration: 15 },
      { name: 'Neuen Stoff erarbeiten', duration: 45 },
      { name: 'Zusammenfassung erstellen', duration: 15 },
      { name: 'Aufgaben lösen', duration: 30 },
      { name: 'Flashcards aktualisieren', duration: 10 },
    ]
  },
  {
    name: 'Self-Care Sunday', emoji: '🛁', time: '10:00', tag: 'morgen',
    steps: [
      { name: 'Ausschlafen ohne Alarm', duration: 0 },
      { name: 'Langsames Frühstück geniessen', duration: 30 },
      { name: 'Bad / Spa-Routine', duration: 45 },
      { name: 'Spaziergang in der Natur', duration: 40 },
      { name: 'Lieblings-Essen kochen', duration: 30 },
      { name: 'Film / Serie / Buch', duration: 90 },
    ]
  },
  {
    name: 'Digital Detox', emoji: '📵', time: '07:00', tag: 'morgen',
    steps: [
      { name: 'Handy in anderen Raum legen', duration: 1 },
      { name: 'Morgengymnastik', duration: 15 },
      { name: 'Frühstück ohne Screen', duration: 20 },
      { name: 'Offline-Hobby (Lesen/Zeichnen)', duration: 60 },
      { name: 'Natur-Spaziergang', duration: 30 },
    ]
  },
]

const tagColors = { morgen: '#E07B39', nachmittag: '#1E6FBF', abend: '#7B5EA7' }

export default function RoutinesTab() {
  const [routines, setRoutines] = useState([])
  const [steps, setSteps] = useState([])
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState('morgen')
  const [expandedId, setExpandedId] = useState(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🔄')
  const [newTime, setNewTime] = useState('07:00')
  const [newTag, setNewTag] = useState('morgen')

  // Edit state
  const [editingRoutine, setEditingRoutine] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editTag, setEditTag] = useState('morgen')
  const [editSteps, setEditSteps] = useState([])
  const [deletedStepIds, setDeletedStepIds] = useState([])
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, sRes, lRes] = await Promise.all([
        supabase.from('routines').select('*').order('created_at', { ascending: true }),
        supabase.from('routine_steps').select('*').order('position', { ascending: true }),
        supabase.from('routine_logs').select('*').eq('datum', TODAY),
      ])
      setRoutines(rRes.data || [])
      setSteps(sRes.data || [])
      const lmap = {}
      for (const l of lRes.data || []) lmap[l.step_id] = { done: l.done, id: l.id }
      setLogs(lmap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function toggleStep(stepId) {
    const log = logs[stepId]
    if (log) {
      const next = !log.done
      const { error } = await supabase.from('routine_logs').update({ done: next }).eq('id', log.id)
      if (!error) { setLogs(l => ({ ...l, [stepId]: { ...l[stepId], done: next } })); flashSaved() }
    } else {
      const { data, error } = await supabase
        .from('routine_logs').insert({ step_id: stepId, datum: TODAY, done: true }).select().single()
      if (!error && data) { setLogs(l => ({ ...l, [stepId]: { done: true, id: data.id } })); flashSaved() }
    }
  }

  async function addFromTemplate(tmpl) {
    const { steps: tmplSteps, ...routineData } = tmpl
    const { data: nr, error } = await supabase.from('routines').insert(routineData).select().single()
    if (error) return
    if (tmplSteps) {
      const sd = tmplSteps.map((s, i) => ({ ...s, routine_id: nr.id, position: i + 1 }))
      const { data: ns } = await supabase.from('routine_steps').insert(sd).select()
      setSteps(prev => [...prev, ...(ns || [])])
    }
    setRoutines(prev => [...prev, nr])
    setShowTemplate(false)
    flashSaved()
  }

  async function addRoutine() {
    if (!newName.trim()) return
    const { data, error } = await supabase
      .from('routines').insert({ name: newName.trim(), emoji: newEmoji, time: newTime, tag: newTag }).select().single()
    if (!error && data) {
      setRoutines(prev => [...prev, data])
      setNewName(''); setShowAdd(false)
      flashSaved()
    }
  }

  // ── Edit Routine ──────────────────────────────────────────

  function openEdit(routine) {
    const rs = steps
      .filter(s => s.routine_id === routine.id)
      .sort((a, b) => a.position - b.position)
      .map(s => ({ ...s })) // local copy
    setEditingRoutine(routine)
    setEditName(routine.name)
    setEditEmoji(routine.emoji)
    setEditTime(routine.time)
    setEditTag(routine.tag)
    setEditSteps(rs)
    setDeletedStepIds([])
    setConfirmDeleteRoutine(false)
  }

  function closeEdit() {
    setEditingRoutine(null)
    setConfirmDeleteRoutine(false)
  }

  function moveStep(index, dir) {
    const next = [...editSteps]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setEditSteps(next)
  }

  function removeEditStep(index) {
    const step = editSteps[index]
    if (step.id) setDeletedStepIds(d => [...d, step.id])
    setEditSteps(prev => prev.filter((_, i) => i !== index))
  }

  function addEditStep() {
    setEditSteps(prev => [...prev, { id: null, name: '', duration: 10, position: prev.length + 1 }])
  }

  function updateEditStep(index, field, value) {
    setEditSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  async function saveRoutine() {
    if (!editName.trim() || !editingRoutine) return
    setSaving(true)
    try {
      // 1. Update routine metadata
      await supabase.from('routines')
        .update({ name: editName.trim(), emoji: editEmoji, time: editTime, tag: editTag })
        .eq('id', editingRoutine.id)

      // 2. Delete removed steps
      for (const sid of deletedStepIds) {
        await supabase.from('routine_steps').delete().eq('id', sid)
      }

      // 3. Upsert remaining steps with new positions
      const updatedSteps = []
      for (let i = 0; i < editSteps.length; i++) {
        const s = editSteps[i]
        if (!s.name.trim()) continue
        const pos = i + 1
        if (s.id) {
          await supabase.from('routine_steps')
            .update({ name: s.name.trim(), duration: s.duration || 0, position: pos })
            .eq('id', s.id)
          updatedSteps.push({ ...s, position: pos })
        } else {
          const { data: ns } = await supabase.from('routine_steps')
            .insert({ routine_id: editingRoutine.id, name: s.name.trim(), duration: s.duration || 0, position: pos })
            .select().single()
          if (ns) updatedSteps.push(ns)
        }
      }

      // 4. Update local state
      setRoutines(prev => prev.map(r =>
        r.id === editingRoutine.id
          ? { ...r, name: editName.trim(), emoji: editEmoji, time: editTime, tag: editTag }
          : r
      ))
      setSteps(prev => [
        ...prev.filter(s => s.routine_id !== editingRoutine.id),
        ...updatedSteps,
      ])

      closeEdit()
      flashSaved()
    } finally {
      setSaving(false)
    }
  }

  async function deleteRoutine() {
    if (!editingRoutine) return
    await supabase.from('routines').delete().eq('id', editingRoutine.id)
    setRoutines(prev => prev.filter(r => r.id !== editingRoutine.id))
    setSteps(prev => prev.filter(s => s.routine_id !== editingRoutine.id))
    closeEdit()
    flashSaved()
  }

  // ─────────────────────────────────────────────────────────

  function flashSaved() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  function getRoutineSteps(routineId) {
    return steps.filter(s => s.routine_id === routineId).sort((a, b) => a.position - b.position)
  }
  function getRoutineProgress(routineId) {
    const rs = getRoutineSteps(routineId)
    if (!rs.length) return 0
    return (rs.filter(s => logs[s.id]?.done).length / rs.length) * 100
  }
  function getRoutineDuration(routineId) {
    return getRoutineSteps(routineId).reduce((sum, s) => sum + (s.duration || 0), 0)
  }

  let displayRoutines = activeTag === 'letzte'
    ? [...routines].slice(-5).reverse()
    : routines.filter(r => r.tag === activeTag)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SavedBadge visible={showSaved} />

      {/* Tag Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {TAG_TABS.map(tab => {
          const active = activeTag === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTag(tab.id)} style={{
              flex: 1, minWidth: 68, padding: '8px 10px',
              background: active ? C.primary : C.white,
              color: active ? 'white' : C.gray,
              border: `1.5px solid ${active ? C.primary : C.border}`,
              borderRadius: 12, cursor: 'pointer',
              fontSize: 12, fontWeight: active ? 800 : 600,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Routine Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {displayRoutines.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.gray }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Keine Routinen vorhanden</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Füge eine Vorlage oder eigene Routine hinzu</div>
          </div>
        )}
        {displayRoutines.map(routine => {
          const rs = getRoutineSteps(routine.id)
          const pct = getRoutineProgress(routine.id)
          const duration = getRoutineDuration(routine.id)
          const expanded = expandedId === routine.id
          const tagColor = tagColors[routine.tag] || C.primary
          const doneSteps = rs.filter(s => logs[s.id]?.done).length

          return (
            <div key={routine.id} style={{
              background: C.white, borderRadius: 18,
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              overflow: 'hidden', animation: 'fadeIn 0.3s ease',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  onClick={() => setExpandedId(expanded ? null : routine.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: `${tagColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}>
                    {routine.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {routine.name}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: `${tagColor}18`, color: tagColor, borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Täglich
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.gray, marginBottom: 6 }}>
                      <span>⏰ {routine.time}</span>
                      <span>•</span>
                      <span>{duration} Min.</span>
                      <span>•</span>
                      <span>{doneSteps}/{rs.length} Schritte</span>
                    </div>
                    <div style={{ height: 5, background: '#E8EEF5', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? C.sage : tagColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: C.gray, flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={e => { e.stopPropagation(); openEdit(routine) }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: '#E8EEF5', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: C.gray,
                  }}
                >⋯</button>
              </div>

              {/* Steps */}
              {expanded && (
                <div style={{ borderTop: `1px solid #F3F0EB`, padding: '8px 0 12px' }}>
                  {rs.map(step => {
                    const done = logs[step.id]?.done || false
                    return (
                      <div key={step.id} onClick={() => toggleStep(step.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px', cursor: 'pointer',
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${done ? tagColor : C.border}`,
                          background: done ? tagColor : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: 'white', fontWeight: 700, transition: 'all 0.2s',
                        }}>
                          {done ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            fontSize: 14, fontWeight: 600,
                            color: done ? C.gray : '#333',
                            textDecoration: done ? 'line-through' : 'none',
                            opacity: done ? 0.6 : 1, transition: 'all 0.2s',
                          }}>
                            {step.name}
                          </span>
                        </div>
                        {step.duration > 0 && (
                          <span style={{ fontSize: 12, color: C.gray, flexShrink: 0 }}>{step.duration} Min</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setShowTemplate(true)} style={{
          flex: 1, padding: '13px', background: `${C.primary}12`,
          border: `2px dashed ${C.primary}50`, borderRadius: 14,
          color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>📋 Vorlage wählen</button>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          flex: 1, padding: '13px', background: `${C.primary}12`,
          border: `2px dashed ${C.primary}50`, borderRadius: 14,
          color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>+ Eigene Routine</button>
      </div>

      {/* Add Custom Routine */}
      {showAdd && (
        <Card style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Neue Routine</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              style={{ width: 52, height: 44, textAlign: 'center', fontSize: 22, border: `1.5px solid ${C.border}`, borderRadius: 12, background: '#F4F8FD' }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Name der Routine" autoFocus
              style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, background: '#F4F8FD' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Uhrzeit</div>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Tageszeit</div>
              <select value={newTag} onChange={e => setNewTag(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, background: C.white }}>
                <option value="morgen">Morgen</option>
                <option value="nachmittag">Nachmittag</option>
                <option value="abend">Abend</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 11, background: '#E8EEF5', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: C.gray }}>
              Abbrechen
            </button>
            <button onClick={addRoutine} style={{ flex: 2, padding: 11, background: C.primary, border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 700, color: 'white' }}>
              Hinzufügen
            </button>
          </div>
        </Card>
      )}

      {/* Template Modal */}
      {showTemplate && (
        <div onClick={() => setShowTemplate(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430, margin: '0 auto',
            background: C.white, borderRadius: '24px 24px 0 0',
            padding: '20px 16px 32px', animation: 'slideUp 0.3s ease',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 17 }}>Routine-Vorlagen</div>
              <button onClick={() => setShowTemplate(false)} style={{ background: '#E8EEF5', border: 'none', borderRadius: 20, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROUTINE_TEMPLATES.map(t => {
                const tc = tagColors[t.tag] || C.primary
                const dur = t.steps.reduce((sum, s) => sum + s.duration, 0)
                return (
                  <div key={t.name} onClick={() => addFromTemplate(t)} style={{
                    background: '#F0F5FB', borderRadius: 14, padding: 14,
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${tc}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {t.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: C.gray }}>⏰ {t.time} • {dur} Min. • {t.steps.length} Schritte</div>
                    </div>
                    <div style={{ fontSize: 18, color: C.primary }}>+</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Routine Modal ── */}
      {editingRoutine && (
        <div onClick={closeEdit} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430, margin: '0 auto',
            background: C.white, borderRadius: '24px 24px 0 0',
            padding: '20px 20px 36px', animation: 'slideUp 0.3s ease',
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#C5D9EF', margin: '0 auto 20px' }} />
            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 16 }}>Routine bearbeiten</div>

            {/* Name & Emoji */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                style={{ width: 52, height: 44, textAlign: 'center', fontSize: 22, border: `1.5px solid ${C.border}`, borderRadius: 12, background: '#F4F8FD' }} />
              <input value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Name" autoFocus
                style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 15, background: '#F4F8FD' }} />
            </div>

            {/* Time & Tag */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Uhrzeit</div>
                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Tageszeit</div>
                <select value={editTag} onChange={e => setEditTag(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, background: C.white }}>
                  <option value="morgen">Morgen</option>
                  <option value="nachmittag">Nachmittag</option>
                  <option value="abend">Abend</option>
                </select>
              </div>
            </div>

            {/* Steps */}
            <div style={{ fontSize: 13, fontWeight: 800, color: '#444', marginBottom: 10 }}>
              Schritte ({editSteps.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {editSteps.map((step, i) => (
                <div key={i} style={{
                  background: '#F0F5FB', borderRadius: 12, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {/* Up/Down */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                      style={{ width: 22, height: 22, border: 'none', borderRadius: 6, background: i === 0 ? '#EEE' : '#C5D9EF', cursor: i === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 800, color: i === 0 ? '#BBB' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ▲
                    </button>
                    <button onClick={() => moveStep(i, 1)} disabled={i === editSteps.length - 1}
                      style={{ width: 22, height: 22, border: 'none', borderRadius: 6, background: i === editSteps.length - 1 ? '#EEE' : '#C5D9EF', cursor: i === editSteps.length - 1 ? 'default' : 'pointer', fontSize: 11, fontWeight: 800, color: i === editSteps.length - 1 ? '#BBB' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ▼
                    </button>
                  </div>

                  {/* Step Name */}
                  <input
                    value={step.name}
                    onChange={e => updateEditStep(i, 'name', e.target.value)}
                    placeholder="Schritt-Name"
                    style={{ flex: 1, padding: '7px 10px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, background: C.white, minWidth: 0 }}
                  />

                  {/* Duration */}
                  <input
                    type="number" min={0} value={step.duration}
                    onChange={e => updateEditStep(i, 'duration', parseInt(e.target.value) || 0)}
                    style={{ width: 48, padding: '7px 6px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 12, textAlign: 'center', background: C.white, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 11, color: C.gray, flexShrink: 0 }}>Min</span>

                  {/* Delete Step */}
                  <button onClick={() => removeEditStep(i)}
                    style={{ width: 28, height: 28, border: 'none', borderRadius: '50%', background: '#FFE8E8', cursor: 'pointer', fontSize: 14, color: C.rose, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add Step */}
            <button onClick={addEditStep} style={{
              width: '100%', padding: '10px', marginBottom: 20,
              background: `${C.primary}10`, border: `2px dashed ${C.primary}40`,
              borderRadius: 12, color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              + Schritt hinzufügen
            </button>

            {/* Save */}
            <button onClick={saveRoutine} disabled={saving} style={{
              width: '100%', padding: 14, background: saving ? '#ccc' : C.primary, border: 'none',
              borderRadius: 14, color: 'white', fontWeight: 800, fontSize: 15, cursor: saving ? 'default' : 'pointer', marginBottom: 10,
            }}>
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>

            {/* Delete Routine */}
            {!confirmDeleteRoutine ? (
              <button onClick={() => setConfirmDeleteRoutine(true)} style={{
                width: '100%', padding: 12, background: '#FFF0F0', border: `1.5px solid ${C.rose}30`,
                borderRadius: 14, color: C.rose, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                🗑 Routine löschen
              </button>
            ) : (
              <div style={{ background: '#FFF0F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 10, textAlign: 'center' }}>
                  Routine wirklich löschen? Alle Schritte gehen verloren.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDeleteRoutine(false)} style={{
                    flex: 1, padding: 10, background: '#E8EEF5', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', color: C.gray,
                  }}>Abbrechen</button>
                  <button onClick={deleteRoutine} style={{
                    flex: 1, padding: 10, background: C.rose, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'white',
                  }}>Ja, löschen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
