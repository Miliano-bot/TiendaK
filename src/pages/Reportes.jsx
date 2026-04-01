import { formatFechaHora, formatFecha } from '../utils/fecha'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

function TabBtn({ active, onClick, children }) {
  return (
    <button className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 13 }} onClick={onClick}>
      {children}
    </button>
  )
}

function ReporteVentas() {
  const [ventas,  setVentas]  = useState([])
  const [loading, setLoading] = useState(true)
  const [desde,   setDesde]   = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [hasta,   setHasta]   = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => { fetchVentas() }, [desde, hasta])

  async function fetchVentas() {
    setLoading(true)
    const { data } = await supabase
      .from('ventas').select('*, clientes(nombre)')
      .eq('idempresa', ID_EMPRESA)
      .gte('fecha', desde + 'T00:00:00')
      .lte('fecha', hasta + 'T23:59:59')
      .order('fecha', { ascending: false })
    setVentas(data || [])
    setLoading(false)
  }

  const total    = ventas.reduce((s, v) => s + parseFloat(v.total), 0)
  const promedio = ventas.length > 0 ? total / ventas.length : 0

  const atajo = (days) => {
    const h = new Date(); const d = new Date(); d.setDate(d.getDate() - days)
    setHasta(h.toISOString().split('T')[0]); setDesde(d.toISOString().split('T')[0])
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>DESDE</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(0)}>Hoy</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(7)}>7 días</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(30)}>30 días</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card"><div className="metric-label">Total período</div><div className="metric-value" style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</div></div>
        <div className="metric-card"><div className="metric-label">Ventas</div><div className="metric-value">{ventas.length}</div></div>
        <div className="metric-card"><div className="metric-label">Ticket promedio</div><div className="metric-value">${promedio.toFixed(2)}</div></div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : ventas.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🧾</div>Sin ventas en este período</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Total</th></tr></thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.idventa}>
                    <td style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>#{v.idventa}</td>
                    <td style={{ color: 'var(--text2)' }}>{new Date(v.fecha).toLocaleString('es-EC', {timeZone:'America/Guayaquil', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                    <td>{v.clientes?.nombre || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>Consumidor final</span>}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>${parseFloat(v.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ReporteInventario() {
  const [movimientos, setMovimientos] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tipo,        setTipo]        = useState('todos')

  useEffect(() => { fetchMovimientos() }, [tipo])

  async function fetchMovimientos() {
    setLoading(true)
    let q = supabase.from('inventariohistorico').select('*, productos(nombre)')
      .eq('idempresa', ID_EMPRESA).order('fecha', { ascending: false }).limit(100)
    if (tipo !== 'todos') q = q.eq('tipo_movimiento', tipo)
    const { data } = await q
    setMovimientos(data || [])
    setLoading(false)
  }

  const totalInvertido = movimientos.filter(m => m.tipo_movimiento === 'entrada')
    .reduce((s, m) => s + parseFloat(m.total_invertido || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['todos', 'entrada', 'salida'].map(t => (
          <button key={t} className={`btn ${tipo === t ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 13 }} onClick={() => setTipo(t)}>
            {t === 'todos' ? 'Todos' : t === 'entrada' ? '📥 Entradas' : '📤 Salidas'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card"><div className="metric-label">Total invertido</div><div className="metric-value" style={{ color: 'var(--warn)' }}>${totalInvertido.toFixed(2)}</div></div>
        <div className="metric-card"><div className="metric-label">Movimientos</div><div className="metric-value">{movimientos.length}</div></div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : movimientos.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div>Sin movimientos</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Costo unit.</th><th>Total</th><th>Nota</th></tr></thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.idmovimiento}>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{formatFechaHora(m.fecha)}</td>
                    <td style={{ fontWeight: 500 }}>{m.productos?.nombre || '—'}</td>
                    <td><span className={`badge ${m.tipo_movimiento === 'entrada' ? 'badge-success' : 'badge-warn'}`}>{m.tipo_movimiento === 'entrada' ? '📥 Entrada' : '📤 Salida'}</span></td>
                    <td>{m.cantidad}</td>
                    <td>{m.precio_costo > 0 ? `$${parseFloat(m.precio_costo).toFixed(2)}` : '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--warn)' }}>{m.total_invertido > 0 ? `$${parseFloat(m.total_invertido).toFixed(2)}` : '—'}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{m.nota || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ReporteProductos() {
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('productos').select('*, categorias!productos_idcategoria_fkey(nombre)')
      .eq('idempresa', ID_EMPRESA).order('cantidad', { ascending: true })
      .then(({ data }) => { setProductos(data || []); setLoading(false) })
  }, [])

  const valorInventario = productos.reduce((s, p) => s + parseFloat(p.precio) * p.cantidad, 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card"><div className="metric-label">Total productos</div><div className="metric-value">{productos.length}</div></div>
        <div className="metric-card"><div className="metric-label">Valor inventario</div><div className="metric-value" style={{ color: 'var(--accent)' }}>${valorInventario.toFixed(2)}</div></div>
        <div className="metric-card"><div className="metric-label">Sin stock</div><div className="metric-value" style={{ color: 'var(--danger)' }}>{productos.filter(p => p.cantidad === 0).length}</div></div>
        <div className="metric-card"><div className="metric-label">Stock bajo</div><div className="metric-value" style={{ color: 'var(--warn)' }}>{productos.filter(p => p.cantidad > 0 && p.cantidad <= 5).length}</div></div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Unidad</th><th>Precio venta</th><th>Valor total</th><th>Estado</th></tr></thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.idproducto}>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>{p.categorias?.nombre || '—'}</td>
                    <td>{p.cantidad === 0 ? <span className="badge badge-danger">0</span> : p.cantidad <= 5 ? <span className="badge badge-warn">{p.cantidad}</span> : <span style={{ fontWeight: 600 }}>{p.cantidad}</span>}</td>
                    <td style={{ color: 'var(--text2)' }}>{p.unidad || 'Unidad'}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>${(parseFloat(p.precio) * p.cantidad).toFixed(2)}</td>
                    <td><span className={`badge ${p.discontinuado ? 'badge-danger' : 'badge-success'}`}>{p.discontinuado ? 'Discontinuado' : 'Activo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ReporteClientes() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: clientesData } = await supabase.from('clientes').select('*').eq('idempresa', ID_EMPRESA).order('nombre')
      const { data: ventasData }   = await supabase.from('ventas').select('idcliente, total').eq('idempresa', ID_EMPRESA)
      const totales = {}
      ventasData?.forEach(v => { if (!v.idcliente) return; totales[v.idcliente] = (totales[v.idcliente] || 0) + parseFloat(v.total) })
      const resultado = (clientesData || []).map(c => ({
        ...c,
        totalComprado: totales[c.idcliente] || 0,
        numCompras:    ventasData?.filter(v => v.idcliente === c.idcliente).length || 0,
      })).sort((a, b) => b.totalComprado - a.totalComprado)
      setClientes(resultado); setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card"><div className="metric-label">Total clientes</div><div className="metric-value">{clientes.length}</div></div>
        <div className="metric-card"><div className="metric-label">Con compras</div><div className="metric-value" style={{ color: 'var(--success)' }}>{clientes.filter(c => c.numCompras > 0).length}</div></div>
        <div className="metric-card"><div className="metric-label">Mejor cliente</div><div className="metric-value" style={{ fontSize: 15, color: 'var(--accent)' }}>{clientes[0]?.nombre?.split(' ')[0] || '—'}</div></div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : clientes.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div>Sin clientes</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Compras</th><th>Total gastado</th></tr></thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={c.idcliente}>
                    <td style={{ color: 'var(--text2)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>{c.telefono || '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{c.correo || '—'}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.numCompras}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>${c.totalComprado.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Reportes() {
  const [tab, setTab] = useState('ventas')
  const tabs = [
    { id: 'ventas',     label: '🧾 Ventas' },
    { id: 'inventario', label: '📦 Inventario' },
    { id: 'productos',  label: '🏷️ Productos' },
    { id: 'clientes',   label: '👥 Clientes' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</TabBtn>)}
      </div>
      {tab === 'ventas'     && <ReporteVentas />}
      {tab === 'inventario' && <ReporteInventario />}
      {tab === 'productos'  && <ReporteProductos />}
      {tab === 'clientes'   && <ReporteClientes />}
    </div>
  )
}