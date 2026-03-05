export function SavedBadge({ visible }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed',
      top: 70,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#2A9D8F',
      color: 'white',
      padding: '8px 18px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 700,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      boxShadow: '0 4px 16px rgba(42,157,143,0.35)',
      animation: 'fadeIn 0.2s ease',
      whiteSpace: 'nowrap',
    }}>
      ✓ Gespeichert
    </div>
  )
}
