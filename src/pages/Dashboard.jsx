import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

function StatCard({ icon, label, value, sub, color, onClick, trend }) {
  return (
    <div className="metric-card" onClick={onClick} style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize:11, fontWeight:600, color: trend >= 0 ? 'var(--success)' : 'var(--danger)', background: trend >= 0 ? 'rgba(76,175,135,0.12)' : 'rgba(224,82,82,0.12)', padding:'2px 8px', borderRadius:20 }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <div style={{ fontSize:24, fontWeight:700, color: color || 'var(--text)', marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--text2)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{sub}</div>}
      {onClick && <div style={{ position:'absolute', bottom:10, right:12, fontSize:10, color:'var(--text2)', opacity:0.6 }}>ver más →</div>}
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  useEffect(() => { fetchStats() }, [periodo])

  async function fetchStats() {
    setLoading(true)
    const ahora = new Date()
    let fechaDesde = null
    if (periodo === 'hoy')    fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
    if (periodo === 'semana') { const d = new Date(ahora); d.setDate(d.getDate()-7);  fechaDesde = d.toISOString() }
    if (periodo === 'mes')    { const d = new Date(ahora); d.setDate(d.getDate()-30); fechaDesde = d.toISOString() }

    let qV = supabase.from('ventas').select('total,fecha').eq('idempresa', ID_EMPRESA)
    if (fechaDesde) qV = qV.gte('fecha', fechaDesde)
    const { data: ventas } = await qV

    let qI = supabase.from('inventariohistorico').select('total_invertido').eq('idempresa', ID_EMPRESA).eq('tipo_movimiento','entrada')
    if (fechaDesde) qI = qI.gte('fecha', fechaDesde)
    const { data: entradas } = await qI

    const [
      { count: totalProds },
      { count: stockBajo  },
      { count: sinStock   },
      { count: totalCli   },
      { data: detalle     },
      { data: ultimasV    },
    ] = await Promise.all([
      supabase.from('productos').select('*',{count:'exact',head:true}).eq('idempresa',ID_EMPRESA).eq('discontinuado',false),
      supabase.from('productos').select('*',{count:'exact',head:true}).eq('idempresa',ID_EMPRESA).eq('discontinuado',false).lte('cantidad',5).gt('cantidad',0),
      supabase.from('productos').select('*',{count:'exact',head:true}).eq('idempresa',ID_EMPRESA).eq('discontinuado',false).eq('cantidad',0),
      supabase.from('clientes').select('*',{count:'exact',head:true}).eq('idempresa',ID_EMPRESA),
      supabase.from('ventasdetalle').select('idproducto,cantidad,precio,productos(nombre)').limit(300),
      supabase.from('ventas').select('idventa,total,fecha,clientes(nombre)').eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false}).limit(6),
    ])

    const totalVentas   = ventas?.reduce((s,v) => s + parseFloat(v.total), 0) || 0
    const cantVentas    = ventas?.length || 0
    const totalInv      = entradas?.reduce((s,e) => s + parseFloat(e.total_invertido||0), 0) || 0
    const ganancia      = totalVentas - totalInv
    const ticketProm    = cantVentas > 0 ? totalVentas / cantVentas : 0

    const topMap = {}
    detalle?.forEach(d => {
      const id = d.idproducto
      if (!topMap[id]) topMap[id] = { nombre: d.productos?.nombre||'?', cantidad:0, total:0 }
      topMap[id].cantidad += d.cantidad
      topMap[id].total    += d.cantidad * parseFloat(d.precio)
    })
    const topProductos = Object.values(topMap).sort((a,b) => b.cantidad-a.cantidad).slice(0,5)

    setStats({ totalVentas, cantVentas, totalInv, ganancia, ticketProm, totalProds, stockBajo, sinStock, totalCli, topProductos, ultimasVentas: ultimasV||[] })
    setLoading(false)
  }

  const periodos = [{id:'hoy',label:'Hoy'},{id:'semana',label:'7 días'},{id:'mes',label:'30 días'},{id:'total',label:'Todo'}]

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
      <div style={{ fontSize:40 }}>📊</div>
      <p style={{ color:'var(--text2)', fontSize:14 }}>Cargando estadísticas...</p>
    </div>
  )

  const s = stats
  const maxTop = s.topProductos[0]?.cantidad || 1
  const colors = ['#6c63ff','#ff6584','#4caf87','#f5a623','#60b8e0']

  return (
    <div>
      {/* Selector período */}
      <div style={{ display:'flex', gap:6, marginBottom:16, background:'var(--bg2)', borderRadius:10, padding:4, border:'1px solid var(--border)' }}>
        {periodos.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
            flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500,
            background: periodo === p.id ? 'var(--accent)' : 'transparent',
            color: periodo === p.id ? '#fff' : 'var(--text2)',
            transition:'all 0.2s',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Tarjetas financieras */}
      <div className="cards-grid" style={{ marginBottom:12 }}>
        <StatCard icon="💰" label="Ventas" value={`$${s.totalVentas.toFixed(2)}`} sub={`${s.cantVentas} transacciones`} color="var(--accent)" onClick={() => onNavigate('reportes')} trend={s.cantVentas > 0 ? 5 : undefined} />
        <StatCard icon="📈" label="Ganancia" value={`$${s.ganancia.toFixed(2)}`} sub={`Inversión: $${s.totalInv.toFixed(2)}`} color={s.ganancia >= 0 ? 'var(--success)' : 'var(--danger)'} onClick={() => onNavigate('reportes')} />
      </div>

      <div className="cards-grid" style={{ marginBottom:16 }}>
        <StatCard icon="🧾" label="Ticket promedio" value={`$${s.ticketProm.toFixed(2)}`} color="var(--warn)" />
        <StatCard icon="👥" label="Clientes" value={s.totalCli||0} sub="registrados" color="#60b8e0" onClick={() => onNavigate('clientes')} />
      </div>

      {/* Alertas de stock */}
      {(s.sinStock > 0 || s.stockBajo > 0) && (
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          {s.sinStock > 0 && (
            <div onClick={() => onNavigate('productos')} style={{ flex:1, minWidth:140, background:'rgba(224,82,82,0.1)', border:'1px solid rgba(224,82,82,0.3)', borderRadius:10, padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:24 }}>🚨</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--danger)' }}>{s.sinStock} sin stock</p>
                <p style={{ fontSize:11, color:'var(--text2)' }}>toca para ver</p>
              </div>
            </div>
          )}
          {s.stockBajo > 0 && (
            <div onClick={() => onNavigate('bodega')} style={{ flex:1, minWidth:140, background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.3)', borderRadius:10, padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:24 }}>⚠️</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--warn)' }}>{s.stockBajo} stock bajo</p>
                <p style={{ fontSize:11, color:'var(--text2)' }}>toca para reabastecer</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="two-col">
        {/* Top productos */}
        <div className="panel">
          <div className="panel-title">🏆 Más vendidos</div>
          {s.topProductos.length === 0
            ? <p style={{ color:'var(--text2)', fontSize:13 }}>Sin ventas aún</p>
            : s.topProductos.map((p,i) => (
              <div className="bar-row" key={i}>
                <span style={{ width:16, color:'var(--text2)', fontSize:11, flexShrink:0 }}>{i+1}</span>
                <span className="bar-label">{p.nombre.substring(0,12)}{p.nombre.length>12?'…':''}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width:`${Math.max(5,(p.cantidad/maxTop)*100)}%`, background: colors[i] }} /></div>
                <span className="bar-val">{p.cantidad}</span>
              </div>
            ))
          }
        </div>

        {/* Últimas ventas */}
        <div className="panel">
          <div className="panel-title">🧾 Últimas ventas</div>
          <div className="recent-list">
            {s.ultimasVentas.length === 0
              ? <p style={{ color:'var(--text2)', fontSize:13 }}>Sin ventas aún</p>
              : s.ultimasVentas.map((v,i) => (
                <div className="recent-item" key={i}>
                  <div className="ri-icon" style={{ background:`${colors[i%5]}22`, color:colors[i%5] }}>🧾</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="ri-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.clientes?.nombre||'Consumidor final'}</p>
                    <p style={{ fontSize:10, color:'var(--text2)' }}>{new Date(v.fecha).toLocaleDateString('es-EC',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  <span className="ri-val">${parseFloat(v.total).toFixed(2)}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}