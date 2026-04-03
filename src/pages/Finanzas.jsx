import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1
const TZ = 'America/Guayaquil'

// ── Helpers de fecha ─────────────────────────────────────────
function hoyStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
}

function getFiltroFechas(periodo) {
  const hoy = hoyStr()
  const now  = new Date()

  if (periodo === 'hoy') {
    return {
      desde: hoy + 'T00:00:00-05:00',
      hasta: hoy + 'T23:59:59-05:00',
    }
  }

  if (periodo === 'semana') {
    // Lunes de esta semana
    const d = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
    const dow = d.getDay() === 0 ? 7 : d.getDay() // 1=lun ... 7=dom
    d.setDate(d.getDate() - (dow - 1))
    const lunes = d.toLocaleDateString('en-CA', { timeZone: TZ })
    return {
      desde: lunes + 'T00:00:00-05:00',
      hasta: hoy   + 'T23:59:59-05:00',
    }
  }

  if (periodo === 'mes') {
    const [y, m] = hoy.split('-')
    return {
      desde: `${y}-${m}-01T00:00:00-05:00`,
      hasta: hoy + 'T23:59:59-05:00',
    }
  }

  if (periodo === 'anio') {
    const y = hoy.split('-')[0]
    return {
      desde: `${y}-01-01T00:00:00-05:00`,
      hasta: hoy + 'T23:59:59-05:00',
    }
  }

  return { desde: null, hasta: null } // todo
}

// Convierte fecha de Supabase a YYYY-MM-DD en zona Ecuador
// sin restar días
function fechaADia(isoString) {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: TZ })
}

// Formatea YYYY-MM-DD para mostrar "02 abr"
function formatDia(diaStr) {
  return new Date(diaStr + 'T12:00:00').toLocaleDateString('es-EC', {
    timeZone: TZ, day: '2-digit', month: 'short',
  })
}

// ── Componentes visuales ──────────────────────────────────────
function BarraComp({ label, valor, max, color }) {
  const pct = max > 0 ? Math.max(3, (valor / max) * 100) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>${valor.toFixed(2)}</span>
      </div>
      <div style={{ background: 'var(--bg3)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function GraficaLinea({ datos }) {
  if (!datos || datos.length === 0) return (
    <p style={{ color: 'var(--text2)', fontSize: 13, padding: '16px 0' }}>Sin datos para el período</p>
  )

  // Si solo hay 1 día mostramos barras simples en vez de línea
  if (datos.length === 1) {
    const d = datos[0]
    const max = Math.max(d.ventas, d.gastos, 0.01)
    return (
      <div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>{d.label}</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 100 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>${d.ventas.toFixed(2)}</span>
            <div style={{ width: '100%', background: 'var(--success)', borderRadius: '6px 6px 0 0', height: `${Math.max(8, (d.ventas/max)*80)}px`, opacity: 0.85 }} />
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Ventas</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>${d.gastos.toFixed(2)}</span>
            <div style={{ width: '100%', background: 'var(--danger)', borderRadius: '6px 6px 0 0', height: `${Math.max(8, (d.gastos/max)*80)}px`, opacity: 0.75 }} />
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Gastos</span>
          </div>
        </div>
      </div>
    )
  }

  // Múltiples días → barras agrupadas
  const maxVal = Math.max(...datos.map(d => Math.max(d.ventas || 0, d.gastos || 0)), 0.01)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: Math.max(datos.length * 52, 300), height: 160, padding: '0 4px' }}>
        {datos.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 130 }}>
              <div
                style={{ flex: 1, background: 'var(--success)', borderRadius: '4px 4px 0 0', opacity: 0.85, height: `${Math.max(2, (d.ventas / maxVal) * 100)}%`, minHeight: d.ventas > 0 ? 4 : 0 }}
                title={`Ventas: $${d.ventas.toFixed(2)}`}
              />
              <div
                style={{ flex: 1, background: 'var(--danger)', borderRadius: '4px 4px 0 0', opacity: 0.75, height: `${Math.max(2, (d.gastos / maxVal) * 100)}%`, minHeight: d.gastos > 0 ? 4 : 0 }}
                title={`Gastos: $${d.gastos.toFixed(2)}`}
              />
            </div>
            <span style={{ fontSize: 9, color: 'var(--text2)', whiteSpace: 'nowrap', transform: 'rotate(-40deg)', transformOrigin: 'top center', marginTop: 6 }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
        <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--success)', borderRadius: 2, display: 'inline-block' }} /> Ventas
        </span>
        <span style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--danger)', borderRadius: 2, display: 'inline-block' }} /> Gastos
        </span>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Finanzas() {
  const [datos,          setDatos]          = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [periodo,        setPeriodo]        = useState('mes')
  const [incluirInv,     setIncluirInv]     = useState(true)

  useEffect(() => { fetchDatos() }, [periodo])

  async function fetchDatos() {
    setLoading(true)
    const { desde, hasta } = getFiltroFechas(periodo)

    // Construir queries con filtro correcto
    let qV = supabase.from('ventas').select('total,fecha').eq('idempresa', ID_EMPRESA)
    let qI = supabase.from('inventariohistorico').select('total_invertido,fecha').eq('idempresa', ID_EMPRESA).eq('tipo_movimiento', 'entrada')
    let qG = supabase.from('gastos').select('monto,fecha,categoriasgasto(nombre)').eq('idempresa', ID_EMPRESA)

    if (desde) {
      qV = qV.gte('fecha', desde).lte('fecha', hasta)
      qI = qI.gte('fecha', desde).lte('fecha', hasta)
      qG = qG.gte('fecha', desde).lte('fecha', hasta)
    }

    const [{ data: ventas }, { data: entradas }, { data: gastos }] = await Promise.all([qV, qI, qG])

    const totalVentas    = ventas?.reduce((s, v) => s + parseFloat(v.total), 0) || 0
    const totalInversion = entradas?.reduce((s, e) => s + parseFloat(e.total_invertido || 0), 0) || 0
    const totalGastos    = gastos?.reduce((s, g) => s + parseFloat(g.monto), 0) || 0
    const gananciaBruta  = totalVentas - totalInversion
    const gananciaNeta   = totalVentas - totalInversion - totalGastos
    const gananciaSimple = totalVentas - totalGastos // sin inversión
    const cantVentas     = ventas?.length || 0
    const ticketProm     = cantVentas > 0 ? totalVentas / cantVentas : 0

    // Por categoría
    const porCat = {}
    gastos?.forEach(g => {
      const n = g.categoriasgasto?.nombre || 'Sin categoría'
      porCat[n] = (porCat[n] || 0) + parseFloat(g.monto)
    })
    const topGastos = Object.entries(porCat).sort((a, b) => b[1] - a[1])

    // Gráfica por día — usando fechaADia para no restar días
    const vPorDia = {}, gPorDia = {}
    ventas?.forEach(v => {
      const dia = fechaADia(v.fecha)
      vPorDia[dia] = (vPorDia[dia] || 0) + parseFloat(v.total)
    })
    gastos?.forEach(g => {
      const dia = fechaADia(g.fecha)
      gPorDia[dia] = (gPorDia[dia] || 0) + parseFloat(g.monto)
    })

    const diasSet = new Set([...Object.keys(vPorDia), ...Object.keys(gPorDia)])
    const diasOrdenados = [...diasSet].sort().map(dia => ({
      label:  formatDia(dia),
      ventas: vPorDia[dia] || 0,
      gastos: gPorDia[dia] || 0,
    }))

    setDatos({ totalVentas, totalInversion, totalGastos, gananciaBruta, gananciaNeta, gananciaSimple, cantVentas, ticketProm, topGastos, diasOrdenados })
    setLoading(false)
  }

  const periodos = [
    { id: 'hoy',   label: 'Hoy' },
    { id: 'semana',label: 'Semana' },
    { id: 'mes',   label: 'Este mes' },
    { id: 'anio',  label: 'Este año' },
    { id: 'total', label: 'Todo' },
  ]

  if (loading) return <div className="loading">Calculando finanzas...</div>

  const d = datos
  const gananciaActual = incluirInv ? d.gananciaNeta : d.gananciaSimple
  const margen         = d.totalVentas > 0 ? (gananciaActual / d.totalVentas) * 100 : 0
  const maxBarra       = Math.max(d.totalVentas, d.totalInversion + d.totalGastos, 0.01)

  return (
    <div>
      {/* Selector período */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg2)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
        {periodos.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 500,
            background: periodo === p.id ? 'var(--accent)' : 'transparent',
            color:      periodo === p.id ? '#fff' : 'var(--text2)',
            transition: 'all 0.2s',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Toggle inversión */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>
          Incluir inversión en mercadería en el cálculo de ganancia
        </span>
        <button
          onClick={() => setIncluirInv(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: incluirInv ? 'var(--accent)' : 'var(--bg3)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
            left: incluirInv ? 23 : 3,
          }} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: incluirInv ? 'var(--accent)' : 'var(--text2)', minWidth: 24 }}>
          {incluirInv ? 'Sí' : 'No'}
        </span>
      </div>

      {/* Tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metric-card" style={{ cursor: 'default' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(76,175,135,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)', marginBottom: 2 }}>${d.totalVentas.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ingresos totales</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{d.cantVentas} ventas · ticket ${d.ticketProm.toFixed(2)}</div>
        </div>

        {incluirInv && (
          <div className="metric-card" style={{ cursor: 'default' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warn)', marginBottom: 2 }}>${d.totalInversion.toFixed(2)}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Inversión mercadería</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>costo de productos</div>
          </div>
        )}

        <div className="metric-card" style={{ cursor: 'default' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(224,82,82,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>💸</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)', marginBottom: 2 }}>${d.totalGastos.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Gastos operativos</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>pagados en el período</div>
        </div>

        <div className="metric-card" style={{ cursor: 'default' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${gananciaActual >= 0 ? 'rgba(76,175,135' : 'rgba(224,82,82'},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>📈</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: gananciaActual >= 0 ? 'var(--success)' : 'var(--danger)', marginBottom: 2 }}>${gananciaActual.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ganancia {incluirInv ? 'neta' : '(sin inv.)'}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Margen: {margen.toFixed(1)}%{incluirInv ? ` · Bruta: $${d.gananciaBruta.toFixed(2)}` : ''}</div>
        </div>
      </div>

      {/* Comparativa */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">📊 Comparativa</div>
        <BarraComp label="Ingresos (ventas)"    valor={d.totalVentas}    max={maxBarra} color="var(--success)" />
        {incluirInv && <BarraComp label="Inversión mercadería" valor={d.totalInversion} max={maxBarra} color="var(--warn)" />}
        <BarraComp label="Gastos operativos"    valor={d.totalGastos}    max={maxBarra} color="var(--danger)" />
        <BarraComp label={incluirInv ? 'Ganancia neta' : 'Ganancia (sin inv.)'} valor={Math.max(0, gananciaActual)} max={maxBarra} color={gananciaActual >= 0 ? '#4caf87' : 'var(--danger)'} />

        <div style={{ marginTop: 14, padding: '12px 14px', background: gananciaActual >= 0 ? 'rgba(76,175,135,0.08)' : 'rgba(224,82,82,0.08)', border: `1px solid ${gananciaActual >= 0 ? 'rgba(76,175,135,0.2)' : 'rgba(224,82,82,0.2)'}`, borderRadius: 8 }}>
          {gananciaActual >= 0
            ? <p style={{ fontSize: 13, color: 'var(--success)' }}>✅ De cada $100 vendidos, <strong>${((gananciaActual / Math.max(d.totalVentas, 0.01)) * 100).toFixed(1)}</strong> son ganancia real.</p>
            : <p style={{ fontSize: 13, color: 'var(--danger)' }}>⚠️ Los costos superan los ingresos en este período.</p>
          }
        </div>
      </div>

      {/* Gráfica */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-title">📅 Ventas vs Gastos por día</div>
          <GraficaLinea datos={d.diasOrdenados} />
        </div>
        <div className="panel">
          <div className="panel-title">💸 Gastos por categoría</div>
          {d.topGastos.length === 0
            ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin gastos en este período</p>
            : d.topGastos.map(([cat, val]) => (
              <div className="bar-row" key={cat}>
                <span className="bar-label" style={{ width: 90 }}>{cat.substring(0, 11)}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.max(3, (val / d.totalGastos) * 100)}%`, background: 'var(--danger)' }} /></div>
                <span className="bar-val">${val.toFixed(0)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}