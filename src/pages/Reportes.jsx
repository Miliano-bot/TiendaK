import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatFecha, formatFechaHora, hoyEC, inicioDiaEC, finDiaEC } from '../utils/fecha'

const ID_EMPRESA = 1

function TabBtn({ active, onClick, children }) {
  return (
    <button className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 13 }} onClick={onClick}>
      {children}
    </button>
  )
}

// ── Gráfica de línea simple ──────────────────────────────────
function GraficaLinea({ datos, colorVentas = '#6c63ff', colorGastos = '#e05252' }) {
  if (!datos || datos.length === 0) return <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin datos para graficar</p>

  const maxVal = Math.max(...datos.map(d => Math.max(d.ventas || 0, d.gastos || 0)), 1)
  const w = 100 / (datos.length - 1 || 1)
  const H = 120

  function puntos(key) {
    return datos.map((d, i) => `${i * w},${H - ((d[key] || 0) / maxVal) * H}`).join(' ')
  }

  function area(key) {
    const pts = datos.map((d, i) => `${i * w},${H - ((d[key] || 0) / maxVal) * H}`)
    return `0,${H} ${pts.join(' ')} ${(datos.length - 1) * w},${H}`
  }

  return (
    <div style={{ marginTop: 8 }}>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 140, display: 'block' }}>
        {/* Area ventas */}
        <polygon points={area('ventas')} fill={colorVentas} opacity="0.1" />
        <polyline points={puntos('ventas')} fill="none" stroke={colorVentas} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {/* Area gastos */}
        <polygon points={area('gastos')} fill={colorGastos} opacity="0.1" />
        <polyline points={puntos('gastos')} fill="none" stroke={colorGastos} strokeWidth="0.8" strokeDasharray="2,1" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: colorVentas, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 2, background: colorVentas, display: 'inline-block' }} /> Ventas
        </span>
        <span style={{ fontSize: 11, color: colorGastos, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 2, background: colorGastos, display: 'inline-block', borderTop: '1px dashed' }} /> Gastos
        </span>
      </div>
      {/* Etiquetas fechas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text2)' }}>{datos[0]?.label}</span>
        {datos.length > 2 && <span style={{ fontSize: 10, color: 'var(--text2)' }}>{datos[Math.floor(datos.length / 2)]?.label}</span>}
        <span style={{ fontSize: 10, color: 'var(--text2)' }}>{datos[datos.length - 1]?.label}</span>
      </div>
    </div>
  )
}

// ── Modal detalle de venta ───────────────────────────────────
function ModalDetalleVenta({ venta, onClose }) {
  const [detalle, setDetalle] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('ventasdetalle')
      .select('cantidad, precio, productos(nombre, unidad)')
      .eq('idventa', venta.idventa)
      .then(({ data }) => { setDetalle(data || []); setLoading(false) })
  }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <h3>Detalle venta #{venta.idventa}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
          <span style={{ color: 'var(--text2)' }}>{formatFechaHora(venta.fecha)}</span>
          <span style={{ color: 'var(--text2)' }}>{venta.clientes?.nombre || 'Consumidor final'}</span>
        </div>
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
              <tbody>
                {detalle.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{d.productos?.nombre || '—'}</td>
                    <td>{d.cantidad} {d.productos?.unidad || ''}</td>
                    <td>${parseFloat(d.precio).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>${(d.cantidad * parseFloat(d.precio)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>${parseFloat(venta.total).toFixed(2)}</span>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Reporte Ventas ───────────────────────────────────────────
function ReporteVentas() {
  const hoy = hoyEC()
  const [desde,      setDesde]      = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}) })
  const [hasta,      setHasta]      = useState(hoy)
  const [ventas,     setVentas]     = useState([])
  const [gastosDia,  setGastosDia]  = useState([])
  const [graficaDatos, setGraficaDatos] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [ventaSel,   setVentaSel]   = useState(null)

  useEffect(() => { fetchVentas() }, [desde, hasta])

  async function fetchVentas() {
    setLoading(true)
    const desdeISO = inicioDiaEC(desde)
    const hastaISO = finDiaEC(hasta)

    const [{ data: ventasData }, { data: gastosData }] = await Promise.all([
      supabase.from('ventas').select('*, clientes(nombre, telefono, correo, identificacion)')
        .eq('idempresa', ID_EMPRESA)
        .gte('fecha', desdeISO).lte('fecha', hastaISO)
        .order('fecha', { ascending: false }),
      supabase.from('gastos').select('monto, fecha')
        .eq('idempresa', ID_EMPRESA)
        .gte('fecha', desdeISO).lte('fecha', hastaISO),
    ])

    setVentas(ventasData || [])

    // Armar datos para gráfica por día
    const ventasPorDia = {}
    const gastosPorDia = {}
    ventasData?.forEach(v => {
      const dia = new Date(v.fecha).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + parseFloat(v.total)
    })
    gastosData?.forEach(g => {
      const dia = new Date(g.fecha).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
      gastosPorDia[dia] = (gastosPorDia[dia] || 0) + parseFloat(g.monto)
    })

    // Unir todos los días del rango
    const diasSet = new Set([...Object.keys(ventasPorDia), ...Object.keys(gastosPorDia)])
    const diasOrdenados = [...diasSet].sort()
    const grafica = diasOrdenados.map(dia => ({
      label: new Date(dia + 'T12:00:00').toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: 'short' }),
      ventas: ventasPorDia[dia] || 0,
      gastos: gastosPorDia[dia] || 0,
    }))

    setGraficaDatos(grafica)
    setLoading(false)
  }

  const atajo = (days) => {
    const h = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
    const d = new Date(); d.setDate(d.getDate() - days)
    const dStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
    setHasta(h); setDesde(dStr)
  }

  const totalVentas  = ventas.reduce((s, v) => s + parseFloat(v.total), 0)
  const ticketProm   = ventas.length > 0 ? totalVentas / ventas.length : 0

  return (
    <div>
      {ventaSel && <ModalDetalleVenta venta={ventaSel} onClose={() => setVentaSel(null)} />}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>DESDE</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['Hoy',0],['7 días',7],['15 días',15],['30 días',30],['90 días',90]].map(([l,d]) => (
            <button key={l} className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(d)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div className="cards-grid" style={{ marginBottom: 16 }}>
        <div className="metric-card" style={{ cursor: 'default' }}>
          <div className="metric-label">Total ventas</div>
          <div className="metric-value" style={{ color: 'var(--success)' }}>${totalVentas.toFixed(2)}</div>
          <div className="metric-sub">{ventas.length} transacciones</div>
        </div>
        <div className="metric-card" style={{ cursor: 'default' }}>
          <div className="metric-label">Ticket promedio</div>
          <div className="metric-value">${ticketProm.toFixed(2)}</div>
        </div>
      </div>

      {/* Gráfica */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">📈 Ventas vs Gastos por día</div>
        {loading ? <div className="loading">Cargando...</div> : <GraficaLinea datos={graficaDatos} />}
      </div>

      {/* Tabla ventas */}
      <div className="panel">
        <div className="panel-title">Listado de ventas</div>
        {loading ? <div className="loading">Cargando...</div> : ventas.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🧾</div>Sin ventas en este período</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Detalle</th></tr></thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.idventa}>
                    <td style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>#{v.idventa}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{formatFechaHora(v.fecha)}</td>
                    <td>
                      <p style={{ fontWeight: 500, fontSize: 13 }}>{v.clientes?.nombre || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>Consumidor final</span>}</p>
                      {v.clientes?.telefono && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{v.clientes.telefono}</p>}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>${parseFloat(v.total).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setVentaSel(v)}>
                        Ver detalle
                      </button>
                    </td>
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

// ── Reporte Inventario ───────────────────────────────────────
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
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Total invertido</div><div className="metric-value" style={{ color: 'var(--warn)' }}>${totalInvertido.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Movimientos</div><div className="metric-value">{movimientos.length}</div></div>
      </div>
      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : movimientos.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div>Sin movimientos</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Costo</th><th>Total</th></tr></thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.idmovimiento}>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{formatFecha(m.fecha)}</td>
                    <td style={{ fontWeight: 500 }}>{m.productos?.nombre || '—'}</td>
                    <td><span className={`badge ${m.tipo_movimiento === 'entrada' ? 'badge-success' : 'badge-warn'}`}>{m.tipo_movimiento === 'entrada' ? '📥' : '📤'} {m.tipo_movimiento}</span></td>
                    <td>{m.cantidad}</td>
                    <td>{m.precio_costo > 0 ? `$${parseFloat(m.precio_costo).toFixed(2)}` : '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--warn)' }}>{m.total_invertido > 0 ? `$${parseFloat(m.total_invertido).toFixed(2)}` : '—'}</td>
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

// ── Reporte Productos ────────────────────────────────────────
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Total productos</div><div className="metric-value">{productos.length}</div></div>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Valor inventario</div><div className="metric-value" style={{ color: 'var(--accent)' }}>${valorInventario.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Sin stock</div><div className="metric-value" style={{ color: 'var(--danger)' }}>{productos.filter(p => p.cantidad === 0).length}</div></div>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Stock bajo</div><div className="metric-value" style={{ color: 'var(--warn)' }}>{productos.filter(p => p.cantidad > 0 && p.cantidad <= 5).length}</div></div>
      </div>
      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Unidad</th><th>Precio</th><th>Valor total</th><th>Estado</th></tr></thead>
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

// ── Reporte Clientes ─────────────────────────────────────────
function ReporteClientes() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [clienteSel, setClienteSel] = useState(null)
  const [ventasCliente, setVentasCliente] = useState([])
  const [loadingVentas, setLoadingVentas] = useState(false)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    const { data: clientesData } = await supabase.from('clientes').select('*').eq('idempresa', ID_EMPRESA).order('nombre')
    const { data: ventasData }   = await supabase.from('ventas').select('idcliente, total, fecha').eq('idempresa', ID_EMPRESA)
    const totales = {}
    const fechas  = {}
    ventasData?.forEach(v => {
      if (!v.idcliente) return
      totales[v.idcliente] = (totales[v.idcliente] || 0) + parseFloat(v.total)
      if (!fechas[v.idcliente] || v.fecha < fechas[v.idcliente]) fechas[v.idcliente] = v.fecha
    })
    const resultado = (clientesData || []).map(c => ({
      ...c,
      totalComprado: totales[c.idcliente] || 0,
      numCompras:    ventasData?.filter(v => v.idcliente === c.idcliente).length || 0,
      primeraCompra: fechas[c.idcliente] || null,
    })).sort((a, b) => b.totalComprado - a.totalComprado)
    setClientes(resultado)
    setLoading(false)
  }

  async function verVentasCliente(cliente) {
    setClienteSel(cliente)
    setLoadingVentas(true)
    const { data } = await supabase.from('ventas').select('idventa, total, fecha')
      .eq('idcliente', cliente.idcliente).order('fecha', { ascending: false }).limit(20)
    setVentasCliente(data || [])
    setLoadingVentas(false)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Total clientes</div><div className="metric-value">{clientes.length}</div></div>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Con compras</div><div className="metric-value" style={{ color: 'var(--success)' }}>{clientes.filter(c => c.numCompras > 0).length}</div></div>
        <div className="metric-card" style={{ cursor: 'default' }}><div className="metric-label">Mejor cliente</div><div className="metric-value" style={{ fontSize: 15, color: 'var(--accent)' }}>{clientes[0]?.nombre?.split(' ')[0] || '—'}</div></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Ranking de clientes</div>
          {loading ? <div className="loading">Cargando...</div> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Nombre</th><th>Compras</th><th>Total</th><th>Desde</th><th></th></tr></thead>
                <tbody>
                  {clientes.map((c, i) => (
                    <tr key={c.idcliente} style={{ cursor: 'pointer' }} onClick={() => verVentasCliente(c)}>
                      <td style={{ color: 'var(--text2)' }}>{i + 1}</td>
                      <td>
                        <p style={{ fontWeight: 500, fontSize: 13 }}>{c.nombre}</p>
                        {c.telefono && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{c.telefono}</p>}
                        {c.correo && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{c.correo}</p>}
                        {c.identificacion && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{c.tipo_identificacion}: {c.identificacion}</p>}
                      </td>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.numCompras}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>${c.totalComprado.toFixed(2)}</td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{c.primeraCompra ? formatFecha(c.primeraCompra) : '—'}</td>
                      <td><span style={{ fontSize: 11, color: 'var(--accent)' }}>ver →</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detalle cliente seleccionado */}
        <div className="panel">
          {!clienteSel ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-icon">👆</div>
              <p>Toca un cliente para ver su historial</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{clienteSel.nombre}</p>
                {clienteSel.telefono && <p style={{ fontSize: 12, color: 'var(--text2)' }}>📞 {clienteSel.telefono}</p>}
                {clienteSel.correo && <p style={{ fontSize: 12, color: 'var(--text2)' }}>✉️ {clienteSel.correo}</p>}
                {clienteSel.direccion && <p style={{ fontSize: 12, color: 'var(--text2)' }}>📍 {clienteSel.direccion}</p>}
                {clienteSel.primeraCompra && <p style={{ fontSize: 12, color: 'var(--text2)' }}>Cliente desde: {formatFecha(clienteSel.primeraCompra)}</p>}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <span className="badge badge-accent">{clienteSel.numCompras} compras</span>
                  <span className="badge badge-success">${clienteSel.totalComprado.toFixed(2)} total</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Últimas compras:</p>
              {loadingVentas ? <div className="loading">Cargando...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ventasCliente.map(v => (
                    <div key={v.idventa} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{formatFechaHora(v.fecha)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>${parseFloat(v.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
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