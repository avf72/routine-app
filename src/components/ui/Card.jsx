export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 10px rgba(232,131,42,0.07)',
        ...style,
        cursor: onClick ? 'pointer' : style.cursor,
      }}
    >
      {children}
    </div>
  )
}
