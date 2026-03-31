import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const EMPTY = { nombre: '', email: '', telefono: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setClientes(data)
    setLoading(false)
  }

  function openNew() {
    setForm(EMPTY)
    setEditId(null)
    setModal(true)
  }

  function openEdit(c) {
    setForm({ nombre: c.nombre, email: c.email, telefono: c.telefono || '' })
    setEditId(c.id)
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setForm(EMPTY)
    setEditId(null)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)

    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
    }

    let error
    if (editId) {
      ;({ error } = await supabase.from('clientes').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('clientes').insert([payload]))
    }

    if (error) alert('Error: ' + error.message)
    else { closeModal(); fetchClientes() }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este cliente?')) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchClientes()
  }

  return (
    <div>
      <div className="section-header">
        <h2>Clientes</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo cliente</button>
      </div>

      {error && <div className="error-msg">Error: {error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            No hay clientes. ¡Agrega el primero!
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>{c.email}</td>
                    <td style={{ color: 'var(--text2)' }}>{c.telefono || '—'}</td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(c)}>✏️</button>
                        <button className="icon-btn" title="Eliminar" onClick={() => handleDelete(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={editId ? 'Editar cliente' : 'Nuevo cliente'}
          onClose={closeModal}
          onSave={handleSave}
        >
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre completo"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
              placeholder="+593..."
            />
          </div>
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}