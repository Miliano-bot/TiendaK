import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="metric-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="metric-label">{label}</div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div className="metric-value" style={{ color: color || 'var(--text)' }}>{value}</div>
      {sub && <div className="metric-sub" style={{ color: color || 'var(--text2)' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes') // hoy | semana | mes | total

  useEffect(() => { fetchStats() }, [periodo])

  async function fetchStats() {
    setLoading(true)

    const ahora   = new Date()
    let fechaDesde = null
    if (periodo === 'hoy') {
      fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
    } else if (periodo === 'semana') {
      const d = new Date(ahora); d.setDate(d.getDate() - 7)
      fechaDesde = d.toISOString()
    } else if (periodo === 'mes') {
      const d = new Date(ahora); d.setDate(d.getDate() - 30)
      fechaDesde = d.toISOString()
    }

    // Ventas
    let qVentas = supabase.from('ventas').select('total, fecha').eq('idempresa', ID_EMPRESA)
    if (fechaDesde) qVentas = qVentas.gte('fecha', fechaDesde)
    const { data: ventas } = await qVentas

    const totalVentas   = ventas?.reduce((s, v) => s + parseFloat(v.total), 0) || 0
    const cantVentas    = ventas?.length || 0
    const ticketProm    = cantVentas > 0 ? totalVentas / cantVentas : 0

    // Inversión (entradas inventario)
    let qInv = supabase.from('inventariohistorico')
      .select('total_invertido')
      .eq('idempresa', ID_EMPRESA)
      .eq('tipo_movimiento', 'entrada')
    if (fechaDesde) qInv = qInv.gte('fecha', fechaDesde)
    const { data: entradas } = await qInv
    const totalInversion = entradas?.reduce((s, e) => s + parseFloat(e.total_invertido || 0), 0) || 0

    // Ganancia
    const ganancia = totalVentas - totalInversion

    // Productos
    const { count: totalProductos } = await supabase
      .from('productos').select('*', { count: 'exact', head: true })
      .eq('idempresa', ID_EMPRESA).eq('discontinuado', false)

    const { count: stockBajo } = await supabase
      .from('productos').select('*', { count: 'exact', head: true })
      .eq('idempresa', ID_EMPRESA).eq('discontinuado', false).lte('cantidad', 5)

    // Clientes
    const { count: totalClientes } = await supabase
      .from('clientes').select('*', { count: 'exact', head: true })
      .eq('idempresa', ID_EMPRESA)

    // Top productos vendidos
    const { data: detalle } = await supabase
      .from('ventasdetalle')
      .select('idproducto, cantidad, precio, productos(nombre)')
      .limit(200)

    const topMap = {}
    detalle?.forEach(d => {
      const id = d.idproducto
      if (!topMap[id]) topMap[id] = { nombre: d.productos?.nombre || '?', cantidad: 0, total: 0 }
      topMap[id].cantidad += d.cantidad
      topMap[id].total    += d.cantidad * parseFloat(d.precio)
    })
    const topProductos = Object.values(topMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)

    // Últimas ventas
    const { data: ultimasVentas } = await supabase
      .from('ventas')
      .select('idventa, total, fecha, clientes(nombre)')
      .eq('idempresa', ID_EMPRESA)
      .order('fecha', { ascending: false })
      .limit(5)

    setStats({ totalVentas, cantVentas, ticketProm, totalInversion, ganancia, totalProductos, stockBajo, totalClientes, topProductos, ultimasVentas })
    setLoading(false)
  }

  const periodos = [
    { id: 'hoy',    label: 'Hoy' },
    { id: 'semana', label: '7 días' },
    { id: 'mes',    label: '30 días' },
    { id: 'total',  label: 'Total' },
  ]

  if (loading) return <div className="loading">Cargando estadísticas...</div>
  const s = stats
  const maxTop = s.topProductos[0]?.cantidad || 1

  return (
    <div>
      {/* Selector de período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {periodos.map(p => (
          <button
            key={p.id}
            className={`btn ${periodo === p.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13 }}
            onClick={() => setPeriodo(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Métricas principales */}
      <div className="cards-grid" style={{ marginBottom: 20 }}>
        <MetricCard icon="💰" label="Total ventas"   value={`$${s.totalVentas.toFixed(2)}`}   color="var(--accent)"  sub={`${s.cantVentas} venta${s.cantVentas !== 1 ? 's' : ''}`} />
        <MetricCard icon="📦" label="Inversión"      value={`$${s.totalInversion.toFixed(2)}`} color="var(--warn)"   sub="en mercadería" />
        <MetricCard icon="📈" label="Ganancia"        value={`$${s.ganancia.toFixed(2)}`}       color={s.ganancia >= 0 ? 'var(--success)' : 'var(--danger)'} sub={s.ganancia >= 0 ? '▲ positiva' : '▼ negativa'} />
        <MetricCard icon="🧾" label="Ticket promedio" value={`$${s.ticketProm.toFixed(2)}`}     sub="por venta" />
      </div>

      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <MetricCard icon="🏷️" label="Productos activos" value={s.totalProductos || 0} sub="en catálogo" />
        <MetricCard icon="⚠️" label="Stock bajo"         value={s.stockBajo || 0}     color={s.stockBajo > 0 ? 'var(--warn)' : undefined} sub="requieren atención" />
        <MetricCard icon="👥" label="Clientes"           value={s.totalClientes || 0} sub="registrados" />
      </div>

      <div className="two-col">
        {/* Top productos */}
        <div className="panel">
          <div className="panel-title">Productos más vendidos</div>
          {s.topProductos.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin ventas en este período</p>
          ) : s.topProductos.map((p, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label" style={{ width: 110 }}>{p.nombre.substring(0, 14)}{p.nombre.length > 14 ? '…' : ''}</span>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${Math.max(5, (p.cantidad / maxTop) * 100)}%` }} />
              </div>
              <span className="bar-val" style={{ width: 50, textAlign: 'right' }}>{p.cantidad} und</span>
            </div>
          ))}
        </div>

        {/* Últimas ventas */}
        <div className="panel">
          <div className="panel-title">Últimas ventas</div>
          {s.ultimasVentas?.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin ventas aún</p>
          ) : s.ultimasVentas?.map((v, i) => (
            <div className="recent-item" key={i} style={{ marginBottom: 8 }}>
              <div className="ri-icon" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--accent)' }}>🧾</div>
              <div style={{ flex: 1 }}>
                <p className="ri-name">{v.clientes?.nombre || 'Consumidor final'}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{new Date(v.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className="ri-val">${parseFloat(v.total).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}