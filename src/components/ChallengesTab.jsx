import { useState, useEffect, useCallback } from 'react'
import { supabase, today } from '../lib/supabase'
import { SavedBadge } from './ui/SavedBadge'

const C = {
  bg: '#FDF6EE', primary: '#E8832A', sage: '#5A8A6A',
  blue: '#4A86B0', rose: '#D95F5F', amber: '#C9923A',
  white: '#FFFFFF', gray: '#6B7280', border: '#E8D5C0',
}
const TODAY = today()

const CHALLENGE_TASKS = {
  'Self-Confidence': [
    'Schreibe 3 Dinge auf, die du an dir liebst und schätzt',
    'Tue heute etwas, das dich aus deiner Komfortzone bringt',
    'Stehe vor dem Spiegel und sprich 5 Affirmationen laut aus',
    'Führe ein Gespräch mit jemandem, den du kaum kennst',
    'Teile eine Idee oder Meinung in einer Gruppe',
    'Tue etwas, das du schon lange aufgeschoben hast',
    'Kleide dich heute so, wie du dich am wohlsten fühlst',
    'Lehne eine Anfrage ab, die dir nicht gut tut',
    'Erzähle jemandem von einem deiner Erfolge',
    'Übe 20 Minuten lang eine neue Fähigkeit',
    'Schreibe auf, was du in den letzten 6 Monaten erreicht hast',
    'Gehe alleine in ein Café oder Restaurant',
    'Sprich laut mit dir selbst – sei dein eigener bester Freund',
    'Mache ein Selfie und finde 3 Dinge, die dir daran gefallen',
    'Sage "Nein" zu etwas, das dir Energie raubt',
    'Trage etwas, das du normalerweise nicht trägst',
    'Bitte jemanden um Hilfe, ohne dich zu schämen',
    'Präsentiere eine Idee – auch wenn du nervös bist',
    'Führe ein schwieriges Gespräch, das du aufgeschoben hast',
    'Schreibe 10 Dinge auf, die dich einzigartig machen',
    'Feiere einen kleinen Erfolg bewusst mit dir selbst',
    'Mache etwas nur für dich – ohne Erlaubnis zu brauchen',
    'Kontaktiere jemanden, zu dem du den Kontakt verloren hast',
    'Setze dir ein mutiges Ziel für den nächsten Monat',
    'Tue etwas Gutes für eine unbekannte Person',
    'Steh zu einer Entscheidung, die andere infrage stellen',
    'Übe bewussten Augenkontakt bei Gesprächen',
    'Schreibe deine Stärken auf und hänge sie auf',
    'Erlaube dir, Fehler zu machen und daraus zu lernen',
    'Reflektiere: Wie hat sich dein Selbstvertrauen verändert?',
  ],
  'Gratitude Journal': [
    'Schreibe 3 Dinge auf, für die du heute dankbar bist',
    'Danke jemandem persönlich für etwas Kleines',
    'Beschreibe einen Moment, der dir heute Freude gemacht hat',
    'Welche Körperfunktion schätzt du? Schreibe darüber',
    'Schreibe über eine Person, die dein Leben bereichert',
    'Beschreibe ein Erlebnis, das dich positiv geprägt hat',
    'Was nimmst du täglich für selbstverständlich? Schreibe es auf',
    'Schreibe einen Dankesbrief an dein jüngeres Ich',
    'Welche Herausforderung hat dich stärker gemacht?',
    'Schreibe über 3 einfache Freuden des heutigen Tages',
    'Was in der Natur erfüllt dich mit Dankbarkeit?',
    'Welche Fähigkeit hast du, für die du dankbar sein kannst?',
    'Schreibe über ein Buch oder einen Film, der dich bewegt hat',
    'Für welche Möglichkeiten in deinem Leben bist du dankbar?',
    'Schreibe über eine schwierige Zeit, aus der du gewachsen bist',
    'Welcher Mensch hat dir heute geholfen, auch indirekt?',
    'Was an deinem Zuhause macht dich dankbar?',
    'Schreibe 5 Dinge, die dir heute gut gelungen sind',
    'Für welche Technologie in deinem Leben bist du dankbar?',
    'Beschreibe eine Freundschaft, die dein Leben bereichert',
    'Was an deiner Arbeit oder deinem Alltag schätzt du?',
    'Schreibe über einen Traum, den du noch verwirklichen kannst',
    'Welche kleinen Rituale machen deinen Tag besser?',
    'Für welche vergangenen Fehler bist du im Nachhinein dankbar?',
    'Schreibe einen Brief an jemanden, dem du nie gedankt hast',
    'Was an dir selbst bewunderst du am meisten?',
    'Welches Essen macht dich glücklich? Geniesse es heute bewusst',
    'Schreibe über eine Erinnerung, die dich innerlich wärmt',
    'Was hat die Welt dir heute Gutes gegeben?',
    'Fasse zusammen: Was hat dieser Monat der Dankbarkeit verändert?',
  ],
  'Creativity Boost': [
    'Zeichne etwas ohne Radiergummi – akzeptiere Fehler',
    'Schreibe 5 Minuten lang ohne Pause auf – egal was',
    'Erstelle ein Moodboard zu einem Thema, das dich begeistert',
    'Fotografiere 10 interessante Dinge in deiner Umgebung',
    'Schreibe ein kurzes Gedicht über deinen Tag',
    'Kombiniere zwei ungewöhnliche Ideen zu etwas Neuem',
    'Lerne heute etwas Neues für genau 20 Minuten',
    'Baue etwas aus Materialien, die du zuhause hast',
    'Schreibe die erste Seite einer Geschichte',
    'Zeichne dein Lieblingsgericht als abstrakte Kunst',
    'Erstelle eine Playlist, die eine bestimmte Stimmung erzeugt',
    'Schreibe 10 "Was wäre wenn"-Fragen auf und beantworte eine',
    'Versuche eine Aufgabe auf eine völlig neue Art zu lösen',
    'Mache eine Collage aus alten Zeitschriften oder Fotos',
    'Übersetze eine Emotion in eine Farbe, Form oder Textur',
    'Schreibe einen Brief an dein zukünftiges Ich in 5 Jahren',
    'Imitiere den Stil eines Künstlers oder Autors für eine Seite',
    'Erstelle ein Rezept aus zufälligen Zutaten',
    'Schreibe einen Dialog zwischen zwei komplett gegensätzlichen Figuren',
    'Gestalte eine Seite in einem Notizbuch ohne festes Thema',
    'Finde 5 alternative Verwendungen für einen alltäglichen Gegenstand',
    'Schaffe heute Stille und lass Ideen kommen – 15 Minuten',
    'Zeichne deine Lieblingsperson als Cartoon-Charakter',
    'Schreibe die Beschreibung eines fiktiven Ortes',
    'Erstelle ein einfaches Lied oder einen Rap über deinen Alltag',
    'Nimm etwas Gewöhnliches und mache es aussergewöhnlich',
    'Beschreibe ein Geräusch in Worten ohne das Wort selbst zu nennen',
    'Baue eine Miniatur-Skulptur aus Papier oder Ton',
    'Male dein Gefühl von heute Morgen in Farben',
    'Reflektiere: Wie hat Kreativität deinen Alltag verändert?',
  ],
  'Self-Care': [
    'Trinke heute mindestens 2 Liter Wasser',
    'Mache eine 20-minütige Meditation oder Atemübung',
    'Lege 1 Stunde ohne Bildschirm ein',
    'Gönn dir ein entspannendes Bad oder eine lange Dusche',
    'Schlafe heute mindestens 8 Stunden',
    'Bereite ein selbst gekochtes, nährendes Gericht zu',
    'Mache eine 30-minütige Bewegungseinheit, die dir Spass macht',
    'Schreibe in ein Tagebuch – ohne Zensur',
    'Höre Musik, die dich glücklich macht – bewusst und ohne Ablenkung',
    'Lege eine echte Mittagspause ein',
    'Sage heute einer Person, die du magst, was sie dir bedeutet',
    'Massiere deine Hände und Schultern für 5 Minuten',
    'Schlafe 30 Minuten früher als sonst',
    'Lese 20 Minuten in einem Buch, das dir gefällt',
    'Mache einen Spaziergang in der Natur – ohne Handy',
    'Räume einen Bereich auf, der dich stresst',
    'Bereite eine Tasse Tee zu und trinke sie bewusst',
    'Schreibe auf, was dir heute gut gelungen ist',
    'Tu heute etwas, das du lange nicht gemacht hast und liebst',
    'Verbringe Zeit mit jemandem, der dir gut tut',
    'Trage heute Kleidung, in der du dich wohl und schön fühlst',
    'Schenke dir Ruhe – ohne Schuldgefühle',
    'Achte auf deine Körperhaltung und richte sie mehrmals auf',
    'Atme 10 Minuten bewusst durch das Zwerchfell',
    'Kaufe dir eine kleine Freude – etwas für unter 10 Franken',
    'Setze klare Grenzen – sag "Nein" zu etwas Unangenehmen',
    'Schreibe 3 Dinge auf, die dein Körper heute für dich getan hat',
    'Gönne dir ein Nickerchen – 20 Minuten',
    'Verbinde dich mit der Natur: barfuss gehen oder Gras fühlen',
    'Feiere, dass du 30 Tage auf dich selbst geachtet hast',
  ],
  'Digital Detox': [
    'Kein Social Media vor 10 Uhr',
    'Schalte alle Push-Benachrichtigungen für einen Tag aus',
    'Iss alle Mahlzeiten heute ohne Bildschirm',
    'Verbringe 1 Stunde offline mit einem Hobby',
    'Lege das Handy 2 Stunden vor dem Schlafen weg',
    'Mache einen Spaziergang ohne Kopfhörer',
    'Lies eine Zeitung oder ein Buch statt zu scrollen',
    'Ruf jemanden an statt eine Nachricht zu schreiben',
    'Halte das Handy heute aus dem Schlafzimmer fern',
    'Schreibe handschriftlich – keine Tastatur',
    'Mache eine Aktivität ganz ohne Musik oder Podcast',
    'Lösche heute eine App, die du kaum verwendest',
    'Organisiere ein Treffen mit Freunden ohne Handys',
    'Schalte das WLAN für 3 Stunden aus',
    'Verbring den Abend mit einem Spiel oder Puzzle',
    'Führe ein Gespräch ohne aufs Handy zu schauen',
    'Nutze heute nur Papier und Stift für deine Notizen',
    'Starte den Tag ohne Handy – erste 30 Minuten',
    'Überlege: Wie viel Zeit kostet dich Social Media pro Woche?',
    'Mache einen halben Tag komplett offline',
    'Beobachte, was du mit der gewonnenen Zeit anfängst',
    'Teile deine Digital-Detox-Erfahrung mit jemandem persönlich',
    'Aktiviere Graustufen auf deinem Telefon für den Tag',
    'Schreibe auf, was du online vermisst – und hinterfrage es',
    'Verbring den Sonntagmorgen analog',
    'Beschränke E-Mails auf zweimal täglich',
    'Erstelle eine "No-Phone-Zone" zuhause',
    'Meditiere statt zu scrollen – wenn du das Handy greifen willst',
    'Schreibe einen handschriftlichen Brief an jemanden',
    'Reflektiere: Wie hat weniger Screen-Time dein Leben verbessert?',
  ],
  'Happiness Boost': [
    'Lache heute mindestens 5 Minuten – auch ohne Grund',
    'Tue jemandem Fremdes etwas Gutes',
    'Schreibe 3 Dinge auf, die dich heute froh gemacht haben',
    'Tanze alleine zu deinem Lieblingslied',
    'Ruf einen alten Freund an und erzähle ihm, was du schätzt',
    'Esse heute etwas, das du liebst – bewusst geniessen',
    'Mache einen Spaziergang und beobachte die Welt',
    'Schreibe auf, was dich heute zum Lachen gebracht hat',
    'Tue etwas Grosszügiges – ohne Erwartung',
    'Verbringe Zeit mit einem Tier',
    'Mache etwas, das du als Kind geliebt hast',
    'Führe ein tiefes Gespräch mit jemandem, der dir wichtig ist',
    'Schenke 3 Personen heute ein aufrichtiges Kompliment',
    'Suche dir ein neues Hobby und probiere es 30 Minuten',
    'Besuche einen Ort, der dir besondere Freude bereitet',
    'Schreibe einen Brief an dein zukünftiges glückliches Ich',
    'Mache eine Tat, die andere überrascht und erfreut',
    'Achte aktiv auf schöne Momente – und halte sie fest',
    'Bitte jemanden, dir etwas über seinen Lieblingsmoment zu erzählen',
    'Verbringe Zeit in der Sonne',
    'Koche etwas Neues, das dich neugierig macht',
    'Schreibe 10 Dinge auf, die dein Leben bereichern',
    'Singe – egal ob gut oder schlecht',
    'Schaue einen Film, der dich immer zum Lachen bringt',
    'Plane einen kleinen Ausflug für die nächste Woche',
    'Sage einer Person, wie wichtig sie dir ist',
    'Erlebe heute einen Sonnenuntergang oder -aufgang bewusst',
    'Schreibe deine grösste Freude der letzten 30 Tage auf',
    'Teile deine Freude mit jemandem – erzähle, was dir Glück bedeutet',
    'Feiere den Abschluss: Schreibe, wie sich dein Glück verändert hat',
  ],
  'Fitness Journey': [
    '10 Minuten Aufwärmen und leichte Dehnübungen',
    '20 Minuten Spaziergang in flottem Tempo',
    '3 Sätze à 10 Liegestütze (angepasste Version erlaubt)',
    '20 Minuten Yoga oder Pilates für Einsteiger',
    '30 Minuten Joggen oder schnelles Gehen',
    '3 × 15 Kniebeugen und 3 × 10 Ausfallschritte',
    'Schwimmen, Radfahren oder Tanzen – 30 Minuten',
    '3 × 30 Sekunden Plank halten',
    'Ganzkörper-Workout für 25 Minuten (Bodyweight)',
    '10.000 Schritte über den Tag verteilt',
    '3 × 12 Dips und 3 × 10 Liegestütze mit enger Armhaltung',
    '30 Minuten aktiver Sport deiner Wahl',
    'Stretching-Routine für ganzen Körper – 20 Minuten',
    'HIIT Training – 20 Minuten (30 Sek. an, 15 Sek. Pause)',
    'Bergwandern, Treppensteigen oder Hiking – 45 Minuten',
    '3 × 12 Ruderübungen oder Klimmzüge (Variante)',
    '30 Minuten Cardio deiner Wahl',
    'Mobility und Beweglichkeitsübungen – 20 Minuten',
    'Kraft-Circuit: 5 Übungen, je 3 Sätze',
    'Aktive Erholung: Yoga oder Spaziergang – 20 Minuten',
    'Interval-Lauf: 1 Min. schnell, 2 Min. locker – 20 Min.',
    'Bauchmuskeln-Workout – 15 Minuten intensiv',
    '30 Minuten Tanzen – macht Spass und ist effektiv',
    'Oberkörper-Kraft: Liegestütze, Dips, Planks',
    'Unterkörper-Kraft: Squats, Lunges, Glute Bridges',
    'Aktive Erholung und Massageroller – 20 Minuten',
    '45 Minuten moderates Cardio',
    'Ganzkörper-Stretch und Atemübungen',
    'Dein persönlich stärkstes Workout des Monats',
    'Reflektiere: Welche Fortschritte hast du in 30 Tagen gemacht?',
  ],
  'Mindfulness': [
    'Sitze 5 Minuten still und beobachte nur deinen Atem',
    'Iss eine Mahlzeit heute in voller Achtsamkeit',
    'Mache einen achtsamen Spaziergang – alle Sinne aktiv',
    'Scanne deinen Körper von Kopf bis Fuss – 10 Minuten',
    'Beobachte deine Gedanken für 10 Minuten ohne Wertung',
    'Führe eine achtsame Konversation – nur zuhören',
    'Bereite Tee oder Kaffee in völliger Stille zu',
    'Schreibe 10 Minuten lang deine momentanen Gefühle auf',
    'Atme 4-7-8 Technik: einatmen, halten, ausatmen',
    'Beobachte 5 Minuten lang Natur – Wolken, Blätter, Wind',
    'Fokussiere dich auf eine einzige Aufgabe für 25 Minuten',
    'Praktiziere Liebende-Güte-Meditation – 10 Minuten',
    'Mache eine Body-Scan-Meditation vor dem Schlafen',
    'Bemerke 5 Dinge, die du normalerweise übersiehst',
    'Führe ein Achtsamkeitstagebuch für den Tag',
    'Setze dich 15 Minuten in die Natur – ohne Ziel',
    'Visualisiere deinen perfekten Tag in 10 Minuten',
    'Übe Dankbarkeit durch Stille – ohne Worte',
    'Atme tief und bewusst vor jeder Mahlzeit',
    'Mache eine Geräusch-Meditation: was hörst du?',
    'Beobachte deine Reaktionen heute – reagierst du oder agierst du?',
    'Praktiziere "offenes Gewahrsein" – 15 Minuten',
    'Schreibe auf, was du in deinem Leben wirklich schätzt',
    'Meditiere über eine Frage, die dich beschäftigt',
    'Gehe heute langsamer – und bemerke den Unterschied',
    'Achte auf deinen inneren Dialog – ist er freundlich?',
    'Übe 20 Minuten Yin-Yoga oder stilles Sitzen',
    'Beende den Tag mit Dankbarkeit – 3 Dinge benennen',
    'Meditiere 20 Minuten über den vergangenen Monat',
    'Reflektiere: Wie hat Achtsamkeit dein Leben verändert?',
  ],
}

export default function ChallengesTab() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [showSaved, setShowSaved] = useState(false)
  const [view, setView] = useState('overview') // 'overview' | 'active'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('challenges').select('*').order('created_at', { ascending: true })
      if (error) throw error
      setChallenges(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function startChallenge(challenge) {
    const { data, error } = await supabase
      .from('challenges')
      .update({ started_at: TODAY, current_day: 0 })
      .eq('id', challenge.id)
      .select().single()
    if (!error && data) {
      setChallenges(prev => prev.map(c => c.id === challenge.id ? data : c))
      setSelectedChallenge(null)
      flashSaved()
    }
  }

  async function completeDay(challenge) {
    const newDay = (challenge.current_day || 0) + 1
    const { data, error } = await supabase
      .from('challenges')
      .update({ current_day: Math.min(newDay, 30) })
      .eq('id', challenge.id)
      .select().single()
    if (!error && data) {
      setChallenges(prev => prev.map(c => c.id === challenge.id ? data : c))
      flashSaved()
    }
  }

  async function resetChallenge(challenge) {
    const { data, error } = await supabase
      .from('challenges')
      .update({ started_at: null, current_day: 0 })
      .eq('id', challenge.id)
      .select().single()
    if (!error && data) {
      setChallenges(prev => prev.map(c => c.id === challenge.id ? data : c))
      flashSaved()
    }
  }

  function flashSaved() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const activeChallenges = challenges.filter(c => c.started_at && c.current_day < 30)
  const availableChallenges = challenges.filter(c => !c.started_at)
  const completedChallenges = challenges.filter(c => c.started_at && c.current_day >= 30)

  function getTodayTask(challenge) {
    const tasks = CHALLENGE_TASKS[challenge.name] || []
    const dayIndex = challenge.current_day || 0
    return tasks[dayIndex] || null
  }

  function getPct(challenge) {
    return Math.round(((challenge.current_day || 0) / 30) * 100)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SavedBadge visible={showSaved} />

      {/* Header Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Aktiv', value: activeChallenges.length, color: C.primary, bg: '#FFF5EC', icon: '🔥' },
          { label: 'Verfügbar', value: availableChallenges.length, color: C.blue, bg: '#EDF4FB', icon: '💡' },
          { label: 'Abgeschlossen', value: completedChallenges.length, color: C.sage, bg: '#F0F7F2', icon: '🏆' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: s.bg, borderRadius: 14, padding: '12px 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.8, textAlign: 'center' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#444', marginBottom: 10, paddingLeft: 2 }}>
            🔥 Aktive Challenges
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeChallenges.map(ch => {
              const pct = getPct(ch)
              const todayTask = getTodayTask(ch)
              const dayNum = (ch.current_day || 0) + 1
              return (
                <div key={ch.id} style={{
                  background: C.white, borderRadius: 18,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  overflow: 'hidden', animation: 'fadeIn 0.3s ease',
                }}>
                  <div style={{ padding: '16px 16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                        background: `${ch.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                      }}>
                        {ch.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#222' }}>{ch.name}</div>
                        <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>
                          Tag {ch.current_day} / 30 • {30 - ch.current_day} Tage verbleibend
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: ch.color || C.primary }}>
                        {pct}%
                      </div>
                    </div>
                    {/* Progress */}
                    <div style={{ height: 7, background: '#F3F0EB', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: ch.color || C.primary, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>

                    {/* Today's Task */}
                    {todayTask && (
                      <div style={{
                        background: `${ch.color || C.primary}10`, borderRadius: 12,
                        padding: '12px 14px', marginBottom: 12,
                        border: `1px solid ${ch.color || C.primary}30`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: ch.color || C.primary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Aufgabe für Tag {dayNum}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#333', lineHeight: 1.4 }}>
                          {todayTask}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => completeDay(ch)}
                        style={{
                          flex: 2, padding: '11px', background: ch.color || C.primary,
                          border: 'none', borderRadius: 12, color: 'white',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        ✓ Tag {dayNum} abschliessen
                      </button>
                      <button
                        onClick={() => resetChallenge(ch)}
                        style={{
                          flex: 1, padding: '11px', background: '#F3F0EB',
                          border: 'none', borderRadius: 12, color: C.gray,
                          fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Zurücksetzen
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#444', marginBottom: 10, paddingLeft: 2 }}>
            🏆 Abgeschlossene Challenges
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completedChallenges.map(ch => (
              <div key={ch.id} style={{
                background: '#F0F7F2', borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.sage}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {ch.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>{ch.name}</div>
                  <div style={{ fontSize: 12, color: C.sage, fontWeight: 600 }}>✓ 30/30 Tage abgeschlossen</div>
                </div>
                <div style={{ fontSize: 20 }}>🏆</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Challenges */}
      {availableChallenges.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#444', marginBottom: 10, paddingLeft: 2 }}>
            💡 Verfügbare Challenges
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {availableChallenges.map(ch => (
              <div
                key={ch.id}
                onClick={() => setSelectedChallenge(ch)}
                style={{
                  background: C.white, borderRadius: 16, padding: '16px 14px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 10,
                  background: `${ch.color || C.primary}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>
                  {ch.emoji}
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#333', marginBottom: 4, lineHeight: 1.3 }}>
                  {ch.name}
                </div>
                <div style={{ fontSize: 11, color: C.gray }}>30 Tage</div>
                <div style={{
                  marginTop: 10, fontSize: 11, fontWeight: 700, padding: '4px 10px',
                  background: `${ch.color || C.primary}15`, color: ch.color || C.primary,
                  borderRadius: 8, display: 'inline-block',
                }}>
                  Starten →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div
          onClick={() => setSelectedChallenge(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 500, display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430, margin: '0 auto',
              background: C.white, borderRadius: '24px 24px 0 0',
              padding: '24px 20px 40px', animation: 'slideUp 0.3s ease',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0D8D0', margin: '0 auto 20px', display: 'block' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, flexShrink: 0,
                background: `${selectedChallenge.color || C.primary}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
              }}>
                {selectedChallenge.emoji}
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#222' }}>{selectedChallenge.name}</div>
                <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>30-Tage Challenge</div>
              </div>
            </div>

            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
              {selectedChallenge.description}
            </div>

            {/* Preview of first 3 tasks */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#444', marginBottom: 10 }}>Erste Aufgaben:</div>
              {(CHALLENGE_TASKS[selectedChallenge.name] || []).slice(0, 3).map((task, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: `${selectedChallenge.color || C.primary}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: selectedChallenge.color || C.primary,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{task}</div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: C.gray, fontStyle: 'italic', marginTop: 4 }}>
                ... und 27 weitere Tagesaufgaben
              </div>
            </div>

            <button
              onClick={() => startChallenge(selectedChallenge)}
              style={{
                width: '100%', padding: '16px',
                background: selectedChallenge.color || C.primary,
                border: 'none', borderRadius: 16, color: 'white',
                fontWeight: 800, fontSize: 16, cursor: 'pointer',
                boxShadow: `0 4px 16px ${selectedChallenge.color || C.primary}40`,
              }}
            >
              🚀 Jetzt starten
            </button>
            <button
              onClick={() => setSelectedChallenge(null)}
              style={{
                width: '100%', padding: '12px', marginTop: 10,
                background: 'none', border: 'none', color: C.gray,
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
