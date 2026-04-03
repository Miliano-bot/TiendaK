import { useState } from 'react'

const COLORES = {
  danger:  { bg: 'rgba(224,82,82,0.12)',   border: 'rgba(224,82,82,0.3)',   color: 'var(--danger)',  icon: '🚨' },
  warn:    { bg: 'rgba(245,166,35,0.12)',  border: 'rgba(245,166,35,0.3)',  color: 'var(--warn)',    icon: '⚠️' },
  success: { bg: 'rgba(76,175,135,0.12)',  border: 'rgba(76,175,135,0.3)', color: 'var(--success)', icon: '✅' },
}

export default function Topbar({ title, onToggle, notifs = [], totalNum = 0, onNavigate }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="topbar" style={{ position: 'relative', zIndex: 50 }}>
      <button className="toggle-btn" onClick={onToggle}>☰</button>
      <span className="page-title">{title}</span>

      <div className="topbar-right">
        {/* Campanita */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 8px', borderRadius: 8, position: 'relative', color: 'var(--text2)', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            🔔
            {totalNum > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: 'var(--danger)', color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: 10,
                padding: '1px 5px', minWidth: 16, textAlign: 'center', lineHeight: '14px',
              }}>
                {totalNum > 9 ? '9+' : totalNum}
              </span>
            )}
          </button>

          {/* Panel de notificaciones */}
          {open && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, width: 320,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, zIndex: 99, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Notificaciones</span>
                  {totalNum > 0 && <span className="badge badge-danger">{totalNum} pendientes</span>}
                </div>

                {notifs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    Todo al día
                  </div>
                ) : (
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifs.map(n => {
                      const c = COLORES[n.nivel] || COLORES.warn
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            setOpen(false)
                            if (n.tipo === 'stock' || n.tipo === 'stock_bajo') onNavigate('bodega')
                            else if (n.tipo === 'gasto' || n.tipo === 'gasto_vencido') onNavigate('gastos')
                            else if (n.tipo === 'corte') onNavigate('cortecaja')
                            else if (n.tipo === 'ventas') onNavigate('reportes')
                          }}
                          style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--border)',
                            cursor: 'pointer', background: c.bg,
                            borderLeft: `3px solid ${c.color}`,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: c.color }}>{n.titulo}</p>
                              <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{n.subtitulo}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="avatar">A</div>
      </div>
    </div>
  )
}