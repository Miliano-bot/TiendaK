import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import { formatFecha, hoyEC, inicioDiaEC, finDiaEC } from '../utils/fecha'

const ID_EMPRESA = 1
const EMPTY = { idcategoria: '', descripcion: '', monto: '', fecha_desde: hoyEC(), fecha_hasta: '' }

export default function Gastos() {
  const [gastos,      setGastos]      = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(EMPTY)
  const [editId,      setEditId]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [desde,       setDesde]       = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}) })
  const [hasta,       setHasta]       = useState(hoyEC)

  useEffect(() => { fetchCategorias() }, [])
  useEffect(() => { fetchGastos() }, [desde, hasta])

  async function fetchCategorias() {
    const { data } = await supabase.from('categoriasgasto').select('*').eq('activo', true).order('nombre')
    setCategorias(data || [])
  }

  async function fetchGastos() {
    setLoading(true)
    const { data } = await supabase.from('gastos').select('*, categoriasgasto(nombre)')
      .eq('idempresa', ID_EMPRESA)
      .gte('fecha', inicioDiaEC(desde))
      .lte('fecha', finDiaEC(hasta))
      .order('fecha', { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }

  function openNew()   { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(g) {
    setForm({
      idcategoria: g.idcategoria || '',
      descripcion: g.descripcion || '',
      monto:       g.monto,
      fecha_desde: g.fecha_desde ? g.fecha_desde.split('T')[0] : g.fecha.split('T')[0],
      fecha_hasta: g.fecha_hasta ? g.fecha_hasta.split('T')[0] : '',
    })
    setEditId(g.idgasto)
    setModal(true)
  }
  function close()   { setModal(false); setForm(EMPTY); setEditId(null) }
  function setF(f,v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.idcategoria) return alert('Selecciona una categoría')
    if (!form.monto || parseFloat(form.monto) <= 0) return alert('El monto debe ser mayor a 0')
    if (!form.fecha_desde) return alert('Ingresa la fecha de inicio')
    setSaving(true)

    const payload = {
      idempresa:   ID_EMPRESA,
      idcategoria: parseInt(form.idcategoria),
      descripcion: form.descripcion.trim(),
      monto:       parseFloat(form.monto),
      fecha:       form.fecha_desde + 'T12:00:00-05:00',
      fecha_desde: form.fecha_desde,
      fecha_hasta: form.fecha_hasta || null,
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

  const totalGastos = gastos.reduce((s, g) => s + parseFloat(g.monto), 0)
  const porCategoria = {}
  gastos.forEach(g => {
    const nombre = g.categoriasgasto?.nombre || 'Sin categoría'
    porCategoria[nombre] = (porCategoria[nombre] || 0) + parseFloat(g.monto)
  })
  const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
  const maxCat = topCategorias[0]?.[1] || 1

  // Verificar si un gasto está activo hoy
  function esActivo(g) {
    const hoy = hoyEC()
    if (g.fecha_hasta && g.fecha_hasta < hoy) return false
    return true
  }

  return (
    <div>
      <div className="section-header">
        <h2>💸 Gastos operativos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo gasto</button>
      </div>

      {/* Filtros fecha */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>DESDE</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(0)}>Hoy</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(7)}>7 días</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => atajo(30)}>30 días</button>
        </div>
      </div>

      <div className="cards-grid" style={{ marginBottom: 16 }}>
        <div className="metric-card" style={{ cursor: 'default' }}>
          <div className="metric-label">Total gastos</div>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>${totalGastos.toFixed(2)}</div>
          <div className="metric-sub">{gastos.length} registros</div>
        </div>
        <div className="metric-card" style={{ cursor: 'default' }}>
          <div className="metric-label">Mayor categoría</div>
          <div className="metric-value" style={{ fontSize: 16 }}>{topCategorias[0]?.[0] || '—'}</div>
          <div className="metric-sub">${(topCategorias[0]?.[1] || 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-title">Por categoría</div>
          {topCategorias.length === 0
            ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sin gastos</p>
            : topCategorias.map(([cat, val]) => (
              <div className="bar-row" key={cat}>
                <span className="bar-label">{cat.substring(0, 12)}</span>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.max(5, (val / maxCat) * 100)}%`, background: 'var(--danger)' }} /></div>
                <span className="bar-val">${val.toFixed(0)}</span>
              </div>
            ))
          }
        </div>
        <div className="panel">
          <div className="panel-title">Últimos gastos</div>
          <div className="recent-list">
            {gastos.slice(0, 5).map(g => (
              <div className="recent-item" key={g.idgasto}>
                <div className="ri-icon" style={{ background: 'rgba(224,82,82,0.15)', color: 'var(--danger)' }}>💸</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="ri-name">{g.descripcion || g.categoriasgasto?.nombre || '—'}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {g.categoriasgasto?.nombre} · {formatFecha(g.fecha)}
                    {g.fecha_hasta && <span style={{ color: esActivo(g) ? 'var(--success)' : 'var(--text2)' }}> · hasta {formatFecha(g.fecha_hasta)}</span>}
                  </p>
                </div>
                <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>${parseFloat(g.monto).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : gastos.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💸</div>Sin gastos en este período</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Desde</th><th>Hasta</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.idgasto}>
                    <td><span className="badge badge-danger">{g.categoriasgasto?.nombre || '—'}</span></td>
                    <td style={{ color: 'var(--text2)' }}>{g.descripcion || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--danger)' }}>${parseFloat(g.monto).toFixed(2)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{formatFecha(g.fecha_desde || g.fecha)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{g.fecha_hasta ? formatFecha(g.fecha_hasta) : <span style={{ color: 'var(--success)' }}>Sin fin</span>}</td>
                    <td><span className={`badge ${esActivo(g) ? 'badge-success' : 'badge-danger'}`}>{esActivo(g) ? 'Activo' : 'Vencido'}</span></td>
                    <td><div className="actions">
                      <button className="icon-btn" onClick={() => openEdit(g)}>✏️</button>
                      <button className="icon-btn" onClick={() => del(g.idgasto)}>🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar gasto' : 'Nuevo gasto'} onClose={close} onSave={save}>
          <div className="form-group">
            <label>Categoría *</label>
            <select value={form.idcategoria} onChange={e => setF('idcategoria', e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="Ej: Pago luz enero" />
          </div>
          <div className="form-group">
            <label>Monto ($) *</label>
            <input type="number" min="0" step="0.01" value={form.monto} onChange={e => setF('monto', e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Fecha inicio *</label>
              <input type="date" value={form.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Fecha fin <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
              <input type="date" value={form.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)} />
              <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Déjalo vacío si es recurrente sin fin</p>
            </div>
          </div>
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}