import { useState, useEffect } from 'react'
import { supabase, today, yesterday } from './lib/supabase'
import HabitsTab from './components/HabitsTab'
import RoutinesTab from './components/RoutinesTab'
import TechnikTab from './components/TechnikTab'
import TasksTab from './components/TasksTab'

const TABS = [
  { id: 'routines', icon: '🔄', label: 'Routinen' },
  { id: 'habits', icon: '🏆', label: 'Trainingswoche' },
  { id: 'technik', icon: '⚙️', label: 'Technik' },
  { id: 'tasks', icon: '✅', label: 'Aufgaben' },
]

const SEED_HABITS = [
  { name: 'Meditieren', emoji: '🧘', target: 1, streak: 0, color: '#1E6FBF' },
  { name: 'Sport & Bewegung', emoji: '🏃', target: 1, streak: 0, color: '#5A8A6A' },
  { name: 'Wasser trinken', emoji: '💧', target: 8, streak: 0, color: '#4A86B0' },
  { name: 'Lesen', emoji: '📚', target: 1, streak: 0, color: '#D95F5F' },
  { name: 'Dankbarkeit', emoji: '🙏', target: 1, streak: 0, color: '#C9923A' },
]

const SEED_ROUTINES = [
  {
    name: 'Morgen-Magie', emoji: '🌅', time: '06:30', tag: 'morgen',
    steps: [
      { name: 'Aufwachen & strecken', duration: 5, position: 1 },
      { name: 'Warmes Wasser trinken', duration: 2, position: 2 },
      { name: 'Meditation', duration: 10, position: 3 },
      { name: 'Tagebuch schreiben', duration: 10, position: 4 },
      { name: 'Sport / Bewegung', duration: 20, position: 5 },
      { name: 'Duschen & pflegen', duration: 15, position: 6 },
      { name: 'Gesundes Frühstück', duration: 15, position: 7 },
      { name: 'Tagesplan machen', duration: 5, position: 8 },
    ]
  },
  {
    name: 'Deep-Work Block', emoji: '💻', time: '09:00', tag: 'nachmittag',
    steps: [
      { name: 'Handy auf lautlos', duration: 2, position: 1 },
      { name: 'Prioritäten festlegen', duration: 5, position: 2 },
      { name: 'Tiefe Arbeit – Block 1', duration: 50, position: 3 },
      { name: 'Kurze Pause', duration: 10, position: 4 },
      { name: 'Tiefe Arbeit – Block 2', duration: 50, position: 5 },
      { name: 'Fortschritt reflektieren', duration: 10, position: 6 },
    ]
  },
  {
    name: 'Abend-Ritual', emoji: '🌙', time: '21:00', tag: 'abend',
    steps: [
      { name: 'Bildschirme abschalten', duration: 5, position: 1 },
      { name: 'Leichtes Dehnen', duration: 10, position: 2 },
      { name: 'Tagebuch & Dankbarkeit', duration: 10, position: 3 },
      { name: 'Buch lesen', duration: 20, position: 4 },
      { name: 'Schlafvorbereitung', duration: 10, position: 5 },
    ]
  },
]

const SEED_CHALLENGES = [
  {
    name: 'Self-Confidence', emoji: '💪', color: '#E8832A',
    description: 'Baue in 30 Tagen unerschütterliches Selbstvertrauen auf. Tägliche Übungen stärken dein Selbstbild und helfen dir, dein volles Potenzial zu entfalten.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Gratitude Journal', emoji: '📔', color: '#5A8A6A',
    description: 'Kultiviere täglich Dankbarkeit und verändere deinen Blick auf das Leben. In 30 Tagen wirst du mehr Freude und Zufriedenheit im Alltag erleben.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Creativity Boost', emoji: '🎨', color: '#9B59B6',
    description: 'Entfalte dein kreatives Potenzial in 30 Tagen. Tägliche kreative Impulse helfen dir, neue Ideen zu entwickeln und deinen Geist zu öffnen.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Self-Care', emoji: '💆', color: '#D95F5F',
    description: '30 Tage der Selbstliebe und Fürsorge. Lerne, auf deine eigenen Bedürfnisse zu hören und dich selbst mit der gleichen Fürsorge zu behandeln wie andere.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Digital Detox', emoji: '📵', color: '#4A86B0',
    description: 'Gewinne deine Zeit zurück und reduziere die Bildschirmzeit bewusst. 30 Tage für ein bewussteres, ruhigeres und erfüllteres Leben ohne digitale Ablenkung.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Happiness Boost', emoji: '😊', color: '#F39C12',
    description: '30 Tage zu einem glücklicheren Leben. Mit wissenschaftlich fundierten Übungen und Ritualen wirst du dein Wohlbefinden nachhaltig steigern.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Fitness Journey', emoji: '🏋️', color: '#27AE60',
    description: 'Starte deine persönliche Fitness-Reise. 30 Tage progressive Bewegung bauen gesunde Sport-Gewohnheiten auf – unabhängig von deinem aktuellen Fitnesslevel.',
    current_day: 0, started_at: null,
  },
  {
    name: 'Mindfulness', emoji: '🧘', color: '#8E44AD',
    description: 'Kultiviere innere Ruhe und Achtsamkeit in 30 Tagen. Tägliche Übungen helfen dir, im Moment zu leben und Stress nachhaltig zu reduzieren.',
    current_day: 0, started_at: null,
  },
]

let _seeding = false
async function seedIfEmpty() {
  if (_seeding) return
  _seeding = true
  // Seed Habits
  const { data: existingHabits } = await supabase.from('habits').select('id').limit(1)
  if (!existingHabits || existingHabits.length === 0) {
    const { data: newHabits } = await supabase.from('habits').insert(SEED_HABITS).select()
    if (newHabits) {
      const logs = newHabits.map(h => ({ habit_id: h.id, datum: today(), done: 0 }))
      await supabase.from('habit_logs').insert(logs)
    }
  }

  // Seed Routines
  const { data: existingRoutines } = await supabase.from('routines').select('id').limit(1)
  if (!existingRoutines || existingRoutines.length === 0) {
    for (const r of SEED_ROUTINES) {
      const { steps, ...routineData } = r
      const { data: newRoutine } = await supabase.from('routines').insert(routineData).select().single()
      if (newRoutine && steps) {
        const stepsData = steps.map(s => ({ ...s, routine_id: newRoutine.id }))
        await supabase.from('routine_steps').insert(stepsData)
      }
    }
  }

  // Seed Challenges
  const { data: existingChallenges } = await supabase.from('challenges').select('id').limit(1)
  if (!existingChallenges || existingChallenges.length === 0) {
    await supabase.from('challenges').insert(SEED_CHALLENGES)
  }
}

async function autoRolloverTasks() {
  const yd = yesterday()
  await supabase
    .from('tasks')
    .update({ due: today() })
    .eq('due', yd)
    .eq('done', false)
}

export default function App() {
  const [activeTab, setActiveTab] = useState('routines')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function init() {
      try {
        await seedIfEmpty()
        await autoRolloverTasks()
      } catch (err) {
        console.error('Init error:', err)
        setError('Verbindung zu Supabase fehlgeschlagen. Bitte überprüfe die Zugangsdaten.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  if (loading) {
    return (
      <div style={{
        maxWidth: 430, margin: '0 auto', minHeight: '100vh',
        background: '#EFF5FC', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>⭐</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#1E6FBF' }}>Routine App</div>
        <div style={{
          width: 44, height: 44,
          border: '4px solid #C5D9EF',
          borderTop: '4px solid #1E6FBF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: 14, color: '#9CA3AF' }}>Lade deine Daten...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        maxWidth: 430, margin: '0 auto', minHeight: '100vh',
        background: '#EFF5FC', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#D95F5F', textAlign: 'center' }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '12px 24px', background: '#1E6FBF', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#EFF5FC', position: 'relative' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(239,245,252,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #C5D9EF',
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>⭐</span>
          <span style={{ fontSize: 19, fontWeight: 900, color: '#1E6FBF', letterSpacing: '-0.3px' }}>Routine App</span>
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{dateStr}</div>
      </div>

      {/* Tab Content */}
      <div style={{ paddingBottom: 80 }}>
        {activeTab === 'routines' && <RoutinesTab />}
        {activeTab === 'habits' && <HabitsTab />}
        {activeTab === 'technik' && <TechnikTab />}
        {activeTab === 'tasks' && <TasksTab />}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #C5D9EF',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 4px)',
        zIndex: 200,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '10px 4px 10px', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3,
                color: active ? '#1E6FBF' : '#9CA3AF',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 500, letterSpacing: '0.2px' }}>
                {tab.label}
              </span>
              {active && (
                <div style={{ width: 20, height: 3, borderRadius: 2, background: '#1E6FBF', marginTop: 1 }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
