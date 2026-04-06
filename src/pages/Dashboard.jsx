import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatFechaHora, getRangoFechas } from '../utils/fecha'

const ID_EMPRESA = 1

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div className="metric-card" onClick={onClick}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{icon}</div>
        {onClick && <span style={{ fontSize:10, color:'var(--text2)', opacity:0.6 }}>ver →</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color:color||'var(--text)', marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--text2)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{sub}</div>}
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
    const { desde, hasta } = getRangoFechas(periodo)

    // Queries con filtro correcto
    let qV = supabase.from('ventas').select('total,fecha').eq('idempresa', ID_EMPRESA)
    let qI = supabase.from('inventariohistorico').select('total_invertido').eq('idempresa', ID_EMPRESA).eq('tipo_movimiento','entrada')
    let qG = supabase.from('gastos').select('monto').eq('idempresa', ID_EMPRESA)
    let qD = supabase.from('ventasdetalle').select('idproducto,cantidad,precio,productos(nombre)')

    if (desde) {
      qV = qV.gte('fecha', desde).lte('fecha', hasta)
      qI = qI.gte('fecha', desde).lte('fecha', hasta)
      qG = qG.gte('fecha', desde).lte('fecha', hasta)
      // Para top productos filtrar ventasdetalle por ventas del período
      const { data: ventasIds } = await supabase.from('ventas').select('idventa').eq('idempresa', ID_EMPRESA).gte('fecha', desde).lte('fecha', hasta)
      if (ventasIds?.length) {
        qD = qD.in('idventa', ventasIds.map(v => v.idventa))
      } else {
        qD = null // no hay ventas en el período
      }
    }

    const [
      {data:ventas}, {data:entradas}, {data:gastos},
      {data:todosProds},
      {count:totalCli},
      {data:ultimasV},
    ] = await Promise.all([
      qV, qI, qG,
      supabase.from('productos').select('idproducto,cantidad,stock_minimo,discontinuado').eq('idempresa',ID_EMPRESA),
      supabase.from('clientes').select('*',{count:'exact',head:true}).eq('idempresa',ID_EMPRESA),
      supabase.from('ventas').select('idventa,total,fecha,clientes(nombre)').eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false}).limit(5),
    ])

    // Top productos del período
    let topProductos = []
    if (qD) {
      const { data: detalle } = await qD.limit(500)
      const topMap = {}
      detalle?.forEach(d => {
        if (!topMap[d.idproducto]) topMap[d.idproducto] = { nombre: d.productos?.nombre||'?', cantidad: 0 }
        topMap[d.idproducto].cantidad += d.cantidad
      })
      topProductos = Object.values(topMap).sort((a,b) => b.cantidad-a.cantidad).slice(0,5)
    }

    const prodsActivos = (todosProds||[]).filter(p=>!p.discontinuado)
    const totalVentas  = ventas?.reduce((s,v)=>s+parseFloat(v.total),0)||0
    const totalInv     = entradas?.reduce((s,e)=>s+parseFloat(e.total_invertido||0),0)||0
    const totalGastos  = gastos?.reduce((s,g)=>s+parseFloat(g.monto),0)||0

    setStats({
      totalVentas, totalInv, totalGastos,
      gananciaNeta: totalVentas - totalInv - totalGastos,
      cantVentas:   ventas?.length||0,
      totalProds:   prodsActivos.length,
      stockBajo:    prodsActivos.filter(p=>p.cantidad>0&&p.stock_minimo>0&&p.cantidad<=p.stock_minimo).length,
      sinStock:     prodsActivos.filter(p=>p.cantidad===0).length,
      totalCli,
      topProductos,
      ultimasVentas: ultimasV||[],
    })
    setLoading(false)
  }

  const periodos = [
    {id:'hoy',    label:'Hoy'},
    {id:'semana', label:'Esta semana'},
    {id:'mes',    label:'Este mes'},
    {id:'anio',   label:'Este año'},
    {id:'total',  label:'Todo'},
  ]
  const colors = ['#6c63ff','#ff6584','#4caf87','#f5a623','#60b8e0']

  if (loading) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,gap:12 }}>
      <div style={{ fontSize:40 }}>📊</div>
      <p style={{ color:'var(--text2)',fontSize:14 }}>Cargando...</p>
    </div>
  )

  const s = stats
  const maxTop = s.topProductos[0]?.cantidad||1

  return (
    <div>
      {/* Selector período */}
      <div style={{ display:'flex',gap:0,marginBottom:16,background:'var(--bg2)',borderRadius:10,padding:4,border:'1px solid var(--border)' }}>
        {periodos.map(p=>(
          <button key={p.id} onClick={()=>setPeriodo(p.id)} style={{
            flex:1, padding:'7px 2px', borderRadius:8, border:'none', cursor:'pointer',
            fontSize:10, fontWeight:500,
            background: periodo===p.id ? 'var(--accent)' : 'transparent',
            color:      periodo===p.id ? '#fff' : 'var(--text2)',
            transition: 'all 0.2s',
          }}>{p.label}</button>
        ))}
      </div>

      <div className="cards-grid" style={{ marginBottom:12 }}>
        <StatCard icon="💰" label="Ventas" value={`$${s.totalVentas.toFixed(2)}`} sub={`${s.cantVentas} transacciones`} color="var(--success)" onClick={()=>onNavigate('finanzas')} />
        <StatCard icon="📈" label="Ganancia neta" value={`$${s.gananciaNeta.toFixed(2)}`} sub={`Inv:$${s.totalInv.toFixed(0)} · Gas:$${s.totalGastos.toFixed(0)}`} color={s.gananciaNeta>=0?'var(--success)':'var(--danger)'} onClick={()=>onNavigate('finanzas')} />
      </div>
      <div className="cards-grid" style={{ marginBottom:16 }}>
        <StatCard icon="👥" label="Clientes" value={s.totalCli||0} color="#60b8e0" onClick={()=>onNavigate('clientes')} />
        <StatCard icon="📦" label="Productos" value={s.totalProds||0} sub={s.sinStock>0?`${s.sinStock} sin stock`:undefined} color="var(--accent)" onClick={()=>onNavigate('productos')} />
      </div>

      {(s.sinStock>0||s.stockBajo>0) && (
        <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
          {s.sinStock>0&&(
            <div onClick={()=>onNavigate('bodega')} style={{ flex:1,minWidth:140,background:'rgba(224,82,82,0.1)',border:'1px solid rgba(224,82,82,0.3)',borderRadius:10,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10 }}>
              <span style={{ fontSize:22 }}>🚨</span>
              <div><p style={{ fontSize:13,fontWeight:600,color:'var(--danger)' }}>{s.sinStock} sin stock</p><p style={{ fontSize:11,color:'var(--text2)' }}>toca para reabastecer</p></div>
            </div>
          )}
          {s.stockBajo>0&&(
            <div onClick={()=>onNavigate('bodega')} style={{ flex:1,minWidth:140,background:'rgba(245,166,35,0.1)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:10,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10 }}>
              <span style={{ fontSize:22 }}>⚠️</span>
              <div><p style={{ fontSize:13,fontWeight:600,color:'var(--warn)' }}>{s.stockBajo} stock bajo</p><p style={{ fontSize:11,color:'var(--text2)' }}>toca para reabastecer</p></div>
            </div>
          )}
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">🏆 Más vendidos</div>
          {s.topProductos.length===0
            ? <p style={{ color:'var(--text2)',fontSize:13 }}>Sin ventas en este período</p>
            : s.topProductos.map((p,i)=>(
              <div className="bar-row" key={i}>
                <span style={{ width:16,color:'var(--text2)',fontSize:11,flexShrink:0 }}>{i+1}</span>
                <span className="bar-label">{p.nombre.substring(0,12)}{p.nombre.length>12?'…':''}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width:`${Math.max(5,(p.cantidad/maxTop)*100)}%`,background:colors[i] }} /></div>
                <span className="bar-val">{p.cantidad}</span>
              </div>
            ))
          }
        </div>
        <div className="panel">
          <div className="panel-title">🧾 Últimas ventasss</div>
          <div className="recent-list">
            {s.ultimasVentas.length===0
              ? <p style={{ color:'var(--text2)',fontSize:13 }}>Sin ventas aún</p>
              : s.ultimasVentas.map((v,i)=>(
                <div className="recent-item" key={i}>
                  <div className="ri-icon" style={{ background:`${colors[i%5]}22`,color:colors[i%5] }}>🧾</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p className="ri-name" style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v.clientes?.nombre||'Consumidor final'}</p>
                    <p style={{ fontSize:10,color:'var(--text2)' }}>{formatFechaHora(v.fecha)}</p>
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