import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import { formatFecha, hoyEC, inicioDiaEC, finDiaEC } from '../utils/fecha'

const ID_EMPRESA = 1

const EMPTY = {
  idcategoria: '',
  descripcion: '',
  monto:       '',
  tipo:        'unico',      // 'unico' | 'recurrente'
  fecha:       hoyEC(),      // para pago único
  fecha_desde: hoyEC(),      // para recurrente
  fecha_hasta: '',           // para recurrente, vacío = sin fin
}

export default function Gastos() {
  const [gastos,     setGastos]     = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [editId,     setEditId]     = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [desde,      setDesde]      = useState(() => {
    const d = new Date(); d.setDate(d.getDate()-30)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  })
  const [hasta, setHasta] = useState(hoyEC)

  useEffect(() => { fetchCategorias() }, [])
  useEffect(() => { fetchGastos() }, [desde, hasta, filtroTipo])

  async function fetchCategorias() {
    const { data } = await supabase.from('categoriasgasto').select('*').eq('activo', true).order('nombre')
    setCategorias(data || [])
  }

  async function fetchGastos() {
    setLoading(true)
    let q = supabase.from('gastos')
      .select('*, categoriasgasto(nombre)')
      .eq('idempresa', ID_EMPRESA)
      .gte('fecha', inicioDiaEC(desde))
      .lte('fecha', finDiaEC(hasta))
      .order('fecha', { ascending: false })
    if (filtroTipo !== 'todos') q = q.eq('tipo', filtroTipo)
    const { data } = await q
    setGastos(data || [])
    setLoading(false)
  }

  function openNew()   { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(g) {
    setForm({
      idcategoria: g.idcategoria || '',
      descripcion: g.descripcion || '',
      monto:       g.monto,
      tipo:        g.tipo || 'unico',
      fecha:       g.fecha ? g.fecha.split('T')[0] : hoyEC(),
      fecha_desde: g.fecha_desde || hoyEC(),
      fecha_hasta: g.fecha_hasta || '',
    })
    setEditId(g.idgasto)
    setModal(true)
  }
  function close()   { setModal(false); setForm(EMPTY); setEditId(null) }
  function setF(f,v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.idcategoria)                          return alert('Selecciona una categoría')
    if (!form.monto || parseFloat(form.monto) <= 0) return alert('El monto debe ser mayor a 0')

    setSaving(true)
    const fechaGuardar = form.tipo === 'unico' ? form.fecha : form.fecha_desde
    const payload = {
      idempresa:   ID_EMPRESA,
      idcategoria: parseInt(form.idcategoria),
      descripcion: form.descripcion.trim(),
      monto:       parseFloat(form.monto),
      tipo:        form.tipo,
      fecha:       fechaGuardar + 'T12:00:00-05:00',
      fecha_desde: form.tipo === 'recurrente' ? form.fecha_desde : null,
      fecha_hasta: form.tipo === 'recurrente' && form.fecha_hasta ? form.fecha_hasta : null,
    }

    const { error } = editId
      ? await supabase.from('gastos').update(payload).eq('idgasto', editId)
      : await supabase.from('gastos').insert([payload])
    if (error) alert('Error: ' + error.message)
    else { close(); fetchGastos() }
    setSaving(false)
  }

  async function del(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('idgasto', id)
    if (error) alert('Error: ' + error.message)
    else fetchGastos()
  }

  const atajo = (days) => {
    const h = hoyEC()
    const d = new Date(); d.setDate(d.getDate() - days)
    setHasta(h); setDesde(d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }))
  }

  function esActivo(g) {
    if (g.tipo !== 'recurrente') return true
    const hoy = hoyEC()
    if (g.fecha_hasta && g.fecha_hasta < hoy) return false
    return true
  }

  const totalGastos = gastos.reduce((s, g) => s + parseFloat(g.monto), 0)
  const porCategoria = {}
  gastos.forEach(g => {
    const nom = g.categoriasgasto?.nombre || 'Sin categoría'
    porCategoria[nom] = (porCategoria[nom] || 0) + parseFloat(g.monto)
  })
  const topCategorias = Object.entries(porCategoria).sort((a,b) => b[1]-a[1])
  const maxCat = topCategorias[0]?.[1] || 1

  return (
    <div>
      <div className="section-header">
        <h2>💸 Gastos operativos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo gasto</button>
      </div>

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
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => atajo(0)}>Hoy</button>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => atajo(7)}>7 días</button>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => atajo(30)}>30 días</button>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['todos','unico','recurrente'].map(t => (
            <button key={t} className={`btn ${filtroTipo===t?'btn-primary':'btn-ghost'}`} style={{ fontSize:12 }} onClick={() => setFiltroTipo(t)}>
              {t==='todos'?'Todos':t==='unico'?'💳 Únicos':'🔄 Recurrentes'}
            </button>
          ))}
        </div>
      </div>

      <div className="cards-grid" style={{ marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}>
          <div className="metric-label">Total gastos</div>
          <div className="metric-value" style={{ color:'var(--danger)' }}>${totalGastos.toFixed(2)}</div>
          <div className="metric-sub">{gastos.length} registros</div>
        </div>
        <div className="metric-card" style={{ cursor:'default' }}>
          <div className="metric-label">Mayor categoría</div>
          <div className="metric-value" style={{ fontSize:16 }}>{topCategorias[0]?.[0]||'—'}</div>
          <div className="metric-sub">${(topCategorias[0]?.[1]||0).toFixed(2)}</div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom:16 }}>
        <div className="panel">
          <div className="panel-title">Por categoría</div>
          {topCategorias.length===0
            ? <p style={{ color:'var(--text2)', fontSize:13 }}>Sin gastos</p>
            : topCategorias.map(([cat,val]) => (
              <div className="bar-row" key={cat}>
                <span className="bar-label">{cat.substring(0,12)}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width:`${Math.max(5,(val/maxCat)*100)}%`, background:'var(--danger)' }} /></div>
                <span className="bar-val">${val.toFixed(0)}</span>
              </div>
            ))
          }
        </div>
        <div className="panel">
          <div className="panel-title">Últimos gastos</div>
          <div className="recent-list">
            {gastos.slice(0,5).map(g => (
              <div className="recent-item" key={g.idgasto}>
                <div className="ri-icon" style={{ background:'rgba(224,82,82,0.15)', color:'var(--danger)' }}>
                  {g.tipo==='recurrente'?'🔄':'💳'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p className="ri-name">{g.descripcion||g.categoriasgasto?.nombre||'—'}</p>
                  <p style={{ fontSize:11, color:'var(--text2)' }}>{g.categoriasgasto?.nombre} · {formatFecha(g.fecha)}</p>
                </div>
                <span style={{ color:'var(--danger)', fontWeight:600, fontSize:13 }}>${parseFloat(g.monto).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : gastos.length===0 ? (
          <div className="empty-state"><div className="empty-icon">💸</div>Sin gastos en este período</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Fecha / Período</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.idgasto}>
                    <td>
                      <span className={`badge ${g.tipo==='recurrente'?'badge-accent':'badge-success'}`}>
                        {g.tipo==='recurrente'?'🔄 Recurrente':'💳 Único'}
                      </span>
                    </td>
                    <td style={{ color:'var(--text2)' }}>{g.categoriasgasto?.nombre||'—'}</td>
                    <td style={{ color:'var(--text2)' }}>{g.descripcion||'—'}</td>
                    <td style={{ fontWeight:600, color:'var(--danger)' }}>${parseFloat(g.monto).toFixed(2)}</td>
                    <td style={{ fontSize:12, color:'var(--text2)' }}>
                      {g.tipo==='recurrente'
                        ? <span>{formatFecha(g.fecha_desde)} → {g.fecha_hasta ? formatFecha(g.fecha_hasta) : <span style={{ color:'var(--success)' }}>Sin fin</span>}</span>
                        : formatFecha(g.fecha)
                      }
                    </td>
                    <td>
                      {g.tipo==='recurrente'
                        ? <span className={`badge ${esActivo(g)?'badge-success':'badge-danger'}`}>{esActivo(g)?'Activo':'Vencido'}</span>
                        : <span className="badge badge-success">Pagado</span>
                      }
                    </td>
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

      {modal && (
        <Modal title={editId?'Editar gasto':'Nuevo gasto'} onClose={close} onSave={save}>

          {/* Tipo de gasto */}
          <div style={{ display:'flex', gap:0, marginBottom:16, background:'var(--bg3)', borderRadius:10, padding:4 }}>
            {[['unico','💳 Pago único'],['recurrente','🔄 Recurrente']].map(([t,l]) => (
              <button key={t} onClick={() => setF('tipo',t)} type="button" style={{
                flex:1, padding:'8px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                background: form.tipo===t ? 'var(--accent)' : 'transparent',
                color: form.tipo===t ? '#fff' : 'var(--text2)', transition:'all 0.2s',
              }}>{l}</button>
            ))}
          </div>

          {form.tipo==='unico' && (
            <div style={{ background:'rgba(76,175,135,0.08)', border:'1px solid rgba(76,175,135,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:'var(--text2)' }}>
              💳 Pago único — se registra una sola vez en una fecha específica. Ej: compra de materiales, pago de servicio puntual.
            </div>
          )}
          {form.tipo==='recurrente' && (
            <div style={{ background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:'var(--text2)' }}>
              🔄 Recurrente — gasto que se repite. Ej: arriendo mensual, suscripción de internet. Define desde cuándo y hasta cuándo.
            </div>
          )}

          <div className="form-group">
            <label>Categoría *</label>
            <select value={form.idcategoria} onChange={e=>setF('idcategoria',e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c=><option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e=>setF('descripcion',e.target.value)} placeholder={form.tipo==='recurrente'?'Ej: Arriendo local centro':'Ej: Compra escoba'} />
          </div>

          <div className="form-group">
            <label>Monto ($) *</label>
            <input type="number" min="0" step="0.01" value={form.monto} onChange={e=>setF('monto',e.target.value)} placeholder="0.00" />
          </div>

          {form.tipo==='unico' ? (
            <div className="form-group">
              <label>Fecha del pago *</label>
              <input type="date" value={form.fecha} onChange={e=>setF('fecha',e.target.value)} />
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label>Desde *</label>
                <input type="date" value={form.fecha_desde} onChange={e=>setF('fecha_desde',e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hasta <span style={{ color:'var(--text2)', fontWeight:400 }}>(opcional)</span></label>
                <input type="date" value={form.fecha_hasta} onChange={e=>setF('fecha_hasta',e.target.value)} />
                <p style={{ fontSize:11, color:'var(--text2)', marginTop:4 }}>Vacío = sin fecha de fin</p>
              </div>
            </div>
          )}

          {saving && <p style={{ fontSize:13, color:'var(--text2)', marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}