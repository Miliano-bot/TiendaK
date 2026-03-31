import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import Ventas from './pages/Ventas'
import './App.css'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard: <Dashboard />,
    productos: <Productos />,
    clientes:  <Clientes />,
    ventas:    <Ventas />,
  }

  const titles = {
    dashboard: 'Dashboard',
    productos: 'Productos',
    clientes:  'Clientes',
    ventas:    'Caja / Ventas',
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