import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

export default function Sidebar({ collapsed, mobileOpen, page, setPage }) {
  const [empresa, setEmpresa] = useState({ nombre: 'MiTienda', logo: '' })

  useEffect(() => {
    supabase.from('empresa').select('nombre,logo').eq('idempresa',ID_EMPRESA).single()
      .then(({ data }) => { if (data) setEmpresa(data) })
  }, [])

  const nav = [
    { id:'dashboard',  label:'Dashboard',       icon:'🏠' },
    { id:'ventas',     label:'Caja',             icon:'🛒' },
    { sep: true, label: 'INVENTARIO' },
    { id:'productos',  label:'Productos',         icon:'📦' },
    { id:'bodega',     label:'Bodega',            icon:'🏭' },
    { id:'proveedores',label:'Proveedores',       icon:'🚚' },
    { sep: true, label: 'CLIENTES' },
    { id:'clientes',   label:'Clientes',          icon:'👥' },
    { sep: true, label: 'FINANZAS' },
    { id:'finanzas',   label:'Finanzas',          icon:'📊' },
    { id:'gastos',     label:'Gastos',            icon:'💸' },
    { id:'cortecaja',  label:'Corte de caja',     icon:'🏧' },
    { sep: true, label: 'REPORTES' },
    { id:'reportes',   label:'Reportes',          icon:'📈' },
    { sep: true, label: 'CONFIG' },
    { id:'maestros',   label:'Maestro de datos',  icon:'⚙️' },
  ]

  const sidebarClass = ['sidebar', collapsed?'collapsed':'', mobileOpen?'mobile-open':''].filter(Boolean).join(' ')

  return (
    <div className={sidebarClass}>
      <div className="sidebar-header" onClick={() => setPage('empresa')} title="Mi empresa">
        {empresa.logo
          ? <img src={empresa.logo} alt="logo" style={{ width:32,height:32,borderRadius:8,objectFit:'cover',flexShrink:0 }} onError={e=>e.target.style.display='none'} />
          : <div className="logo-icon">🛍</div>
        }
        <span className="logo-text">{empresa.nombre}</span>
      </div>

      <nav>
        {nav.map((item, i) => {
          if (item.sep) return (
            <div key={i}>
              <div style={{ height:1,background:'var(--border)',margin:'6px 8px 2px' }} />
              {!collapsed && item.label && <p style={{ fontSize:9,color:'var(--text2)',padding:'4px 12px 2px',letterSpacing:1,textTransform:'uppercase',opacity:0.6 }}>{item.label}</p>}
            </div>
          )
          return (
            <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div style={{ padding:'8px 6px',borderTop:'1px solid var(--border)' }}>
        <button className={`nav-item ${page==='empresa'?'active':''}`} onClick={()=>setPage('empresa')}>
          <span className="nav-icon">🏢</span>
          <span className="nav-label">Mi empresa</span>
        </button>
      </div>
    </div>
  )
}