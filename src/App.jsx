import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import Ventas from './pages/Ventas'
import Reportes from './pages/Reportes'
import Maestros from './pages/Maestros'
import Empresa from './pages/Empresa'
import './App.css'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [page,      setPage]      = useState('dashboard')

  const pages = {
    dashboard: <Dashboard />,
    ventas:    <Ventas />,
    productos: <Productos />,
    clientes:  <Clientes />,
    reportes:  <Reportes />,
    maestros:  <Maestros />,
    empresa:   <Empresa />,
  }

  const titles = {
    dashboard: 'Dashboard',
    ventas:    'Caja / Ventas',
    productos: 'Productos',
    clientes:  'Clientes',
    reportes:  'Reportes',
    maestros:  'Maestro de datos',
    empresa:   'Mi empresa',
  }

  return (
    <div className="app">
      <Sidebar collapsed={collapsed} page={page} setPage={setPage} />
      <div className="main">
        <Topbar title={titles[page]} onToggle={() => setCollapsed(!collapsed)} />
        <div className="content">
          {pages[page]}
        </div>
      </div>
    </div>
  )
}