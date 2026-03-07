const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CALENDAR_ID = '1gg1v8lqfhls1eeuvsc71hevdo@group.calendar.google.com'
const SCOPE = 'https://www.googleapis.com/auth/calendar'

function getRedirectUri() {
  return import.meta.env.VITE_REDIRECT_URI || window.location.origin
}

// ── PKCE ─────────────────────────────────────────────────────────────────────

function randomString(len) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function pkceChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function isAuthenticated() {
  return !!localStorage.getItem('gc_access_token')
}

export async function startAuth() {
  // Popup synchron öffnen (vor await, sonst blockiert iOS Safari)
  const popup = window.open('', 'gc_oauth', 'width=520,height=650,left=150,top=80')
  if (!popup) {
    alert('Bitte erlaube Popups für diese Seite und versuche es erneut.')
    return
  }

  const verifier = randomString(64)
  const challenge = await pkceChallenge(verifier)
  localStorage.setItem('gc_pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  popup.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function logout() {
  localStorage.removeItem('gc_access_token')
  localStorage.removeItem('gc_refresh_token')
  localStorage.removeItem('gc_token_expiry')
}

// ── OAuth Callback (läuft im Popup) ──────────────────────────────────────────

export async function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  const code = params.get('code')

  if (error) {
    window.history.replaceState({}, '', window.location.pathname)
    return null
  }
  if (!code) return null

  const verifier = localStorage.getItem('gc_pkce_verifier')
  window.history.replaceState({}, '', window.location.pathname)
  if (!verifier) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    })
    const data = await res.json()

    if (data.access_token) {
      localStorage.setItem('gc_access_token', data.access_token)
      localStorage.setItem('gc_token_expiry', String(Date.now() + data.expires_in * 1000))
      if (data.refresh_token) localStorage.setItem('gc_refresh_token', data.refresh_token)
      localStorage.removeItem('gc_pkce_verifier')

      // Im Popup: Hauptfenster benachrichtigen und Popup schliessen
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'gc_auth_done' }, getRedirectUri())
        window.close()
        return null
      }

      return { tab: 'tasks' }
    }
    localStorage.setItem('gc_debug_error', JSON.stringify(data))
  } catch (e) {
    localStorage.setItem('gc_debug_error', e.message)
  }
  return null
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

async function refreshToken() {
  const rt = localStorage.getItem('gc_refresh_token')
  if (!rt) return false
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: rt,
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem('gc_access_token', data.access_token)
      localStorage.setItem('gc_token_expiry', String(Date.now() + data.expires_in * 1000))
      return true
    }
  } catch (e) {
    console.error('Token refresh failed:', e)
  }
  return false
}

async function getValidToken() {
  const expiry = parseInt(localStorage.getItem('gc_token_expiry') || '0')
  if (Date.now() > expiry - 60_000) {
    const ok = await refreshToken()
    if (!ok) { logout(); return null }
  }
  return localStorage.getItem('gc_access_token')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRFC3339(dateStr, timeStr) {
  const d = new Date(`${dateStr}T${timeStr}`)
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const m = String(Math.abs(off) % 60).padStart(2, '0')
  return `${dateStr}T${timeStr}:00${sign}${h}:${m}`
}

// ── Calendar API ──────────────────────────────────────────────────────────────

export async function fetchEvents() {
  const token = await getValidToken()
  if (!token) return null

  const now = new Date()
  const timeMin = new Date(now); timeMin.setDate(now.getDate() - 7)
  const timeMax = new Date(now); timeMax.setDate(now.getDate() + 90)

  const q = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${q}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) { logout(); return null }
    if (!res.ok) return null
    const data = await res.json()
    return data.items || []
  } catch (e) {
    console.error('fetchEvents failed:', e)
    return null
  }
}

export async function createEvent({ title, date, startTime, endTime, description, location }) {
  const token = await getValidToken()
  if (!token) return null

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const body = {
    summary: title,
    start: { dateTime: toRFC3339(date, startTime), timeZone: tz },
    end: { dateTime: toRFC3339(date, endTime), timeZone: tz },
    ...(description && { description }),
    ...(location && { location }),
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    return null
  }
}

export async function updateEvent(eventId, { title, date, startTime, endTime, description, location }) {
  const token = await getValidToken()
  if (!token) return null

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const body = {
    summary: title,
    start: { dateTime: toRFC3339(date, startTime), timeZone: tz },
    end: { dateTime: toRFC3339(date, endTime), timeZone: tz },
    description: description || '',
    location: location || '',
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    return null
  }
}

export async function deleteEvent(eventId) {
  const token = await getValidToken()
  if (!token) return false

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )
    return res.ok || res.status === 204
  } catch (e) {
    return false
  }
}
