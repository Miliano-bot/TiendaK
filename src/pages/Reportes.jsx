import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatFecha, formatFechaHora, hoyEC, inicioDiaEC, finDiaEC, isoADiaEC, labelDia, getRangoFechas } from '../utils/fecha'

const ID_EMPRESA = 1

function TabBtn({ active, onClick, children }) {
  return <button className={`btn ${active?'btn-primary':'btn-ghost'}`} style={{ fontSize:13 }} onClick={onClick}>{children}</button>
}

// ── Gráfica de línea ─────────────────────────────────────────
function GraficaLinea({ datos }) {
  if (!datos || datos.length === 0) return (
    <p style={{ color:'var(--text2)', fontSize:13, padding:'16px 0' }}>Sin datos para el período</p>
  )

  // 1 solo día → barras simples
  if (datos.length === 1) {
    const d   = datos[0]
    const max = Math.max(d.ventas, d.gastos, 0.01)
    return (
      <div>
        <p style={{ fontSize:12, color:'var(--text2)', marginBottom:12, textAlign:'center' }}>{d.label}</p>
        <div style={{ display:'flex', gap:24, justifyContent:'center', alignItems:'flex-end', height:120 }}>
          {[['Ventas', d.ventas, 'var(--success)'], ['Gastos', d.gastos, 'var(--danger)']].map(([lbl,val,col])=>(
            <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, width:80 }}>
              <span style={{ fontSize:14, fontWeight:700, color:col }}>${val.toFixed(2)}</span>
              <div style={{ width:'100%', background:col, borderRadius:'8px 8px 0 0', height:`${Math.max(8,(val/max)*90)}px`, opacity:0.85 }} />
              <span style={{ fontSize:12, color:'var(--text2)' }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Múltiples días → línea SVG
  const H    = 120
  const maxV = Math.max(...datos.map(d => d.ventas||0), 0.01)
  const maxG = Math.max(...datos.map(d => d.gastos||0), 0.01)
  const maxY = Math.max(maxV, maxG)
  const n    = datos.length
  const xs   = datos.map((_, i) => (i / (n-1)) * 100)

  function puntos(key) {
    return datos.map((d,i) => `${xs[i]},${H - ((d[key]||0)/maxY)*H}`).join(' ')
  }
  function area(key) {
    const pts = datos.map((d,i) => `${xs[i]},${H - ((d[key]||0)/maxY)*H}`)
    return `0,${H} ${pts.join(' ')} ${xs[n-1]},${H}`
  }

  return (
    <div>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ width:'100%', height:140, display:'block' }}>
        <polygon points={area('ventas')} fill="var(--success)" opacity="0.08" />
        <polyline points={puntos('ventas')} fill="none" stroke="var(--success)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polygon points={area('gastos')} fill="var(--danger)" opacity="0.08" />
        <polyline points={puntos('gastos')} fill="none" stroke="var(--danger)" strokeWidth="1" strokeDasharray="3,2" vectorEffect="non-scaling-stroke" />
        {/* Puntos */}
        {datos.map((d,i)=>(
          <g key={i}>
            <circle cx={xs[i]} cy={H-((d.ventas||0)/maxY)*H} r="1.2" fill="var(--success)" vectorEffect="non-scaling-stroke">
              <title>{d.label}: Ventas ${d.ventas.toFixed(2)}</title>
            </circle>
            <circle cx={xs[i]} cy={H-((d.gastos||0)/maxY)*H} r="1.2" fill="var(--danger)" vectorEffect="non-scaling-stroke">
              <title>{d.label}: Gastos ${d.gastos.toFixed(2)}</title>
            </circle>
          </g>
        ))}
      </svg>
      {/* Etiquetas eje X */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:10, color:'var(--text2)' }}>{datos[0]?.label}</span>
        {n > 4 && <span style={{ fontSize:10, color:'var(--text2)' }}>{datos[Math.floor(n/2)]?.label}</span>}
        <span style={{ fontSize:10, color:'var(--text2)' }}>{datos[n-1]?.label}</span>
      </div>
      {/* Leyenda */}
      <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:10 }}>
        <span style={{ fontSize:12, color:'var(--success)', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:16, height:2, background:'var(--success)', display:'inline-block' }} /> Ventas
        </span>
        <span style={{ fontSize:12, color:'var(--danger)', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:16, height:2, background:'var(--danger)', display:'inline-block', borderTop:'2px dashed var(--danger)' }} /> Gastos
        </span>
      </div>
    </div>
  )
}

// ── Modal detalle venta ──────────────────────────────────────
function ModalDetalleVenta({ venta, onClose }) {
  const [detalle, setDetalle] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('ventasdetalle').select('cantidad,precio,productos(nombre,unidad)').eq('idventa',venta.idventa)
      .then(({data})=>{ setDetalle(data||[]); setLoading(false) })
  }, [])
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <h3>Venta #{venta.idventa}</h3>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, fontSize:13 }}>
          <span style={{ color:'var(--text2)' }}>{formatFechaHora(venta.fecha)}</span>
          <span style={{ color:'var(--text2)' }}>{venta.clientes?.nombre||'Consumidor final'}</span>
        </div>
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
              <tbody>
                {detalle.map((d,i)=>(
                  <tr key={i}>
                    <td style={{ fontWeight:500 }}>{d.productos?.nombre||'—'}</td>
                    <td>{d.cantidad} {d.productos?.unidad||''}</td>
                    <td>${parseFloat(d.precio).toFixed(2)}</td>
                    <td style={{ fontWeight:600 }}>${(d.cantidad*parseFloat(d.precio)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:14, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
          <span style={{ fontWeight:600 }}>Total</span>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--success)' }}>${parseFloat(venta.total).toFixed(2)}</span>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}

// ── Reporte Ventas ───────────────────────────────────────────
function ReporteVentas() {
  const [periodo,      setPeriodo]      = useState('mes')
  const [ventas,       setVentas]       = useState([])
  const [graficaDatos, setGraficaDatos] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [ventaSel,     setVentaSel]     = useState(null)

  useEffect(() => { fetchVentas() }, [periodo])

  async function fetchVentas() {
    setLoading(true)
    const { desde, hasta } = getRangoFechas(periodo)

    let qV = supabase.from('ventas').select('*,clientes(nombre,telefono,correo,identificacion,tipo_identificacion)').eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false})
    let qG = supabase.from('gastos').select('monto,fecha').eq('idempresa',ID_EMPRESA)

    if (desde) {
      qV = qV.gte('fecha',desde).lte('fecha',hasta)
      qG = qG.gte('fecha',desde).lte('fecha',hasta)
    }

    const [{data:ventasData},{data:gastosData}] = await Promise.all([qV, qG])
    setVentas(ventasData||[])

    // Agrupar por día usando isoADiaEC para no restar días
    const vPorDia={}, gPorDia={}
    ventasData?.forEach(v => { const d=isoADiaEC(v.fecha); vPorDia[d]=(vPorDia[d]||0)+parseFloat(v.total) })
    gastosData?.forEach(g => { const d=isoADiaEC(g.fecha); gPorDia[d]=(gPorDia[d]||0)+parseFloat(g.monto) })

    const diasSet = new Set([...Object.keys(vPorDia),...Object.keys(gPorDia)])
    const grafica = [...diasSet].sort().map(dia=>({
      label:  labelDia(dia),
      ventas: vPorDia[dia]||0,
      gastos: gPorDia[dia]||0,
    }))
    setGraficaDatos(grafica)
    setLoading(false)
  }

  const periodos = [
    {id:'hoy',    label:'Hoy'},
    {id:'semana', label:'Esta semana'},
    {id:'mes',    label:'Este mes'},
    {id:'anio',   label:'Este año'},
    {id:'total',  label:'Todo'},
  ]

  const totalVentas = ventas.reduce((s,v)=>s+parseFloat(v.total),0)
  const ticketProm  = ventas.length>0 ? totalVentas/ventas.length : 0

  return (
    <div>
      {ventaSel && <ModalDetalleVenta venta={ventaSel} onClose={()=>setVentaSel(null)} />}

      {/* Selector período */}
      <div style={{ display:'flex',gap:0,marginBottom:16,background:'var(--bg2)',borderRadius:10,padding:4,border:'1px solid var(--border)' }}>
        {periodos.map(p=>(
          <button key={p.id} onClick={()=>setPeriodo(p.id)} style={{
            flex:1, padding:'7px 2px', borderRadius:8, border:'none', cursor:'pointer',
            fontSize:10, fontWeight:500,
            background: periodo===p.id?'var(--accent)':'transparent',
            color:      periodo===p.id?'#fff':'var(--text2)',
            transition: 'all 0.2s',
          }}>{p.label}</button>
        ))}
      </div>

      <div className="cards-grid" style={{ marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}>
          <div className="metric-label">Total ventas</div>
          <div className="metric-value" style={{ color:'var(--success)' }}>${totalVentas.toFixed(2)}</div>
          <div className="metric-sub">{ventas.length} transacciones</div>
        </div>
        <div className="metric-card" style={{ cursor:'default' }}>
          <div className="metric-label">Ticket promedio</div>
          <div className="metric-value">${ticketProm.toFixed(2)}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom:16 }}>
        <div className="panel-title">📈 Ventas vs Gastos</div>
        {loading ? <div className="loading">Cargando...</div> : <GraficaLinea datos={graficaDatos} />}
      </div>

      <div className="panel">
        <div className="panel-title">Listado de ventas</div>
        {loading ? <div className="loading">Cargando...</div> : ventas.length===0 ? (
          <div className="empty-state"><div className="empty-icon">🧾</div>Sin ventas en este período</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {ventas.map(v=>(
                  <tr key={v.idventa}>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>#{v.idventa}</td>
                    <td style={{ color:'var(--text2)', fontSize:12 }}>{formatFechaHora(v.fecha)}</td>
                    <td>
                      <p style={{ fontWeight:500, fontSize:13 }}>{v.clientes?.nombre||<span style={{ color:'var(--text2)', fontStyle:'italic' }}>Consumidor final</span>}</p>
                      {v.clientes?.telefono&&<p style={{ fontSize:11, color:'var(--text2)' }}>{v.clientes.telefono}</p>}
                    </td>
                    <td style={{ fontWeight:600, color:'var(--success)' }}>${parseFloat(v.total).toFixed(2)}</td>
                    <td><button className="btn btn-ghost" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>setVentaSel(v)}>Ver detalle</button></td>
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
  const [buscar,      setBuscar]      = useState('')
  const [desde,       setDesde]       = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}) })
  const [hasta,       setHasta]       = useState(hoyEC)

  useEffect(() => { fetchMovimientos() }, [tipo, desde, hasta])

  async function fetchMovimientos() {
    setLoading(true)
    let q = supabase.from('inventariohistorico')
      .select('*,productos(nombre,unidad),proveedores(nombre)')
      .eq('idempresa',ID_EMPRESA)
      .gte('fecha', inicioDiaEC(desde))
      .lte('fecha', finDiaEC(hasta))
      .order('fecha',{ascending:false})
      .limit(200)
    if (tipo!=='todos') q = q.eq('tipo_movimiento',tipo)
    const{data}=await q
    setMovimientos(data||[])
    setLoading(false)
  }

  const atajo = (days) => {
    const h = hoyEC()
    const d = new Date(); d.setDate(d.getDate()-days)
    setHasta(h); setDesde(d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}))
  }

  // Filtro local por nombre de producto
  const filtrados = buscar.trim()
    ? movimientos.filter(m => m.productos?.nombre?.toLowerCase().includes(buscar.toLowerCase()))
    : movimientos

  const totalInvertido = filtrados.filter(m=>m.tipo_movimiento==='entrada').reduce((s,m)=>s+parseFloat(m.total_invertido||0),0)

  return (
    <div>
      {/* Filtros tipo */}
      <div style={{ display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' }}>
        {['todos','entrada','salida'].map(t=>(
          <button key={t} className={`btn ${tipo===t?'btn-primary':'btn-ghost'}`} style={{ fontSize:12 }} onClick={()=>setTipo(t)}>
            {t==='todos'?'Todos':t==='entrada'?'📥 Entradas':'📤 Salidas'}
          </button>
        ))}
      </div>

      {/* Filtros fecha */}
      <div style={{ display:'flex',gap:10,marginBottom:12,flexWrap:'wrap',alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11,color:'var(--text2)',display:'block',marginBottom:4 }}>DESDE</label>
          <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{ padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }} />
        </div>
        <div>
          <label style={{ fontSize:11,color:'var(--text2)',display:'block',marginBottom:4 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{ padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }} />
        </div>
        <div style={{ display:'flex',gap:6 }}>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>atajo(0)}>Hoy</button>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>atajo(7)}>7d</button>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>atajo(30)}>30d</button>
        </div>
      </div>

      {/* Buscar por producto */}
      <div style={{ marginBottom:14 }}>
        <input className="search-input" placeholder="🔍 Buscar por nombre de producto..." value={buscar} onChange={e=>setBuscar(e.target.value)} />
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Total invertido</div><div className="metric-value" style={{ color:'var(--warn)' }}>${totalInvertido.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Movimientos</div><div className="metric-value">{filtrados.length}</div></div>
      </div>

      <div className="panel">
        {loading?<div className="loading">Cargando...</div>:filtrados.length===0?(
          <div className="empty-state"><div className="empty-icon">📦</div>Sin movimientos</div>
        ):(
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Costo</th><th>Total</th><th>Proveedor</th><th>Nota</th></tr></thead>
              <tbody>
                {filtrados.map(m=>(
                  <tr key={m.idmovimiento}>
                    <td style={{ fontSize:12,color:'var(--text2)',whiteSpace:'nowrap' }}>{formatFecha(m.fecha)}</td>
                    <td style={{ fontWeight:500 }}>{m.productos?.nombre||'—'}</td>
                    <td><span className={`badge ${m.tipo_movimiento==='entrada'?'badge-success':'badge-warn'}`}>{m.tipo_movimiento==='entrada'?'📥':'📤'} {m.tipo_movimiento}</span></td>
                    <td>{m.cantidad} {m.productos?.unidad||''}</td>
                    <td>{m.precio_costo>0?`$${parseFloat(m.precio_costo).toFixed(2)}`:'—'}</td>
                    <td style={{ fontWeight:600,color:'var(--warn)' }}>{m.total_invertido>0?`$${parseFloat(m.total_invertido).toFixed(2)}`:'—'}</td>
                    <td style={{ color:'var(--text2)',fontSize:12 }}>{m.proveedores?.nombre||'—'}</td>
                    <td style={{ color:'var(--text2)',fontSize:12 }}>{m.nota||'—'}</td>
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
  const [productos,setProductos]=useState([]); const [loading,setLoading]=useState(true); const [buscar,setBuscar]=useState('')
  useEffect(()=>{
    supabase.from('productos').select('*,categorias!productos_idcategoria_fkey(nombre)').eq('idempresa',ID_EMPRESA).order('cantidad',{ascending:true})
      .then(({data})=>{ setProductos(data||[]); setLoading(false) })
  },[])
  const filtrados = buscar.trim() ? productos.filter(p=>p.nombre.toLowerCase().includes(buscar.toLowerCase())) : productos
  const valorInventario=filtrados.reduce((s,p)=>s+parseFloat(p.precio)*p.cantidad,0)
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:14 }}>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Total productos</div><div className="metric-value">{productos.length}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Valor inventario</div><div className="metric-value" style={{ color:'var(--accent)' }}>${valorInventario.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Sin stock</div><div className="metric-value" style={{ color:'var(--danger)' }}>{productos.filter(p=>p.cantidad===0).length}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Stock bajo</div><div className="metric-value" style={{ color:'var(--warn)' }}>{productos.filter(p=>p.cantidad>0&&p.stock_minimo>0&&p.cantidad<=p.stock_minimo).length}</div></div>
      </div>
      <div style={{ marginBottom:12 }}>
        <input className="search-input" placeholder="🔍 Buscar producto..." value={buscar} onChange={e=>setBuscar(e.target.value)} />
      </div>
      <div className="panel">
        {loading?<div className="loading">Cargando...</div>:(
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Unidad</th><th>Precio</th><th>Valor total</th><th>Estado</th></tr></thead>
              <tbody>
                {filtrados.map(p=>(
                  <tr key={p.idproducto}>
                    <td style={{ fontWeight:500 }}>{p.nombre}</td>
                    <td style={{ color:'var(--text2)' }}>{p.categorias?.nombre||'—'}</td>
                    <td>{p.cantidad===0?<span className="badge badge-danger">0</span>:p.stock_minimo>0&&p.cantidad<=p.stock_minimo?<span className="badge badge-warn">{p.cantidad}</span>:<span style={{ fontWeight:600 }}>{p.cantidad}</span>}</td>
                    <td style={{ color:'var(--text2)' }}>{p.unidad||'Unidad'}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td style={{ fontWeight:600 }}>${(parseFloat(p.precio)*p.cantidad).toFixed(2)}</td>
                    <td><span className={`badge ${p.discontinuado?'badge-danger':'badge-success'}`}>{p.discontinuado?'Discontinuado':'Activo'}</span></td>
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
  const [clientes,setClientes]=useState([]); const [loading,setLoading]=useState(true)
  const [clienteSel,setClienteSel]=useState(null); const [ventasCliente,setVentasCliente]=useState([]); const [loadingV,setLoadingV]=useState(false)

  useEffect(()=>{ fetchClientes() },[])

  async function fetchClientes() {
    const [{data:cd},{data:vd}]=await Promise.all([
      supabase.from('clientes').select('*').eq('idempresa',ID_EMPRESA).order('nombre'),
      supabase.from('ventas').select('idcliente,total,fecha').eq('idempresa',ID_EMPRESA),
    ])
    const totales={}, fechas={}
    vd?.forEach(v=>{ if(!v.idcliente) return; totales[v.idcliente]=(totales[v.idcliente]||0)+parseFloat(v.total); if(!fechas[v.idcliente]||v.fecha<fechas[v.idcliente]) fechas[v.idcliente]=v.fecha })
    setClientes((cd||[]).map(c=>({ ...c, totalComprado:totales[c.idcliente]||0, numCompras:vd?.filter(v=>v.idcliente===c.idcliente).length||0, primeraCompra:fechas[c.idcliente]||null })).sort((a,b)=>b.totalComprado-a.totalComprado))
    setLoading(false)
  }

  async function verVentas(cliente) {
    setClienteSel(cliente); setLoadingV(true)
    const{data}=await supabase.from('ventas').select('idventa,total,fecha').eq('idcliente',cliente.idcliente).order('fecha',{ascending:false}).limit(20)
    setVentasCliente(data||[]); setLoadingV(false)
  }

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Total clientes</div><div className="metric-value">{clientes.length}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Con compras</div><div className="metric-value" style={{ color:'var(--success)' }}>{clientes.filter(c=>c.numCompras>0).length}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Mejor cliente</div><div className="metric-value" style={{ fontSize:15,color:'var(--accent)' }}>{clientes[0]?.nombre?.split(' ')[0]||'—'}</div></div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Ranking de clientes</div>
          {loading?<div className="loading">Cargando...</div>:(
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Nombre</th><th>Compras</th><th>Total</th><th>Desde</th><th></th></tr></thead>
                <tbody>
                  {clientes.map((c,i)=>(
                    <tr key={c.idcliente} style={{ cursor:'pointer' }} onClick={()=>verVentas(c)}>
                      <td style={{ color:'var(--text2)' }}>{i+1}</td>
                      <td>
                        <p style={{ fontWeight:500,fontSize:13 }}>{c.nombre}</p>
                        {c.telefono&&<p style={{ fontSize:11,color:'var(--text2)' }}>{c.telefono}</p>}
                        {c.correo&&<p style={{ fontSize:11,color:'var(--text2)' }}>{c.correo}</p>}
                        {c.identificacion&&<p style={{ fontSize:11,color:'var(--text2)' }}>{c.tipo_identificacion}: {c.identificacion}</p>}
                      </td>
                      <td style={{ color:'var(--accent)',fontWeight:600 }}>{c.numCompras}</td>
                      <td style={{ fontWeight:700,color:'var(--success)' }}>${c.totalComprado.toFixed(2)}</td>
                      <td style={{ fontSize:11,color:'var(--text2)' }}>{c.primeraCompra?formatFecha(c.primeraCompra):'—'}</td>
                      <td><span style={{ fontSize:11,color:'var(--accent)' }}>ver →</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="panel">
          {!clienteSel?(
            <div className="empty-state" style={{ padding:24 }}><div className="empty-icon">👆</div><p>Toca un cliente para ver su historial</p></div>
          ):(
            <div>
              <p style={{ fontWeight:600,fontSize:15,marginBottom:8 }}>{clienteSel.nombre}</p>
              {clienteSel.telefono&&<p style={{ fontSize:12,color:'var(--text2)',marginBottom:4 }}>📞 {clienteSel.telefono}</p>}
              {clienteSel.correo&&<p style={{ fontSize:12,color:'var(--text2)',marginBottom:4 }}>✉️ {clienteSel.correo}</p>}
              {clienteSel.direccion&&<p style={{ fontSize:12,color:'var(--text2)',marginBottom:4 }}>📍 {clienteSel.direccion}</p>}
              {clienteSel.identificacion&&<p style={{ fontSize:12,color:'var(--text2)',marginBottom:4 }}>{clienteSel.tipo_identificacion}: {clienteSel.identificacion}</p>}
              {clienteSel.primeraCompra&&<p style={{ fontSize:12,color:'var(--text2)',marginBottom:8 }}>Cliente desde: {formatFecha(clienteSel.primeraCompra)}</p>}
              <div style={{ display:'flex',gap:8,marginBottom:14 }}>
                <span className="badge badge-accent">{clienteSel.numCompras} compras</span>
                <span className="badge badge-success">${clienteSel.totalComprado.toFixed(2)} total</span>
              </div>
              <p style={{ fontSize:12,color:'var(--text2)',marginBottom:8 }}>Historial de compras:</p>
              {loadingV?<div className="loading">Cargando...</div>:(
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {ventasCliente.map(v=>(
                    <div key={v.idventa} style={{ display:'flex',justifyContent:'space-between',padding:'8px 10px',background:'var(--bg3)',borderRadius:8 }}>
                      <span style={{ fontSize:12,color:'var(--text2)' }}>{formatFechaHora(v.fecha)}</span>
                      <span style={{ fontSize:13,fontWeight:600,color:'var(--success)' }}>${parseFloat(v.total).toFixed(2)}</span>
                    </div>
                  ))}
                  {ventasCliente.length===0&&<p style={{ fontSize:13,color:'var(--text2)' }}>Sin compras registradas</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Reportes() {
  const [tab,setTab]=useState('ventas')
  const tabs=[{id:'ventas',label:'🧾 Ventas'},{id:'inventario',label:'📦 Inventario'},{id:'productos',label:'🏷️ Productos'},{id:'clientes',label:'👥 Clientes'}]
  return (
    <div>
      <div style={{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' }}>
        {tabs.map(t=><TabBtn key={t.id} active={tab===t.id} onClick={()=>setTab(t.id)}>{t.label}</TabBtn>)}
      </div>
      {tab==='ventas'     && <ReporteVentas />}
      {tab==='inventario' && <ReporteInventario />}
      {tab==='productos'  && <ReporteProductos />}
      {tab==='clientes'   && <ReporteClientes />}
    </div>
  )
}