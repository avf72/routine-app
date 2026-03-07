import { useState, useEffect, useCallback } from 'react'
import * as gc from '../lib/googleCalendar'

const C = {
  bg: '#EFF5FC', primary: '#1E6FBF', sage: '#2A9D8F',
  rose: '#D95F5F', white: '#FFFFFF', gray: '#6B7280', border: '#C5D9EF',
}

function getLocalDate(dtStr) {
  const d = new Date(dtStr)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function getLocalTime(dtStr) {
  const d = new Date(dtStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtTime(dtStr) {
  return new Date(dtStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const tod = new Date(); tod.setHours(0, 0, 0, 0)
  const tom = new Date(tod); tom.setDate(tod.getDate() + 1)
  if (+d === +tod) return 'Heute'
  if (+d === +tom) return 'Morgen'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getEventDateStr(ev) {
  if (ev.start?.date) return ev.start.date
  if (ev.start?.dateTime) return getLocalDate(ev.start.dateTime)
  return ''
}

function groupByDate(events) {
  const map = {}
  for (const ev of events) {
    const d = getEventDateStr(ev)
    if (!d) continue
    if (!map[d]) map[d] = []
    map[d].push(ev)
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
}

function sortEvents(evs) {
  return [...evs].sort((a, b) => {
    const ad = a.start?.dateTime || a.start?.date || ''
    const bd = b.start?.dateTime || b.start?.date || ''
    return new Date(ad) - new Date(bd)
  })
}

const EMPTY_FORM = {
  title: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '10:00',
  description: '',
  location: '',
}

export default function TermineSection() {
  const [authed, setAuthed] = useState(gc.isAuthenticated())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [editingEvent, setEditingEvent] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    const evs = await gc.fetchEvents()
    if (evs === null) {
      setAuthed(false)
      setError('Verbindung zu Google Kalender fehlgeschlagen.')
    } else {
      setEvents(evs)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) loadEvents()
  }, [authed, loadEvents])

  async function handleSync() {
    setSyncing(true)
    setError(null)
    const evs = await gc.fetchEvents()
    if (evs === null) {
      setError('Sync fehlgeschlagen.')
    } else {
      setEvents(evs)
    }
    setSyncing(false)
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    const ev = await gc.createEvent({
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      description: form.description,
      location: form.location,
    })
    if (ev) {
      setEvents(prev => sortEvents([...prev, ev]))
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } else {
      setError('Termin konnte nicht erstellt werden.')
    }
    setSaving(false)
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(ev) {
    const isAllDay = !!ev.start?.date && !ev.start?.dateTime
    setEditForm({
      title: ev.summary || '',
      date: getEventDateStr(ev),
      startTime: isAllDay ? '09:00' : getLocalTime(ev.start.dateTime),
      endTime: isAllDay ? '10:00' : getLocalTime(ev.end?.dateTime || ev.start.dateTime),
      description: ev.description || '',
      location: ev.location || '',
    })
    setEditingEvent(ev)
    setConfirmDelete(false)
  }

  function closeEdit() {
    setEditingEvent(null)
    setConfirmDelete(false)
  }

  async function handleSaveEdit() {
    if (!editForm.title.trim() || !editingEvent) return
    setSaving(true)
    setError(null)
    const updated = await gc.updateEvent(editingEvent.id, {
      title: editForm.title.trim(),
      date: editForm.date,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      description: editForm.description,
      location: editForm.location,
    })
    if (updated) {
      setEvents(prev => sortEvents(prev.map(e => e.id === editingEvent.id ? updated : e)))
      closeEdit()
    } else {
      setError('Termin konnte nicht gespeichert werden.')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editingEvent) return
    setSaving(true)
    const ok = await gc.deleteEvent(editingEvent.id)
    if (ok) {
      setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
      closeEdit()
    } else {
      setError('Termin konnte nicht gelöscht werden.')
    }
    setSaving(false)
  }

  // ── Not authenticated ─────────────────────────────────────────────────────

  if (!authed) {
    const dbg = {
      access_token: !!localStorage.getItem('gc_access_token'),
      refresh_token: !!localStorage.getItem('gc_refresh_token'),
      verifier: !!localStorage.getItem('gc_pkce_verifier'),
      url_code: !!new URLSearchParams(window.location.search).get('code'),
    }
    return (
      <div style={{ padding: '40px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📅</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#333', marginBottom: 8 }}>
          Google Kalender verbinden
        </div>
        <div style={{ fontSize: 14, color: C.gray, marginBottom: 28, lineHeight: 1.6 }}>
          Verbinde deinen Google Kalender, um Termine anzuzeigen,
          zu erstellen und zu synchronisieren.
        </div>
        <button
          onClick={() => gc.startAuth()}
          style={{
            padding: '14px 32px', background: C.primary, border: 'none',
            borderRadius: 14, color: 'white', fontWeight: 800, fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Mit Google verbinden
        </button>
        <div style={{ marginTop: 24, fontSize: 11, color: '#aaa', fontFamily: 'monospace', textAlign: 'left', background: '#f5f5f5', borderRadius: 8, padding: 10 }}>
          <div>access_token: {String(dbg.access_token)}</div>
          <div>refresh_token: {String(dbg.refresh_token)}</div>
          <div>pkce_verifier: {String(dbg.verifier)}</div>
          <div>url ?code: {String(dbg.url_code)}</div>
        </div>
      </div>
    )
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0]
  const grouped = groupByDate(events)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {events.length} Termin{events.length !== 1 ? 'e' : ''}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#E8EEF5', color: C.gray,
              border: 'none', cursor: syncing ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 700, opacity: syncing ? 0.6 : 1,
            }}
          >
            {syncing ? '↻ Sync...' : '↻ Sync'}
          </button>
          <button
            onClick={() => { gc.logout(); setAuthed(false); setEvents([]) }}
            style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#FFF0F0', color: C.rose,
              border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
            }}
          >
            Abmelden
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FFF0F0', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.rose, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: C.gray }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Keine Termine gefunden</div>
          <div style={{ fontSize: 13 }}>Füge einen neuen Termin hinzu</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {grouped.map(([date, evs]) => (
            <div key={date}>
              {/* Date header */}
              <div style={{
                fontSize: 13, fontWeight: 800,
                color: date === today ? C.primary : '#555',
                marginBottom: 8, paddingLeft: 2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {date === today ? '📅' : '🗓'} {fmtDateHeader(date)}
                {date === today && (
                  <span style={{ fontSize: 10, background: C.primary, color: 'white', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                    Heute
                  </span>
                )}
              </div>

              {/* Event cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evs.map(ev => {
                  const isAllDay = !!ev.start?.date && !ev.start?.dateTime
                  const startTime = ev.start?.dateTime ? fmtTime(ev.start.dateTime) : null
                  const endTime = ev.end?.dateTime ? fmtTime(ev.end.dateTime) : null
                  return (
                    <div key={ev.id} style={{
                      background: C.white, borderRadius: 14, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                      borderLeft: `3px solid ${C.primary}`,
                      animation: 'fadeIn 0.2s ease',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700, fontSize: 14, color: '#222', marginBottom: 3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {ev.summary || '(Kein Titel)'}
                        </div>
                        <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>
                          {isAllDay
                            ? 'Ganztägig'
                            : startTime && endTime
                              ? `${startTime} – ${endTime}`
                              : startTime || ''}
                        </div>
                        {ev.location && (
                          <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
                            📍 {ev.location}
                          </div>
                        )}
                        {ev.description && (
                          <div style={{
                            fontSize: 11, color: C.gray, marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {ev.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(ev)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: '#E8EEF5', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, color: C.gray,
                        }}
                      >⋯</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)} style={{
          width: '100%', padding: '14px', marginBottom: 8,
          background: `${C.primary}12`, border: `2px dashed ${C.primary}50`,
          borderRadius: 16, color: C.primary, fontSize: 15, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          + Termin hinzufügen
        </button>
      )}

      {/* Add Form */}
      {showAdd && (
        <div style={{ background: C.white, borderRadius: 18, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Neuer Termin</div>

          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titel"
            autoFocus
            style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, marginBottom: 10, background: '#F4F8FD' }}
          />
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Datum</div>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Von</div>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Bis</div>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
          </div>
          <input
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Ort (optional)"
            style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, marginBottom: 10, background: '#F4F8FD' }}
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Beschreibung (optional)"
            rows={2}
            style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, marginBottom: 12, background: '#F4F8FD', resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }}
              style={{ flex: 1, padding: 12, background: '#E8EEF5', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: C.gray }}>
              Abbrechen
            </button>
            <button onClick={handleCreate} disabled={saving || !form.title.trim()}
              style={{ flex: 2, padding: 12, background: saving || !form.title.trim() ? '#ccc' : C.primary, border: 'none', borderRadius: 12, fontSize: 14, cursor: saving ? 'default' : 'pointer', fontWeight: 700, color: 'white' }}>
              {saving ? 'Wird gespeichert...' : 'Termin speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEvent && (
        <div onClick={closeEdit} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430, margin: '0 auto',
            background: C.white, borderRadius: '24px 24px 0 0',
            padding: '20px 20px 36px', animation: 'slideUp 0.3s ease',
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#C5D9EF', margin: '0 auto 20px' }} />
            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 16 }}>Termin bearbeiten</div>

            <input
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titel"
              autoFocus
              style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 15, marginBottom: 12, background: '#F4F8FD' }}
            />
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Datum</div>
              <input type="date" value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Von</div>
                <input type="time" value={editForm.startTime}
                  onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>Bis</div>
                <input type="time" value={editForm.endTime}
                  onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
              </div>
            </div>
            <input
              value={editForm.location}
              onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Ort (optional)"
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, marginBottom: 12, background: '#F4F8FD' }}
            />
            <textarea
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Beschreibung (optional)"
              rows={2}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, marginBottom: 20, background: '#F4F8FD', resize: 'none' }}
            />

            <button onClick={handleSaveEdit} disabled={saving}
              style={{ width: '100%', padding: 14, background: saving ? '#ccc' : C.primary, border: 'none', borderRadius: 14, color: 'white', fontWeight: 800, fontSize: 15, cursor: saving ? 'default' : 'pointer', marginBottom: 10 }}>
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                style={{ width: '100%', padding: 12, background: '#FFF0F0', border: `1.5px solid ${C.rose}30`, borderRadius: 14, color: C.rose, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                🗑 Termin löschen
              </button>
            ) : (
              <div style={{ background: '#FFF0F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 10, textAlign: 'center' }}>
                  Termin auch in Google Kalender löschen?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)}
                    style={{ flex: 1, padding: 10, background: '#E8EEF5', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', color: C.gray }}>
                    Abbrechen
                  </button>
                  <button onClick={handleDelete} disabled={saving}
                    style={{ flex: 1, padding: 10, background: C.rose, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', color: 'white' }}>
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
