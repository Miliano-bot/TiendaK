import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatFechaHora, formatFecha, hoyEC, inicioDiaEC, finDiaEC } from '../utils/fecha'

const ID_EMPRESA = 1

function ModalDetalleCorre({ corte, onClose }) {
  const [ventas,  setVentas]  = useState([])
  const [gastos,  setGastos]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dia = corte.fecha.split('T')[0]
    Promise.all([
      supabase.from('ventas').select('idventa,total,fecha,clientes(nombre)').eq('idempresa',ID_EMPRESA)
        .gte('fecha', inicioDiaEC(dia)).lte('fecha', finDiaEC(dia)).order('fecha'),
      supabase.from('gastos').select('monto,descripcion,categoriasgasto(nombre)').eq('idempresa',ID_EMPRESA)
        .gte('fecha', inicioDiaEC(dia)).lte('fecha', finDiaEC(dia)),
    ]).then(([{data:v},{data:g}])=>{ setVentas(v||[]); setGastos(g||[]); setLoading(false) })
  },[])

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:520 }}>
        <h3>Detalle del corte — {formatFecha(corte.fecha)}</h3>
        {loading?<div className="loading">Cargando...</div>:(
          <>
            <p style={{ fontSize:13,fontWeight:600,marginBottom:8,marginTop:12 }}>Ventas ({ventas.length})</p>
            {ventas.length===0?<p style={{ color:'var(--text2)',fontSize:13,marginBottom:12 }}>Sin ventas ese día</p>:(
              <div style={{ marginBottom:12 }}>
                {ventas.map(v=>(
                  <div key={v.idventa} style={{ display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'var(--bg3)',borderRadius:6,marginBottom:4,fontSize:13 }}>
                    <span style={{ color:'var(--text2)' }}>{v.clientes?.nombre||'Consumidor final'}</span>
                    <span style={{ color:'var(--success)',fontWeight:600 }}>${parseFloat(v.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize:13,fontWeight:600,marginBottom:8 }}>Gastos ({gastos.length})</p>
            {gastos.length===0?<p style={{ color:'var(--text2)',fontSize:13,marginBottom:12 }}>Sin gastos ese día</p>:(
              <div style={{ marginBottom:12 }}>
                {gastos.map((g,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'var(--bg3)',borderRadius:6,marginBottom:4,fontSize:13 }}>
                    <span style={{ color:'var(--text2)' }}>{g.descripcion||g.categoriasgasto?.nombre||'—'}</span>
                    <span style={{ color:'var(--danger)',fontWeight:600 }}>${parseFloat(g.monto).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ borderTop:'1px solid var(--border)',paddingTop:12,display:'flex',flexDirection:'column',gap:6 }}>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:13 }}>
                <span style={{ color:'var(--text2)' }}>Total ventas</span>
                <span style={{ color:'var(--success)',fontWeight:600 }}>${parseFloat(corte.total_ventas).toFixed(2)}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:13 }}>
                <span style={{ color:'var(--text2)' }}>Total gastos</span>
                <span style={{ color:'var(--danger)',fontWeight:600 }}>-${parseFloat(corte.total_gastos).toFixed(2)}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:13 }}>
                <span style={{ color:'var(--text2)' }}>Efectivo esperado</span>
                <span style={{ color:'var(--accent)',fontWeight:600 }}>${(parseFloat(corte.total_ventas)-parseFloat(corte.total_gastos)).toFixed(2)}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:14,marginTop:4,paddingTop:8,borderTop:'1px solid var(--border)' }}>
                <span style={{ fontWeight:600 }}>Efectivo real</span>
                <span style={{ fontWeight:700,fontSize:16 }}>${parseFloat(corte.efectivo_real).toFixed(2)}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:14 }}>
                <span style={{ fontWeight:600 }}>Diferencia</span>
                <span style={{ fontWeight:700,color: parseFloat(corte.diferencia)===0?'var(--success)':parseFloat(corte.diferencia)>0?'var(--accent)':'var(--danger)' }}>
                  {parseFloat(corte.diferencia)>0?'+':''}${parseFloat(corte.diferencia).toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}

export default function CorteCaja() {
  const [cortes,       setCortes]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [efectivoReal, setEfectivoReal] = useState('')
  const [nota,         setNota]         = useState('')
  const [resumenHoy,   setResumenHoy]   = useState({ ventas:0, gastos:0, numVentas:0 })
  const [guardando,    setGuardando]    = useState(false)
  const [ok,           setOk]           = useState(false)
  const [corteDetalle, setCorteDetalle] = useState(null)

  useEffect(() => { fetchCortes(); calcularHoy() }, [])

  async function calcularHoy() {
    const hoy = hoyEC()
    const [{ data:ventas },{ data:gastos }]=await Promise.all([
      supabase.from('ventas').select('total').eq('idempresa',ID_EMPRESA).gte('fecha',inicioDiaEC(hoy)).lte('fecha',finDiaEC(hoy)),
      // Solo gastos realmente pagados hoy (tipo unico registrados hoy)
      supabase.from('gastos').select('monto').eq('idempresa',ID_EMPRESA).eq('tipo','unico').gte('fecha',inicioDiaEC(hoy)).lte('fecha',finDiaEC(hoy)),
    ])
    setResumenHoy({
      ventas:    ventas?.reduce((s,v)=>s+parseFloat(v.total),0)||0,
      gastos:    gastos?.reduce((s,g)=>s+parseFloat(g.monto),0)||0,
      numVentas: ventas?.length||0,
    })
  }

  async function fetchCortes() {
    setLoading(true)
    const{data}=await supabase.from('cortecaja').select('*').eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false}).limit(30)
    setCortes(data||[])
    setLoading(false)
  }

  async function hacerCorte() {
    if (efectivoReal===''&&efectivoReal!=='0') return alert('Ingresa el efectivo real en caja')
    setGuardando(true); setOk(false)
    const{error}=await supabase.from('cortecaja').insert([{
      idempresa:     ID_EMPRESA,
      total_ventas:  resumenHoy.ventas,
      total_gastos:  resumenHoy.gastos,
      efectivo_real: parseFloat(efectivoReal),
      nota:          nota.trim()||null,
    }])
    if(error) alert('Error: '+error.message)
    else { setEfectivoReal(''); setNota(''); setOk(true); fetchCortes(); calcularHoy() }
    setGuardando(false)
  }

  const esperado   = resumenHoy.ventas - resumenHoy.gastos
  const diferencia = parseFloat(efectivoReal||0) - esperado

  return (
    <div>
      {corteDetalle && <ModalDetalleCorre corte={corteDetalle} onClose={()=>setCorteDetalle(null)} />}

      <div className="section-header"><h2>🏧 Corte de caja</h2></div>

      <div className="panel" style={{ marginBottom:16 }}>
        <p style={{ fontWeight:600,fontSize:15,marginBottom:14 }}>
          Resumen de hoy — {new Date().toLocaleDateString('es-EC',{timeZone:'America/Guayaquil',weekday:'long',day:'numeric',month:'long'})}
        </p>
        <p style={{ fontSize:12,color:'var(--text2)',marginBottom:14 }}>
          ⚠️ Solo se suman los gastos efectivamente pagados hoy (pagos únicos y recurrentes confirmados).
        </p>

        <div className="cards-grid" style={{ marginBottom:16 }}>
          <div className="metric-card" style={{ cursor:'default' }}>
            <div className="metric-label">Ventas del día</div>
            <div className="metric-value" style={{ color:'var(--success)' }}>${resumenHoy.ventas.toFixed(2)}</div>
            <div className="metric-sub">{resumenHoy.numVentas} transacciones</div>
          </div>
          <div className="metric-card" style={{ cursor:'default' }}>
            <div className="metric-label">Gastos pagados hoy</div>
            <div className="metric-value" style={{ color:'var(--danger)' }}>${resumenHoy.gastos.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{ cursor:'default' }}>
            <div className="metric-label">Efectivo esperado</div>
            <div className="metric-value" style={{ color:'var(--accent)' }}>${esperado.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{ cursor:'default' }}>
            <div className="metric-label">Ganancia neta hoy</div>
            <div className="metric-value" style={{ color:esperado>=0?'var(--success)':'var(--danger)' }}>${esperado.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ background:'var(--bg3)',borderRadius:10,padding:16 }}>
          <p style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>Registrar corte</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
            <div className="form-group" style={{ margin:0 }}>
              <label>Efectivo real en caja ($) *</label>
              <input type="number" min="0" step="0.01" value={efectivoReal} onChange={e=>{setEfectivoReal(e.target.value);setOk(false)}} placeholder="Cuenta el dinero físico"
                style={{ padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none',width:'100%' }} />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label>Nota</label>
              <input value={nota} onChange={e=>setNota(e.target.value)} placeholder="Opcional"
                style={{ padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none',width:'100%' }} />
            </div>
          </div>

          {efectivoReal!==''&&(
            <div style={{ background:Math.abs(diferencia)<0.01?'rgba(76,175,135,0.1)':diferencia>0?'rgba(108,99,255,0.1)':'rgba(224,82,82,0.1)', border:`1px solid ${Math.abs(diferencia)<0.01?'rgba(76,175,135,0.3)':diferencia>0?'rgba(108,99,255,0.3)':'rgba(224,82,82,0.3)'}`, borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontSize:13,color:'var(--text2)' }}>
                {Math.abs(diferencia)<0.01?'✅ Cuadra':''}
                {diferencia>0.01?'📈 Sobrante':''}
                {diferencia<-0.01?'📉 Faltante':''}
              </span>
              <span style={{ fontSize:20,fontWeight:700,color:Math.abs(diferencia)<0.01?'var(--success)':diferencia>0?'var(--accent)':'var(--danger)' }}>
                {diferencia>0?'+':''}${diferencia.toFixed(2)}
              </span>
            </div>
          )}

          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <button className="btn btn-primary" onClick={hacerCorte} disabled={guardando} style={{ padding:'10px 20px' }}>
              {guardando?'Guardando...':'🏧 Registrar corte'}
            </button>
            {ok&&<span style={{ fontSize:13,color:'var(--success)' }}>✅ Guardado</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Historial de cortes</div>
        {loading?<div className="loading">Cargando...</div>:cortes.length===0?(
          <div className="empty-state"><div className="empty-icon">🏧</div>Sin cortes registrados</div>
        ):(
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Ventas</th><th>Gastos</th><th>Esperado</th><th>Real</th><th>Diferencia</th><th>Nota</th><th></th></tr></thead>
              <tbody>
                {cortes.map(c=>{
                  const dif=parseFloat(c.diferencia||0)
                  return (
                    <tr key={c.idcorte}>
                      <td style={{ fontSize:12,color:'var(--text2)',whiteSpace:'nowrap' }}>{formatFechaHora(c.fecha)}</td>
                      <td style={{ color:'var(--success)',fontWeight:600 }}>${parseFloat(c.total_ventas).toFixed(2)}</td>
                      <td style={{ color:'var(--danger)' }}>-${parseFloat(c.total_gastos).toFixed(2)}</td>
                      <td style={{ color:'var(--accent)' }}>${(parseFloat(c.total_ventas)-parseFloat(c.total_gastos)).toFixed(2)}</td>
                      <td style={{ fontWeight:600 }}>${parseFloat(c.efectivo_real).toFixed(2)}</td>
                      <td style={{ fontWeight:700,color:Math.abs(dif)<0.01?'var(--success)':dif>0?'var(--accent)':'var(--danger)' }}>
                        {dif>0?'+':''}${dif.toFixed(2)}
                      </td>
                      <td style={{ fontSize:12,color:'var(--text2)' }}>{c.nota||'—'}</td>
                      <td><button className="btn btn-ghost" style={{ fontSize:11,padding:'4px 10px' }} onClick={()=>setCorteDetalle(c)}>Ver detalle</button></td>
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