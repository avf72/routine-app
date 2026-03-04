import { useState } from 'react'

export function AddInput({ placeholder = 'Hinzufügen...', onAdd, buttonLabel = '+ Hinzufügen', style = {} }) {
  const [value, setValue] = useState('')

  function handleAdd() {
    if (!value.trim()) return
    onAdd(value.trim())
    setValue('')
  }

  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: '10px 14px',
          border: '1.5px solid #E8D5C0',
          borderRadius: 12,
          fontSize: 14,
          background: '#FDF6EE',
          color: '#333',
        }}
      />
      <button
        onClick={handleAdd}
        style={{
          padding: '10px 16px',
          background: '#E8832A',
          border: 'none',
          borderRadius: 12,
          color: 'white',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
