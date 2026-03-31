export default function Sidebar({ collapsed, page, setPage }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'productos', label: 'Productos',  icon: '📦' },
    { id: 'clientes',  label: 'Clientes',   icon: '👥' },
  ]

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-icon">🛍</div>
        <span className="logo-text">MiTienda</span>
      </div>

      <nav>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}