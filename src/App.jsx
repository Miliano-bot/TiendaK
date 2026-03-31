import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import './App.css'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard: <Dashboard />,
    productos: <Productos />,
    clientes: <Clientes />,
  }

  const titles = {
    dashboard: 'Dashboard',
    productos: 'Productos',
    clientes: 'Clientes',
  }

  return (
    <div className="app">
      <Sidebar
        collapsed={collapsed}
        page={page}
        setPage={setPage}
      />
      <div className="main">
        <Topbar
          title={titles[page]}
          onToggle={() => setCollapsed(!collapsed)}
        />
        <div className="content">
          {pages[page]}
        </div>
      </div>
    </div>
  )
}
