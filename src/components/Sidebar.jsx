import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

export default function Sidebar({ collapsed, page, setPage }) {
  const [empresa, setEmpresa] = useState({ nombre: 'MiTienda', logo: '' })

  useEffect(() => {
    supabase.from('empresa').select('nombre, logo').eq('idempresa', ID_EMPRESA).single()
      .then(({ data }) => { if (data) setEmpresa(data) })
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',       icon: '🏠' },
    { id: 'ventas',    label: 'Caja',             icon: '🛒' },
    { id: 'productos', label: 'Productos',         icon: '📦' },
    { id: 'clientes',  label: 'Clientes',          icon: '👥' },
    { id: 'separator' },
    { id: 'reportes',  label: 'Reportes',          icon: '📊' },
    { id: 'maestros',  label: 'Maestro de datos',  icon: '⚙️' },
  ]

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo — click para ir a configuración de empresa */}
      <div
        className="sidebar-header"
        style={{ cursor: 'pointer' }}
        onClick={() => setPage('empresa')}
        title="Configurar empresa"
      >
        {empresa.logo ? (
          <img
            src={empresa.logo}
            alt="logo"
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div className="logo-icon">🛍</div>
        )}
        <span className="logo-text">{empresa.nombre}</span>
      </div>

      <nav>
        {navItems.map((item, i) => {
          if (item.id === 'separator') return (
            <div key={i} style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />
          )
          return (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Empresa al fondo */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <button
          className={`nav-item ${page === 'empresa' ? 'active' : ''}`}
          onClick={() => setPage('empresa')}
        >
          <span className="nav-icon">🏢</span>
          <span className="nav-label">Mi empresa</span>
        </button>
      </div>
    </div>
  )
}