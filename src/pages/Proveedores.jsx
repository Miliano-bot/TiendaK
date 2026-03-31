import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1
const EMPTY = { nombre: '', telefono: '', correo: '', direccion: '' }

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(EMPTY)
  const [editId,      setEditId]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [buscar,      setBuscar]      = useState('')

  useEffect(() => { fetchProveedores() }, [])

  async function fetchProveedores() {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').eq('idempresa', ID_EMPRESA).order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }

  function openNew()   { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p) { setForm({ nombre: p.nombre, telefono: p.telefono||'', correo: p.correo||'', direccion: p.direccion||'' }); setEditId(p.idproveedor); setModal(true) }
  function close()     { setModal(false); setForm(EMPTY); setEditId(null) }
  function setF(f,v)   { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload = { idempresa: ID_EMPRESA, nombre: form.nombre.trim(), telefono: form.telefono.trim(), correo: form.correo.trim(), direccion: form.direccion.trim() }
    const { error } = editId
      ? await supabase.from('proveedores').update(payload).eq('idproveedor', editId)
      : await supabase.from('proveedores').insert([payload])
    if (error) alert('Error: ' + error.message)
    else { close(); fetchProveedores() }
    setSaving(false)
  }

  async function del(id) {
    if (!confirm('¿Eliminar este proveedor?')) return
    const { error } = await supabase.from('proveedores').delete().eq('idproveedor', id)
    if (error) alert('Error: ' + error.message)
    else fetchProveedores()
  }

  const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(buscar.toLowerCase()))

  return (
    <div>
      <div className="section-header">
        <h2>🚚 Proveedores</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo proveedor</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input className="search-input" placeholder="🔍 Buscar proveedor..." value={buscar} onChange={e => setBuscar(e.target.value)} />
      </div>

      <div className="cards-grid" style={{ marginBottom: 16 }}>
        <div className="metric-card">
          <div className="metric-label">Total proveedores</div>
          <div className="metric-value">{proveedores.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Con correo</div>
          <div className="metric-value">{proveedores.filter(p => p.correo).length}</div>
        </div>
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : filtrados.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🚚</div>{buscar ? 'Sin resultados' : 'No hay proveedores'}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Dirección</th><th></th></tr></thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.idproveedor}>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>{p.telefono || '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{p.correo || '—'}</td>
                    <td style={{ color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.direccion || '—'}</td>
                    <td><div className="actions">
                      <button className="icon-btn" onClick={() => openEdit(p)}>✏️</button>
                      <button className="icon-btn" onClick={() => del(p.idproveedor)}>🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={close} onSave={save}>
          <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e => setF('nombre', e.target.value)} placeholder="Nombre del proveedor" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Teléfono</label><input value={form.telefono} onChange={e => setF('telefono', e.target.value)} placeholder="+593..." /></div>
            <div className="form-group"><label>Correo</label><input type="email" value={form.correo} onChange={e => setF('correo', e.target.value)} placeholder="correo@proveedor.com" /></div>
          </div>
          <div className="form-group"><label>Dirección</label><input value={form.direccion} onChange={e => setF('direccion', e.target.value)} placeholder="Dirección" /></div>
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}