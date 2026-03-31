import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1
const UNIDADES_DEFAULT = ['Unidad', 'Docena', 'Par', 'Paquete', 'Caja', 'Kg', 'Gramo', 'Libra', 'Litro', 'Ml']

function SeccionCategorias() {
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState({ nombre: '', descripcion: '' })
  const [editId,     setEditId]     = useState(null)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { fetchCategorias() }, [])

  async function fetchCategorias() {
    setLoading(true)
    const { data } = await supabase.from('categorias').select('*').eq('idempresa', ID_EMPRESA).order('nombre')
    setCategorias(data || [])
    setLoading(false)
  }

  function openNew()   { setForm({ nombre: '', descripcion: '' }); setEditId(null); setModal(true) }
  function openEdit(c) { setForm({ nombre: c.nombre, descripcion: c.descripcion || '' }); setEditId(c.idcategoria); setModal(true) }
  function closeModal(){ setModal(false); setForm({ nombre: '', descripcion: '' }); setEditId(null) }

  async function handleSave() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload = { idempresa: ID_EMPRESA, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() }
    const { error } = editId
      ? await supabase.from('categorias').update(payload).eq('idcategoria', editId)
      : await supabase.from('categorias').insert([payload])
    if (error) alert('Error: ' + error.message)
    else { closeModal(); fetchCategorias() }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta categoría?')) return
    const { error } = await supabase.from('categorias').delete().eq('idcategoria', id)
    if (error) alert('Error: ' + error.message)
    else fetchCategorias()
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>🏷️ Categorías</p>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Categorías para organizar productos</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nueva</button>
      </div>

      {loading ? <div className="loading">Cargando...</div> : categorias.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏷️</div>No hay categorías</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
            <tbody>
              {categorias.map(c => (
                <tr key={c.idcategoria}>
                  <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                  <td style={{ color: 'var(--text2)' }}>{c.descripcion || '—'}</td>
                  <td><div className="actions">
                    <button className="icon-btn" onClick={() => openEdit(c)}>✏️</button>
                    <button className="icon-btn" onClick={() => handleDelete(c.idcategoria)}>🗑️</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editId ? 'Editar categoría' : 'Nueva categoría'} onClose={closeModal} onSave={handleSave}>
          <div className="form-group">
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Bebidas" />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional" />
          </div>
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}

function SeccionUnidades() {
  const [unidades, setUnidades] = useState([])
  const [nueva,    setNueva]    = useState('')

  useEffect(() => {
    const guardadas = localStorage.getItem('unidades_custom')
    setUnidades(guardadas ? JSON.parse(guardadas) : UNIDADES_DEFAULT)
  }, [])

  function guardar(lista) { setUnidades(lista); localStorage.setItem('unidades_custom', JSON.stringify(lista)) }
  function agregar() {
    if (!nueva.trim()) return
    if (unidades.map(u => u.toLowerCase()).includes(nueva.trim().toLowerCase())) return alert('Esa unidad ya existe')
    guardar([...unidades, nueva.trim()]); setNueva('')
  }
  function eliminar(u) {
    if (!confirm(`¿Eliminar "${u}"?`)) return
    guardar(unidades.filter(x => x !== u))
  }

  return (
    <div className="panel">
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 15 }}>📏 Unidades de medida</p>
        <p style={{ fontSize: 12, color: 'var(--text2)' }}>Unidades disponibles al crear productos</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={{ flex: 1, padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
          placeholder="Nueva unidad (Ej: Quintal)"
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
        />
        <button className="btn btn-primary" onClick={agregar}>Agregar</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {unidades.map(u => (
          <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 14px' }}>
            <span style={{ fontSize: 13 }}>{u}</span>
            <button onClick={() => eliminar(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 16, padding: 0 }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Maestros() {
  return (
    <div>
      <SeccionCategorias />
      <SeccionUnidades />
    </div>
  )
}