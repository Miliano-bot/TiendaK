import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import { formatFecha, hoyEC, inicioDiaEC, finDiaEC } from '../utils/fecha'
import { getPeriodo, estaPendiente } from '../hooks/useNotificaciones'

const ID_EMPRESA = 1

const CICLOS = [
  { id: 'semanal',     label: 'Semanal',     desc: 'Cada semana' },
  { id: 'mensual',     label: 'Mensual',     desc: 'Cada mes' },
  { id: 'trimestral',  label: 'Trimestral',  desc: 'Cada 3 meses' },
  { id: 'anual',       label: 'Anual',       desc: 'Cada año' },
]

const DIAS_MES   = Array.from({length:28},(_,i)=>i+1)
const MESES      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EMPTY_UNICO = { idcategoria:'', descripcion:'', monto:'', fecha: hoyEC() }
const EMPTY_PROG  = { idcategoria:'', nombre:'', descripcion:'', monto_base:'', ciclo:'mensual', dia_pago:'1', mes_pago:'1', fecha_inicio: hoyEC(), fecha_fin:'' }

// ── Tab: Gastos únicos ────────────────────────────────────────
function GastosUnicos({ categorias, onCambio }) {
  const [gastos,  setGastos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY_UNICO)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [desde,   setDesde]   = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}) })
  const [hasta,   setHasta]   = useState(hoyEC)

  useEffect(() => { fetchGastos() }, [desde, hasta])

  async function fetchGastos() {
    setLoading(true)
    const { data } = await supabase.from('gastos').select('*,categoriasgasto(nombre)')
      .eq('idempresa',ID_EMPRESA).eq('tipo','unico')
      .gte('fecha', inicioDiaEC(desde)).lte('fecha', finDiaEC(hasta))
      .order('fecha',{ascending:false})
    setGastos(data||[])
    setLoading(false)
  }

  function openNew()   { setForm(EMPTY_UNICO); setEditId(null); setModal(true) }
  function openEdit(g) { setForm({ idcategoria:g.idcategoria||'', descripcion:g.descripcion||'', monto:g.monto, fecha:g.fecha.split('T')[0] }); setEditId(g.idgasto); setModal(true) }
  function close()     { setModal(false); setForm(EMPTY_UNICO); setEditId(null) }
  function setF(f,v)   { setForm(p=>({...p,[f]:v})) }

  async function save() {
    if (!form.idcategoria)                          return alert('Selecciona una categoría')
    if (!form.monto||parseFloat(form.monto)<=0)     return alert('El monto debe ser mayor a 0')
    setSaving(true)
    const payload = { idempresa:ID_EMPRESA, idcategoria:parseInt(form.idcategoria), descripcion:form.descripcion.trim(), monto:parseFloat(form.monto), tipo:'unico', fecha:form.fecha+'T12:00:00-05:00' }
    const{error}=editId ? await supabase.from('gastos').update(payload).eq('idgasto',editId) : await supabase.from('gastos').insert([payload])
    if(error) alert('Error: '+error.message); else { close(); fetchGastos(); onCambio?.() }
    setSaving(false)
  }

  async function del(id) {
    if(!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('idgasto',id)
    fetchGastos(); onCambio?.()
  }

  const atajo=(days)=>{ const h=hoyEC(); const d=new Date(); d.setDate(d.getDate()-days); setHasta(h); setDesde(d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'})) }
  const total = gastos.reduce((s,g)=>s+parseFloat(g.monto),0)

  return (
    <div>
      <div style={{ display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'flex-end' }}>
        <div><label style={{ fontSize:11,color:'var(--text2)',display:'block',marginBottom:4 }}>DESDE</label>
          <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{ padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }} /></div>
        <div><label style={{ fontSize:11,color:'var(--text2)',display:'block',marginBottom:4 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{ padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }} /></div>
        <div style={{ display:'flex',gap:6 }}>
          {[['Hoy',0],['7d',7],['30d',30]].map(([l,d])=>(
            <button key={l} className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>atajo(d)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={openNew}>+ Nuevo gasto</button>
      </div>

      <div className="cards-grid" style={{ marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Total período</div><div className="metric-value" style={{ color:'var(--danger)' }}>${total.toFixed(2)}</div></div>
        <div className="metric-card" style={{ cursor:'default' }}><div className="metric-label">Registros</div><div className="metric-value">{gastos.length}</div></div>
      </div>

      <div className="panel">
        {loading?<div className="loading">Cargando...</div>:gastos.length===0?(
          <div className="empty-state"><div className="empty-icon">💳</div>Sin gastos únicos en este período</div>
        ):(
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th></th></tr></thead>
              <tbody>
                {gastos.map(g=>(
                  <tr key={g.idgasto}>
                    <td style={{ fontSize:12,color:'var(--text2)',whiteSpace:'nowrap' }}>{formatFecha(g.fecha)}</td>
                    <td><span className="badge badge-danger">{g.categoriasgasto?.nombre||'—'}</span></td>
                    <td style={{ color:'var(--text2)' }}>{g.descripcion||'—'}</td>
                    <td style={{ fontWeight:600,color:'var(--danger)' }}>${parseFloat(g.monto).toFixed(2)}</td>
                    <td><div className="actions">
                      <button className="icon-btn" onClick={()=>openEdit(g)}>✏️</button>
                      <button className="icon-btn" onClick={()=>del(g.idgasto)}>🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal&&(
        <Modal title={editId?'Editar gasto':'Nuevo gasto único'} onClose={close} onSave={save}>
          <p style={{ fontSize:12,color:'var(--text2)',marginBottom:14 }}>💳 Un pago puntual en una fecha específica.</p>
          <div className="form-group"><label>Categoría *</label>
            <select value={form.idcategoria} onChange={e=>setF('idcategoria',e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c=><option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select></div>
          <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={e=>setF('descripcion',e.target.value)} placeholder="Ej: Compra escoba" /></div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label>Monto ($) *</label><input type="number" min="0" step="0.01" value={form.monto} onChange={e=>setF('monto',e.target.value)} placeholder="0.00" /></div>
            <div className="form-group"><label>Fecha *</label><input type="date" value={form.fecha} onChange={e=>setF('fecha',e.target.value)} /></div>
          </div>
          {saving&&<p style={{ fontSize:13,color:'var(--text2)',marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Gastos programados ───────────────────────────────────
function GastosProgramados({ categorias, onCambio }) {
  const [programados,   setProgramados]   = useState([])
  const [pagos,         setPagos]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [modalPago,     setModalPago]     = useState(null) // gasto a pagar
  const [form,          setForm]          = useState(EMPTY_PROG)
  const [editId,        setEditId]        = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [montoPago,     setMontoPago]     = useState('')
  const [notaPago,      setNotaPago]      = useState('')

  useEffect(() => { fetchTodo() }, [])

  async function fetchTodo() {
    setLoading(true)
    const [{data:progs},{data:pgs}]=await Promise.all([
      supabase.from('gastosprogramados').select('*,categoriasgasto(nombre)').eq('idempresa',ID_EMPRESA).order('nombre'),
      supabase.from('pagos_gastos').select('*'),
    ])
    setProgramados(progs||[])
    setPagos(pgs||[])
    setLoading(false)
  }

  function openNew()   { setForm(EMPTY_PROG); setEditId(null); setModal(true) }
  function openEdit(g) {
    setForm({ idcategoria:g.idcategoria||'', nombre:g.nombre, descripcion:g.descripcion||'', monto_base:g.monto_base, ciclo:g.ciclo, dia_pago:g.dia_pago||'1', mes_pago:g.mes_pago||'1', fecha_inicio:g.fecha_inicio, fecha_fin:g.fecha_fin||'' })
    setEditId(g.idprogramado); setModal(true)
  }
  function setF(f,v) { setForm(p=>({...p,[f]:v})) }

  async function save() {
    if (!form.nombre.trim())                          return alert('El nombre es obligatorio')
    if (!form.monto_base||parseFloat(form.monto_base)<=0) return alert('El monto debe ser mayor a 0')
    setSaving(true)
    const payload={ idempresa:ID_EMPRESA, idcategoria:form.idcategoria?parseInt(form.idcategoria):null, nombre:form.nombre.trim(), descripcion:form.descripcion.trim(), monto_base:parseFloat(form.monto_base), ciclo:form.ciclo, dia_pago:parseInt(form.dia_pago)||null, mes_pago:parseInt(form.mes_pago)||null, fecha_inicio:form.fecha_inicio, fecha_fin:form.fecha_fin||null, activo:true }
    const{error}=editId ? await supabase.from('gastosprogramados').update(payload).eq('idprogramado',editId) : await supabase.from('gastosprogramados').insert([payload])
    if(error) alert('Error: '+error.message); else { setModal(false); setForm(EMPTY_PROG); setEditId(null); fetchTodo(); onCambio?.() }
    setSaving(false)
  }

  async function toggleActivo(g) {
    await supabase.from('gastosprogramados').update({activo:!g.activo}).eq('idprogramado',g.idprogramado)
    fetchTodo(); onCambio?.()
  }

  async function registrarPago(gasto, estado) {
    setSaving(true)
    const periodo = getPeriodo(gasto.ciclo)
    const monto   = parseFloat(montoPago)||parseFloat(gasto.monto_base)

    // Registrar pago en pagos_gastos
    await supabase.from('pagos_gastos').upsert([{
      idprogramado: gasto.idprogramado,
      periodo,
      monto_pagado: estado==='pagado' ? monto : null,
      estado,
     fecha_pago: estado === 'pagado'
  ? new Date().toLocaleString('sv-SE', {
      timeZone: 'America/Guayaquil'
    }).replace(' ', 'T') + '-05:00'
  : null,
      nota:         notaPago.trim()||null,
    }], { onConflict: 'idprogramado,periodo' })

    // Si se pagó, registrar también en gastos para el corte de caja
    if (estado==='pagado') {
      await supabase.from('gastos').insert([{
        idempresa:   ID_EMPRESA,
        idcategoria: gasto.idcategoria,
        descripcion: `${gasto.nombre} · ${periodo}`,
        monto,
        tipo:        'unico',
        fecha: new Date().toLocaleString('sv-SE', {
  timeZone: 'America/Guayaquil'
}).replace(' ', 'T') + '-05:00',
      }])
    }

    setModalPago(null); setMontoPago(''); setNotaPago('')
    fetchTodo(); onCambio?.()
    setSaving(false)
  }

  function getPagoActual(g) {
    return pagos.find(p=>p.idprogramado===g.idprogramado && p.periodo===getPeriodo(g.ciclo))
  }

  function getLabelCiclo(g) {
    if (g.ciclo==='mensual')    return `Día ${g.dia_pago} de cada mes`
    if (g.ciclo==='semanal')    return 'Cada semana'
    if (g.ciclo==='trimestral') return 'Cada trimestre'
    if (g.ciclo==='anual')      return `${MESES[(g.mes_pago||1)-1]} de cada año`
    return g.ciclo
  }

  const pendientes = programados.filter(g=>g.activo && estaPendiente(g,pagos))
  const activos    = programados.filter(g=>g.activo && !estaPendiente(g,pagos))
  const inactivos  = programados.filter(g=>!g.activo)

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:14 }}>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo gasto recurrente</button>
      </div>

      {/* Pendientes de pago */}
      {pendientes.length>0&&(
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:13,fontWeight:600,color:'var(--warn)',marginBottom:10 }}>⏰ Pendientes de pago este período</p>
          {pendientes.map(g=>{
            const pagoActual=getPagoActual(g)
            return (
              <div key={g.idprogramado} style={{ background:'rgba(245,166,35,0.08)',border:'1px solid rgba(245,166,35,0.25)',borderRadius:10,padding:'14px 16px',marginBottom:8 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10 }}>
                  <div>
                    <p style={{ fontWeight:600,fontSize:14 }}>{g.nombre}</p>
                    <p style={{ fontSize:12,color:'var(--text2)' }}>{getLabelCiclo(g)} · ${parseFloat(g.monto_base).toFixed(2)}</p>
                    <p style={{ fontSize:11,color:'var(--text2)' }}>Período: {getPeriodo(g.ciclo)}</p>
                  </div>
                  <div style={{ display:'flex',gap:8 }}>
                    <button className="btn btn-primary" style={{ fontSize:12 }} onClick={()=>{ setModalPago(g); setMontoPago(String(g.monto_base)) }}>✅ Pagar</button>
                    <button className="btn btn-ghost"   style={{ fontSize:12 }} onClick={()=>registrarPago(g,'omitido')}>✖ No pagar</button>
                    <button className="icon-btn" onClick={()=>openEdit(g)}>✏️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Activos al día */}
      {activos.length>0&&(
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:13,fontWeight:600,color:'var(--text2)',marginBottom:10 }}>✅ Al día</p>
          {activos.map(g=>{
            const p=getPagoActual(g)
            return (
              <div key={g.idprogramado} style={{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
                <div>
                  <p style={{ fontWeight:500,fontSize:13 }}>{g.nombre}</p>
                  <p style={{ fontSize:11,color:'var(--text2)' }}>{getLabelCiclo(g)} · ${parseFloat(g.monto_base).toFixed(2)}</p>
                  {p&&<span className="badge badge-success" style={{ fontSize:10,marginTop:4 }}>Pagado {p.monto_pagado?`$${parseFloat(p.monto_pagado).toFixed(2)}`:''}</span>}
                </div>
                <div style={{ display:'flex',gap:6 }}>
                  <button className="icon-btn" onClick={()=>openEdit(g)}>✏️</button>
                  <button className="icon-btn" onClick={()=>toggleActivo(g)} title="Desactivar">⏸️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Inactivos */}
      {inactivos.length>0&&(
        <div>
          <p style={{ fontSize:12,color:'var(--text2)',marginBottom:8 }}>Inactivos</p>
          {inactivos.map(g=>(
            <div key={g.idprogramado} style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center',opacity:0.6 }}>
              <p style={{ fontSize:13 }}>{g.nombre} — ${parseFloat(g.monto_base).toFixed(2)}</p>
              <button className="btn btn-ghost" style={{ fontSize:11 }} onClick={()=>toggleActivo(g)}>Reactivar</button>
            </div>
          ))}
        </div>
      )}

      {loading&&<div className="loading">Cargando...</div>}
      {!loading&&programados.length===0&&<div className="empty-state"><div className="empty-icon">🔄</div>No hay gastos recurrentes</div>}

      {/* Modal crear/editar programado */}
      {modal&&(
        <Modal title={editId?'Editar gasto recurrente':'Nuevo gasto recurrente'} onClose={()=>{setModal(false);setForm(EMPTY_PROG);setEditId(null)}} onSave={save}>
          <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e=>setF('nombre',e.target.value)} placeholder="Ej: Arriendo local" /></div>
          <div className="form-group"><label>Categoría</label>
            <select value={form.idcategoria} onChange={e=>setF('idcategoria',e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c=><option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select></div>
          <div className="form-group"><label>Monto base ($) *</label><input type="number" min="0" step="0.01" value={form.monto_base} onChange={e=>setF('monto_base',e.target.value)} placeholder="0.00" /></div>
          <div className="form-group"><label>Ciclo de pago *</label>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              {CICLOS.map(c=>(
                <button key={c.id} type="button" onClick={()=>setF('ciclo',c.id)} style={{ padding:'10px',borderRadius:8,border:`1px solid ${form.ciclo===c.id?'var(--accent)':'var(--border)'}`,background:form.ciclo===c.id?'rgba(108,99,255,0.15)':'var(--bg3)',cursor:'pointer',textAlign:'left' }}>
                  <p style={{ fontSize:13,fontWeight:500,color:form.ciclo===c.id?'var(--accent)':'var(--text)' }}>{c.label}</p>
                  <p style={{ fontSize:11,color:'var(--text2)' }}>{c.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {(form.ciclo==='mensual'||form.ciclo==='trimestral')&&(
            <div className="form-group"><label>Día del mes para el pago</label>
              <select value={form.dia_pago} onChange={e=>setF('dia_pago',e.target.value)}>
                {DIAS_MES.map(d=><option key={d} value={d}>Día {d}</option>)}
              </select></div>
          )}
          {form.ciclo==='anual'&&(
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div className="form-group"><label>Mes del pago</label>
                <select value={form.mes_pago} onChange={e=>setF('mes_pago',e.target.value)}>
                  {MESES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select></div>
              <div className="form-group"><label>Día del mes</label>
                <select value={form.dia_pago} onChange={e=>setF('dia_pago',e.target.value)}>
                  {DIAS_MES.map(d=><option key={d} value={d}>Día {d}</option>)}
                </select></div>
            </div>
          )}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label>Fecha inicio *</label><input type="date" value={form.fecha_inicio} onChange={e=>setF('fecha_inicio',e.target.value)} /></div>
            <div className="form-group"><label>Fecha fin <span style={{ color:'var(--text2)',fontWeight:400 }}>(opcional)</span></label><input type="date" value={form.fecha_fin} onChange={e=>setF('fecha_fin',e.target.value)} /></div>
          </div>
          {saving&&<p style={{ fontSize:13,color:'var(--text2)',marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}

      {/* Modal pagar */}
      {modalPago&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalPago(null)}>
          <div className="modal">
            <h3>Registrar pago: {modalPago.nombre}</h3>
            <div style={{ background:'var(--bg3)',borderRadius:8,padding:'12px 14px',marginBottom:14 }}>
              <p style={{ fontSize:12,color:'var(--text2)' }}>Monto base: ${parseFloat(modalPago.monto_base).toFixed(2)}</p>
              <p style={{ fontSize:12,color:'var(--text2)' }}>Período: {getPeriodo(modalPago.ciclo)}</p>
            </div>
            <div className="form-group">
              <label>Monto pagado ($) <span style={{ color:'var(--text2)',fontWeight:400 }}>(puede diferir del base)</span></label>
              <input type="number" min="0" step="0.01" value={montoPago} onChange={e=>setMontoPago(e.target.value)} placeholder={String(modalPago.monto_base)} />
            </div>
            <div className="form-group"><label>Nota</label><input value={notaPago} onChange={e=>setNotaPago(e.target.value)} placeholder="Opcional" /></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalPago(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={()=>registrarPago(modalPago,'pagado')} disabled={saving}>
                {saving?'Guardando...':'✅ Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Gastos({ onCambio }) {
  const [tab,        setTab]        = useState('unicos')
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    supabase.from('categoriasgasto').select('*').eq('activo',true).order('nombre')
      .then(({data})=>setCategorias(data||[]))
  }, [])

  return (
    <div>
      <div style={{ display:'flex',gap:0,marginBottom:20,background:'var(--bg2)',borderRadius:10,padding:4,border:'1px solid var(--border)' }}>
        {[['unicos','💳 Pagos únicos'],['programados','🔄 Recurrentes']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1,padding:'9px 8px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,
            background:tab===id?'var(--accent)':'transparent',
            color:tab===id?'#fff':'var(--text2)',transition:'all 0.2s',
          }}>{label}</button>
        ))}
      </div>
      {tab==='unicos'      && <GastosUnicos      categorias={categorias} onCambio={onCambio} />}
      {tab==='programados' && <GastosProgramados categorias={categorias} onCambio={onCambio} />}
    </div>
  )
}