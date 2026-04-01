import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

function BarraComparativa({ label, valor, max, color, prefix = '$' }) {
  const pct = max > 0 ? Math.max(3, (valor / max) * 100) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{prefix}{valor.toFixed(2)}</span>
      </div>
      <div style={{ background: 'var(--bg3)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function TarjetaFinanciera({ icon, label, valor, sub, color, detalle }) {
  return (
    <div className="metric-card" style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 2 }}>${valor.toFixed(2)}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
      {detalle && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{detalle}</div>}
    </div>
  )
}

export default function Finanzas() {
  const [datos,   setDatos]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  useEffect(() => { fetchDatos() }, [periodo])

  async function fetchDatos() {
    setLoading(true)
    const ahora = new Date()
    let fechaDesde = null
    if (periodo === 'hoy')    fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
    if (periodo === 'semana') { const d = new Date(ahora); d.setDate(d.getDate()-7);  fechaDesde = d.toISOString() }
    if (periodo === 'mes')    { const d = new Date(ahora); d.setDate(d.getDate()-30); fechaDesde = d.toISOString() }
    if (periodo === 'anio')   { const d = new Date(ahora); d.setFullYear(d.getFullYear()-1); fechaDesde = d.toISOString() }

    let qV = supabase.from('ventas').select('total,fecha').eq('idempresa', ID_EMPRESA)
    let qI = supabase.from('inventariohistorico').select('total_invertido,fecha').eq('idempresa', ID_EMPRESA).eq('tipo_movimiento','entrada')
    let qG = supabase.from('gastos').select('monto,categoria,fecha').eq('idempresa', ID_EMPRESA)

    if (fechaDesde) { qV = qV.gte('fecha',fechaDesde); qI = qI.gte('fecha',fechaDesde); qG = qG.gte('fecha',fechaDesde) }

    const [{ data: ventas }, { data: entradas }, { data: gastos }] = await Promise.all([qV, qI, qG])

    const totalVentas   = ventas?.reduce((s,v) => s + parseFloat(v.total), 0) || 0
    const totalInversion= entradas?.reduce((s,e) => s + parseFloat(e.total_invertido||0), 0) || 0
    const totalGastos   = gastos?.reduce((s,g) => s + parseFloat(g.monto), 0) || 0
    const gananciaBruta = totalVentas - totalInversion
    const gananciaNeta  = totalVentas - totalInversion - totalGastos
    const margen        = totalVentas > 0 ? (gananciaNeta / totalVentas) * 100 : 0
    const cantVentas    = ventas?.length || 0
    const ticketProm    = cantVentas > 0 ? totalVentas / cantVentas : 0

    // Gastos por categoría
    const porCat = {}
    gastos?.forEach(g => { porCat[g.categoria] = (porCat[g.categoria] || 0) + parseFloat(g.monto) })
    const topGastos = Object.entries(porCat).sort((a,b) => b[1]-a[1])

    // Ventas por día (últimos 7)
    const ventasPorDia = {}
    ventas?.forEach(v => {
      const dia = v.fecha.split('T')[0]
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + parseFloat(v.total)
    })
    const diasOrdenados = Object.entries(ventasPorDia).sort((a,b) => a[0].localeCompare(b[0])).slice(-7)

    setDatos({ totalVentas, totalInversion, totalGastos, gananciaBruta, gananciaNeta, margen, cantVentas, ticketProm, topGastos, diasOrdenados })
    setLoading(false)
  }

  const periodos = [
    { id: 'hoy',    label: 'Hoy' },
    { id: 'semana', label: '7 días' },
    { id: 'mes',    label: '30 días' },
    { id: 'anio',   label: '1 año' },
    { id: 'total',  label: 'Total' },
  ]

  if (loading) return <div className="loading">Calculando finanzas...</div>
  const d = datos
  const maxBarra = Math.max(d.totalVentas, d.totalInversion + d.totalGastos, 0.01)
  const maxDia   = Math.max(...(d.diasOrdenados.map(x => x[1])), 0.01)

  return (
    <div>
      {/* Selector período */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--bg2)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
        {periodos.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: periodo === p.id ? 'var(--accent)' : 'transparent',
            color: periodo === p.id ? '#fff' : 'var(--text2)', transition: 'all 0.2s',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Tarjetas principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        <TarjetaFinanciera icon="💰" label="Ingresos totales"  valor={d.totalVentas}    color="var(--success)" sub={`${d.cantVentas} ventas · ticket $${d.ticketProm.toFixed(2)}`} />
        <TarjetaFinanciera icon="📦" label="Inversión mercadería" valor={d.totalInversion} color="var(--warn)"    sub="costo de productos vendidos" />
        <TarjetaFinanciera icon="💸" label="Gastos operativos"  valor={d.totalGastos}    color="var(--danger)"  sub="luz, arriendo, etc." />
        <TarjetaFinanciera icon="📈" label="Ganancia neta"      valor={d.gananciaNeta}   color={d.gananciaNeta >= 0 ? '#4caf87' : 'var(--danger)'} sub={`Margen: ${d.margen.toFixed(1)}%`} detalle={`Bruta: $${d.gananciaBruta.toFixed(2)} — Gastos: -$${d.totalGastos.toFixed(2)}`} />
      </div>

      {/* Barra comparativa visual */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">📊 Comparativa</div>
        <BarraComparativa label="Ingresos (ventas)"     valor={d.totalVentas}    max={maxBarra} color="var(--success)" />
        <BarraComparativa label="Inversión mercadería"  valor={d.totalInversion} max={maxBarra} color="var(--warn)" />
        <BarraComparativa label="Gastos operativos"     valor={d.totalGastos}    max={maxBarra} color="var(--danger)" />
        <BarraComparativa label="Ganancia neta"         valor={Math.max(0,d.gananciaNeta)} max={maxBarra} color={d.gananciaNeta>=0?'#4caf87':'var(--danger)'} />

        {/* Resumen texto */}
        <div style={{ marginTop: 16, padding: '12px 14px', background: d.gananciaNeta >= 0 ? 'rgba(76,175,135,0.08)' : 'rgba(224,82,82,0.08)', border: `1px solid ${d.gananciaNeta >= 0 ? 'rgba(76,175,135,0.2)' : 'rgba(224,82,82,0.2)'}`, borderRadius: 8 }}>
          {d.gananciaNeta >= 0
            ? <p style={{ fontSize: 13, color: 'var(--success)' }}>✅ De cada $100 vendidos, <strong>${((d.gananciaNeta/Math.max(d.totalVentas,0.01))*100).toFixed(1)}</strong> son ganancia real.</p>
            : <p style={{ fontSize: 13, color: 'var(--danger)' }}>⚠️ Los gastos superan a las ventas en este período. Revisa tus costos.</p>
          }
        </div>
      </div>

      <div className="two-col">
        {/* Ventas por día */}
        <div className="panel">
          <div className="panel-title">📅 Ventas por día</div>
          {d.diasOrdenados.length === 0
            ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin datos</p>
            : d.diasOrdenados.map(([dia, val]) => (
              <div className="bar-row" key={dia}>
                <span className="bar-label" style={{ width: 70 }}>{new Date(dia+'T12:00:00').toLocaleDateString('es-EC',{timeZone:'America/Guayaquil',day:'2-digit',month:'short'})}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width:`${Math.max(3,(val/maxDia)*100)}%`, background:'var(--success)' }} /></div>
                <span className="bar-val">${val.toFixed(0)}</span>
              </div>
            ))
          }
        </div>

        {/* Gastos por categoría */}
        <div className="panel">
          <div className="panel-title">💸 Gastos por categoría</div>
          {d.topGastos.length === 0
            ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin gastos</p>
            : d.topGastos.map(([cat, val]) => (
              <div className="bar-row" key={cat}>
                <span className="bar-label" style={{ width: 90 }}>{cat.substring(0,11)}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width:`${Math.max(3,(val/d.totalGastos)*100)}%`, background:'var(--danger)' }} /></div>
                <span className="bar-val">${val.toFixed(0)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}