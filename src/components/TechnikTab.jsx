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



export default function TechnikTab() {
  const [routines, setRoutines] = useState([])
  const [steps, setSteps] = useState([])
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🔄')

  const [sortMode, setSortMode] = useState(false)

  // Edit state
  const [editingRoutine, setEditingRoutine] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editSteps, setEditSteps] = useState([])
  const [deletedStepIds, setDeletedStepIds] = useState([])
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, sRes, lRes] = await Promise.all([
        supabase.from('technik_routines').select('*').order('created_at', { ascending: true }),
        supabase.from('technik_steps').select('*').order('position', { ascending: true }),
        supabase.from('technik_logs').select('*').eq('datum', TODAY),
      ])
      const loaded = rRes.data || []
      loaded.sort((a, b) => {
        if (a.position != null && b.position != null) return a.position - b.position
        if (a.position != null) return -1
        if (b.position != null) return 1
        return 0
      })
      setRoutines(loaded)
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
      const { error } = await supabase.from('technik_logs').update({ done: next }).eq('id', log.id)
      if (!error) { setLogs(l => ({ ...l, [stepId]: { ...l[stepId], done: next } })); flashSaved() }
    } else {
      const { data, error } = await supabase
        .from('technik_logs').insert({ step_id: stepId, datum: TODAY, done: true }).select().single()
      if (!error && data) { setLogs(l => ({ ...l, [stepId]: { done: true, id: data.id } })); flashSaved() }
    }
  }


  async function addRoutine() {
    if (!newName.trim()) return
    const pos = routines.length + 1
    const { data, error } = await supabase
      .from('technik_routines').insert({ name: newName.trim(), emoji: newEmoji, position: pos }).select().single()
    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from('technik_routines').insert({ name: newName.trim(), emoji: newEmoji }).select().single()
      if (e2) { console.error('Routine hinzufügen fehlgeschlagen:', e2); return }
      setRoutines(prev => [...prev, d2])
    } else {
      setRoutines(prev => [...prev, { ...data, position: pos }])
    }
    setNewName(''); setShowAdd(false)
    flashSaved()
  }

  function moveRoutine(index, dir) {
    const next = [...routines]
    const targetIdx = index + dir
    if (targetIdx < 0 || targetIdx >= next.length) return
    ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]
    setRoutines(next)
    next.forEach((r, i) => supabase.from('technik_routines').update({ position: i + 1 }).eq('id', r.id))
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
      await supabase.from('technik_routines')
        .update({ name: editName.trim(), emoji: editEmoji })
        .eq('id', editingRoutine.id)

      // 2. Delete removed steps
      for (const sid of deletedStepIds) {
        await supabase.from('technik_steps').delete().eq('id', sid)
      }

      // 3. Upsert remaining steps with new positions
      const updatedSteps = []
      for (let i = 0; i < editSteps.length; i++) {
        const s = editSteps[i]
        if (!s.name.trim()) continue
        const pos = i + 1
        if (s.id) {
          await supabase.from('technik_steps')
            .update({ name: s.name.trim(), duration: s.duration || 0, position: pos })
            .eq('id', s.id)
          updatedSteps.push({ ...s, position: pos })
        } else {
          const { data: ns } = await supabase.from('technik_steps')
            .insert({ routine_id: editingRoutine.id, name: s.name.trim(), duration: s.duration || 0, position: pos })
            .select().single()
          if (ns) updatedSteps.push(ns)
        }
      }

      // 4. Update local state
      setRoutines(prev => prev.map(r =>
        r.id === editingRoutine.id
          ? { ...r, name: editName.trim(), emoji: editEmoji }
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
    await supabase.from('technik_routines').delete().eq('id', editingRoutine.id)
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



  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SavedBadge visible={showSaved} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {routines.length} Routine{routines.length !== 1 ? 'en' : ''}
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

      {/* Routine Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {routines.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.gray }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Keine Techniken vorhanden</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Füge eine Vorlage oder eigene Technik hinzu</div>
          </div>
        )}
        {routines.map((routine, index) => {
          const rs = getRoutineSteps(routine.id)
          const pct = getRoutineProgress(routine.id)
          const duration = getRoutineDuration(routine.id)
          const expanded = expandedId === routine.id
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
                  onClick={() => !sortMode && setExpandedId(expanded ? null : routine.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: sortMode ? 'default' : 'pointer', minWidth: 0 }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: `${C.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}>
                    {routine.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {routine.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.gray, marginBottom: rs.length > 0 ? 6 : 0 }}>
                      {duration > 0 && <span>{duration} Min.</span>}
                      {duration > 0 && rs.length > 0 && <span>•</span>}
                      {rs.length > 0 && <span>{doneSteps}/{rs.length} Schritte</span>}
                    </div>
                    {rs.length > 0 && (
                      <div style={{ height: 5, background: '#E8EEF5', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? C.sage : C.primary, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    )}
                  </div>
                  {!sortMode && <div style={{ fontSize: 16, color: C.gray, flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</div>}
                </div>

                {sortMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                    <button
                      onClick={() => moveRoutine(index, -1)}
                      disabled={index === 0}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: 'none',
                        background: index === 0 ? '#E8EEF5' : C.primary + '20',
                        color: index === 0 ? '#CCC' : C.primary,
                        cursor: index === 0 ? 'default' : 'pointer',
                        fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{String.fromCharCode(9650)}</button>
                    <button
                      onClick={() => moveRoutine(index, 1)}
                      disabled={index === routines.length - 1}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: 'none',
                        background: index === routines.length - 1 ? '#E8EEF5' : C.primary + '20',
                        color: index === routines.length - 1 ? '#CCC' : C.primary,
                        cursor: index === routines.length - 1 ? 'default' : 'pointer',
                        fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{String.fromCharCode(9660)}</button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(routine) }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: '#E8EEF5', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: C.gray,
                    }}
                  >{String.fromCharCode(8943)}</button>
                )}
              </div>

              {/* Steps */}
              {expanded && !sortMode && (
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
                          border: `2px solid ${done ? C.primary : C.border}`,
                          background: done ? C.primary : 'transparent',
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

        <button onClick={() => setShowAdd(!showAdd)} style={{
          flex: 1, padding: '13px', background: `${C.primary}12`,
          border: `2px dashed ${C.primary}50`, borderRadius: 14,
          color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>+ Eigene Technik</button>
      </div>

      {/* Add Custom Routine */}
      {showAdd && (
        <Card style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Neue Technik</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              style={{ width: 52, height: 44, textAlign: 'center', fontSize: 22, border: `1.5px solid ${C.border}`, borderRadius: 12, background: '#F4F8FD' }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Name der Technik" autoFocus
              style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, background: '#F4F8FD' }} />
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
            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 16 }}>Technik bearbeiten</div>

            {/* Name & Emoji */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                style={{ width: 52, height: 44, textAlign: 'center', fontSize: 22, border: `1.5px solid ${C.border}`, borderRadius: 12, background: '#F4F8FD' }} />
              <input value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Name" autoFocus
                style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 15, background: '#F4F8FD' }} />
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
                🗑 Technik löschen
              </button>
            ) : (
              <div style={{ background: '#FFF0F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 10, textAlign: 'center' }}>
                  Technik wirklich löschen? Alle Schritte gehen verloren.
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
