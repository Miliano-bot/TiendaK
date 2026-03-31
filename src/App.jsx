import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import Ventas from './pages/Ventas'
import Reportes from './pages/Reportes'
import Maestros from './pages/Maestros'
import Empresa from './pages/Empresa'
import Bodega from './pages/Bodega'
import Proveedores from './pages/Proveedores'
import Gastos from './pages/Gastos.jsx/index.js'
import CorteCaja from './pages/CorteCaja'
import Finanzas from './pages/Finanzas.jsx'
import './App.css'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed,   setCollapsed]   = useState(false)
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 768)
  const [page,        setPage]        = useState('dashboard')

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function toggleSidebar() {
    if (isMobile) setSidebarOpen(o => !o)
    else setCollapsed(c => !c)
  }

  function navigateTo(p) { setPage(p); if (isMobile) setSidebarOpen(false) }

  const titles = {
    dashboard:  'Dashboard',
    ventas:     'Caja / Ventas',
    productos:  'Productos',
    clientes:   'Clientes',
    bodega:     'Bodega',
    proveedores:'Proveedores',
    gastos:     'Gastos operativos',
    cortecaja:  'Corte de caja',
    finanzas:   'Finanzas',
    reportes:   'Reportes',
    maestros:   'Maestro de datos',
    empresa:    'Mi empresa',
  }

  const pages = {
    dashboard:   <Dashboard onNavigate={navigateTo} />,
    ventas:      <Ventas />,
    productos:   <Productos />,
    clientes:    <Clientes />,
    bodega:      <Bodega />,
    proveedores: <Proveedores />,
    gastos:      <Gastos />,
    cortecaja:   <CorteCaja />,
    finanzas:    <Finanzas />,
    reportes:    <Reportes />,
    maestros:    <Maestros />,
    empresa:     <Empresa />,
  }

  return (
    <div className="app">
      <div className={`sidebar-overlay ${isMobile && sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar collapsed={!isMobile && collapsed} mobileOpen={isMobile && sidebarOpen} page={page} setPage={navigateTo} />
      <div className="main">
        <Topbar title={titles[page]} onToggle={toggleSidebar} />
        <div className="content">{pages[page]}</div>
      </div>
    </div>
  )
}