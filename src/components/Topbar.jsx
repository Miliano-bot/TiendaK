export default function Topbar({ title, onToggle }) {
  return (
    <div className="topbar">
      <button className="toggle-btn" onClick={onToggle} title="Colapsar menú">
        ☰
      </button>
      <span className="page-title">{title}</span>
      <div className="topbar-right">
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Admin</span>
        <div className="avatar">A</div>
      </div>
    </div>
  )
}