import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatFecha, formatFechaHora, hoyEC, inicioDiaEC, finDiaEC } from '../utils/fecha'

const ID_EMPRESA = 1

function TabBtn({ active, onClick, children }) {
  return <button className={`btn ${active?'btn-primary':'btn-ghost'}`} style={{ fontSize:13 }} onClick={onClick}>{children}</button>
}

// ── Gráfica de barras por día ────────────────────────────────
function GraficaBarras({ datos }) {
  if (!datos || datos.length === 0) return <p style={{ color:'var(--text2)', fontSize:13, padding:'16px 0' }}>Sin datos para el período seleccionado</p>

  const maxVal = Math.max(...datos.map(d => Math.max(d.ventas||0, d.gastos||0)), 0.01)

  return (
    <div style={{ overflowX:'auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, minWidth: Math.max(datos.length * 48, 300), height:160, padding:'0 4px' }}>
        {datos.map((d, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, height:'100%', justifyContent:'flex-end' }}>
            <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:130 }}>
              {/* Barra ventas */}
              <div style={{ flex:1, background:'var(--success)', borderRadius:'4px 4px 0 0', opacity:0.85, height:`${Math.max(2,(d.ventas/maxVal)*100)}%`, minHeight: d.ventas>0?4:0, transition:'height 0.4s ease' }} title={`Ventas: $${(d.ventas||0).toFixed(2)}`} />
              {/* Barra gastos */}
              <div style={{ flex:1, background:'var(--danger)', borderRadius:'4px 4px 0 0', opacity:0.75, height:`${Math.max(2,(d.gastos/maxVal)*100)}%`, minHeight: d.gastos>0?4:0, transition:'height 0.4s ease' }} title={`Gastos: $${(d.gastos||0).toFixed(2)}`} />
            </div>
            <span style={{ fontSize:9, color:'var(--text2)', whiteSpace:'nowrap', transform:'rotate(-35deg)', transformOrigin:'top center', marginTop:4 }}>{d.label}</span>
          </div>
        ))}
      </div>
      {/* Leyenda */}
      <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:20 }}>
        <span style={{ fontSize:12, color:'var(--success)', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:12, height:12, background:'var(--success)', borderRadius:2, display:'inline-block' }} /> Ventas
        </span>
        <span style={{ fontSize:12, color:'var(--danger)', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:12, height:12, background:'var(--danger)', borderRadius:2, display:'inline-block' }} /> Gastos
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
  const hoy = hoyEC()
  const [desde,        setDesde]        = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}) })
  const [hasta,        setHasta]        = useState(hoy)
  const [ventas,       setVentas]       = useState([])
  const [graficaDatos, setGraficaDatos] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [ventaSel,     setVentaSel]     = useState(null)

  useEffect(() => { fetchVentas() }, [desde, hasta])

  async function fetchVentas() {
    setLoading(true)
    const desdeISO = inicioDiaEC(desde)
    const hastaISO = finDiaEC(hasta)

    const [{data:ventasData},{data:gastosData}] = await Promise.all([
      supabase.from('ventas').select('*,clientes(nombre,telefono,correo,identificacion,tipo_identificacion)')
        .eq('idempresa',ID_EMPRESA).gte('fecha',desdeISO).lte('fecha',hastaISO).order('fecha',{ascending:false}),
      supabase.from('gastos').select('monto,fecha').eq('idempresa',ID_EMPRESA).gte('fecha',desdeISO).lte('fecha',hastaISO),
    ])

    setVentas(ventasData||[])

    // Agrupar por día
    const ventasPorDia={}, gastosPorDia={}
ventasData?.forEach(v => {
  const dia = v.fecha.split('T')[0]
  ventasPorDia[dia]=(ventasPorDia[dia]||0)+parseFloat(v.total)
})

gastosData?.forEach(g => {
  const dia = g.fecha.split('T')[0]
  gastosPorDia[dia]=(gastosPorDia[dia]||0)+parseFloat(g.monto)
})

    const diasSet=new Set([...Object.keys(ventasPorDia),...Object.keys(gastosPorDia)])
    const grafica=[...diasSet].sort().map(dia=>({
      label: new Date(dia+'T12:00:00').toLocaleDateString('es-EC',{timeZone:'America/Guayaquil',day:'2-digit',month:'short'}),
      ventas: ventasPorDia[dia]||0,
      gastos: gastosPorDia[dia]||0,
    }))
    setGraficaDatos(grafica)
    setLoading(false)
  }

  const atajo=(days)=>{
    const h=hoyEC()
    const d=new Date(); d.setDate(d.getDate()-days)
    setHasta(h); setDesde(d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}))
  }

  const totalVentas = ventas.reduce((s,v)=>s+parseFloat(v.total),0)
  const ticketProm  = ventas.length>0 ? totalVentas/ventas.length : 0

  return (
    <div>
      {ventaSel && <ModalDetalleVenta venta={ventaSel} onClose={()=>setVentaSel(null)} />}

      {/* Filtros */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>DESDE</label>
          <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{ padding:'8px 10px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none' }} />
        </div>
        <div>
          <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{ padding:'8px 10px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none' }} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[['Hoy',0],['7d',7],['15d',15],['30d',30],['90d',90]].map(([l,d])=>(
            <button key={l} className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>atajo(d)}>{l}</button>
          ))}
        </div>
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

      {/* Gráfica de barras */}
      <div className="panel" style={{ marginBottom:16 }}>
        <div className="panel-title">📊 Ventas vs Gastos por día</div>
        {loading ? <div className="loading">Cargando...</div> : <GraficaBarras datos={graficaDatos} />}
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
  const [movimientos,setMovimientos]=useState([]); const [loading,setLoading]=useState(true); const [tipo,setTipo]=useState('todos')
  useEffect(()=>{fetchMovimientos()},[tipo])
  async function fetchMovimientos() {
    setLoading(true)
    let q=supabase.from('inventariohistorico').select('*,productos(nombre)').eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false}).limit(100)
    if(tipo!=='todos') q=q.eq('tipo_movimiento',tipo)
    const{data}=await q; setMovimientos(data||[]); setLoading(false)
  }
  const totalInvertido=movimientos.filter(m=>m.tipo_movimiento==='entrada').reduce((s,m)=>s+parseFloat(m.total_invertido||0),0)
  return (
    <div>
      <div style={{ display:'flex',gap:8,marginBottom:16 }}>
        {['todos','entrada','salida'].map(t=>(
          <button key={t} className={`btn ${tipo===t?'btn-primary':'btn-ghost'}`} style={{ fontSize:13 }} onClick={()=>setTipo(t)}>
            {t==='todos'?'Todos':t==='entrada'?'📥 Entradas':'📤 Salidas'}
          </button>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Total invertido</div><div className="metric-value" style={{ color:'var(--warn)' }}>${totalInvertido.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Movimientos</div><div className="metric-value">{movimientos.length}</div></div>
      </div>
      <div className="panel">
        {loading?<div className="loading">Cargando...</div>:movimientos.length===0?(
          <div className="empty-state"><div className="empty-icon">📦</div>Sin movimientos</div>
        ):(
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Costo</th><th>Total</th></tr></thead>
              <tbody>
                {movimientos.map(m=>(
                  <tr key={m.idmovimiento}>
                    <td style={{ fontSize:12,color:'var(--text2)' }}>{formatFecha(m.fecha)}</td>
                    <td style={{ fontWeight:500 }}>{m.productos?.nombre||'—'}</td>
                    <td><span className={`badge ${m.tipo_movimiento==='entrada'?'badge-success':'badge-warn'}`}>{m.tipo_movimiento==='entrada'?'📥':'📤'} {m.tipo_movimiento}</span></td>
                    <td>{m.cantidad}</td>
                    <td>{m.precio_costo>0?`$${parseFloat(m.precio_costo).toFixed(2)}`:'—'}</td>
                    <td style={{ fontWeight:600,color:'var(--warn)' }}>{m.total_invertido>0?`$${parseFloat(m.total_invertido).toFixed(2)}`:'—'}</td>
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
  const [productos,setProductos]=useState([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{
    supabase.from('productos').select('*,categorias!productos_idcategoria_fkey(nombre)').eq('idempresa',ID_EMPRESA).order('cantidad',{ascending:true})
      .then(({data})=>{ setProductos(data||[]); setLoading(false) })
  },[])
  const valorInventario=productos.reduce((s,p)=>s+parseFloat(p.precio)*p.cantidad,0)
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Total productos</div><div className="metric-value">{productos.length}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Valor inventario</div><div className="metric-value" style={{ color:'var(--accent)' }}>${valorInventario.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Sin stock</div><div className="metric-value" style={{ color:'var(--danger)' }}>{productos.filter(p=>p.cantidad===0).length}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Stock bajo</div><div className="metric-value" style={{ color:'var(--warn)' }}>{productos.filter(p=>p.cantidad>0&&p.stock_minimo>0&&p.cantidad<=p.stock_minimo).length}</div></div>
      </div>
      <div className="panel">
        {loading?<div className="loading">Cargando...</div>:(
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Unidad</th><th>Precio</th><th>Valor total</th><th>Estado</th></tr></thead>
              <tbody>
                {productos.map(p=>(
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
            <div className="empty-state" style={{ padding:24 }}>
              <div className="empty-icon">👆</div>
              <p>Toca un cliente para ver su historial</p>
            </div>
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