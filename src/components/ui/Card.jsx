export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 10px rgba(30,111,191,0.08)',
        ...style,
        cursor: onClick ? 'pointer' : style.cursor,
      }}
    >
      {children}
    </div>
  )
}
