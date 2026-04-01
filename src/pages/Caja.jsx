import { useEffect, useState } from 'react'
import { formatFechaHora, inicioDiaEC, finDiaEC, hoyEC } from '../utils/fecha'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

export default function CorteCaja() {
  const [cortes,       setCortes]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [efectivoReal, setEfectivoReal] = useState('')
  const [nota,         setNota]         = useState('')
  const [resumenHoy,   setResumenHoy]   = useState({ ventas: 0, gastos: 0 })
  const [guardando,    setGuardando]    = useState(false)
  const [ok,           setOk]           = useState(false)

  useEffect(() => { fetchCortes(); calcularHoy() }, [])

  async function calcularHoy() {
    const hoy   = hoyEC()
    const desde = inicioDiaEC(hoy)
    const hasta = finDiaEC(hoy)

    const [{ data: ventas }, { data: gastos }] = await Promise.all([
      supabase.from('ventas').select('total').eq('idempresa', ID_EMPRESA).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('gastos').select('monto').eq('idempresa', ID_EMPRESA).gte('fecha', desde).lte('fecha', hasta),
    ])

    setResumenHoy({
      ventas: ventas?.reduce((s,v) => s + parseFloat(v.total), 0) || 0,
      gastos: gastos?.reduce((s,g) => s + parseFloat(g.monto), 0) || 0,
    })
  }

  async function fetchCortes() {
    setLoading(true)
    const { data } = await supabase.from('cortecaja').select('*').eq('idempresa', ID_EMPRESA).order('fecha', { ascending: false }).limit(30)
    setCortes(data || [])
    setLoading(false)
  }

  async function hacerCorte() {
    if (!efectivoReal && efectivoReal !== '0') return alert('Ingresa el efectivo real en caja')
    setGuardando(true); setOk(false)

    const { error } = await supabase.from('cortecaja').insert([{
      idempresa:     ID_EMPRESA,
      total_ventas:  resumenHoy.ventas,
      total_gastos:  resumenHoy.gastos,
      efectivo_real: parseFloat(efectivoReal),
      nota:          nota.trim() || null,
    }])

    if (error) alert('Error: ' + error.message)
    else { setEfectivoReal(''); setNota(''); setOk(true); fetchCortes(); calcularHoy() }
    setGuardando(false)
  }

  const esperado  = resumenHoy.ventas - resumenHoy.gastos
  const diferencia = parseFloat(efectivoReal||0) - esperado
  const gananciaHoy = resumenHoy.ventas - resumenHoy.gastos

  return (
    <div>
      <div className="section-header"><h2>🏧 Corte de caja</h2></div>

      {/* Resumen del día */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Resumen de hoy — {new Date().toLocaleDateString('es-EC',{timeZone:'America/Guayaquil',weekday:'long',day:'numeric',month:'long'})}</p>

        <div className="cards-grid" style={{ marginBottom: 16 }}>
          <div className="metric-card" style={{ cursor: 'default' }}>
            <div className="metric-label">Ventas del día</div>
            <div className="metric-value" style={{ color: 'var(--success)' }}>${resumenHoy.ventas.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{ cursor: 'default' }}>
            <div className="metric-label">Gastos del día</div>
            <div className="metric-value" style={{ color: 'var(--danger)' }}>${resumenHoy.gastos.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{ cursor: 'default' }}>
            <div className="metric-label">Efectivo esperado</div>
            <div className="metric-value" style={{ color: 'var(--accent)' }}>${esperado.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{ cursor: 'default' }}>
            <div className="metric-label">Ganancia neta</div>
            <div className="metric-value" style={{ color: gananciaHoy >= 0 ? 'var(--success)' : 'var(--danger)' }}>${gananciaHoy.toFixed(2)}</div>
          </div>
        </div>

        {/* Hacer corte */}
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Hacer corte ahora</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Efectivo real en caja ($) *</label>
              <input type="number" min="0" step="0.01" value={efectivoReal} onChange={e => { setEfectivoReal(e.target.value); setOk(false) }} placeholder="Cuenta el dinero físico" style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nota</label>
              <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional" style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
          </div>

          {/* Preview diferencia */}
          {efectivoReal !== '' && (
            <div style={{ background: Math.abs(diferencia) < 0.01 ? 'rgba(76,175,135,0.1)' : diferencia > 0 ? 'rgba(108,99,255,0.1)' : 'rgba(224,82,82,0.1)', border: `1px solid ${Math.abs(diferencia) < 0.01 ? 'rgba(76,175,135,0.3)' : diferencia > 0 ? 'rgba(108,99,255,0.3)' : 'rgba(224,82,82,0.3)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                {Math.abs(diferencia) < 0.01 ? '✅ Cuadra perfectamente' : diferencia > 0 ? '📈 Sobrante' : '📉 Faltante'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: Math.abs(diferencia) < 0.01 ? 'var(--success)' : diferencia > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={hacerCorte} disabled={guardando} style={{ padding: '10px 20px' }}>
              {guardando ? 'Guardando...' : '🏧 Registrar corte'}
            </button>
            {ok && <span style={{ fontSize: 13, color: 'var(--success)' }}>✅ Corte registrado</span>}
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="panel">
        <div className="panel-title">Historial de cortes</div>
        {loading ? <div className="loading">Cargando...</div> : cortes.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏧</div>Sin cortes registrados</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Ventas</th><th>Gastos</th><th>Esperado</th><th>Real</th><th>Diferencia</th><th>Nota</th></tr></thead>
              <tbody>
                {cortes.map(c => {
                  const dif = parseFloat(c.diferencia || 0)
                  return (
                    <tr key={c.idcorte}>
                      <td style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{formatFechaHora(c.fecha)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>${parseFloat(c.total_ventas).toFixed(2)}</td>
                      <td style={{ color: 'var(--danger)' }}>${parseFloat(c.total_gastos).toFixed(2)}</td>
                      <td style={{ color: 'var(--accent)' }}>${(parseFloat(c.total_ventas)-parseFloat(c.total_gastos)).toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(c.efectivo_real).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: Math.abs(dif) < 0.01 ? 'var(--success)' : dif > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                        {dif > 0 ? '+' : ''}${dif.toFixed(2)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{c.nota || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}