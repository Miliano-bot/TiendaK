import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1 // 👈 cambia esto por el IdEmpresa de tu empresa

const TIPOS_ID = ['Cédula', 'RUC', 'Pasaporte', 'Otro']

const EMPTY = {
  nombre:             '',
  tipo_identificacion: '',
  identificacion:     '',
  telefono:           '',
  correo:             '',
  direccion:          '',
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('idempresa', ID_EMPRESA)
      .order('nombre')
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
    setForm({
      nombre:              c.nombre,
      tipo_identificacion: c.tipo_identificacion || '',
      identificacion:      c.identificacion      || '',
      telefono:            c.telefono            || '',
      correo:              c.correo              || '',
      direccion:           c.direccion           || '',
    })
    setEditId(c.idcliente)
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setForm(EMPTY)
    setEditId(null)
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)

    const payload = {
      idempresa:           ID_EMPRESA,
      nombre:              form.nombre.trim(),
      tipo_identificacion: form.tipo_identificacion,
      identificacion:      form.identificacion.trim(),
      telefono:            form.telefono.trim(),
      correo:              form.correo.trim(),
      direccion:           form.direccion.trim(),
    }

    let error
    if (editId) {
      ;({ error } = await supabase.from('clientes').update(payload).eq('idcliente', editId))
    } else {
      ;({ error } = await supabase.from('clientes').insert([payload]))
    }

    if (error) alert('Error: ' + error.message)
    else { closeModal(); fetchClientes() }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('clientes').delete().eq('idcliente', id)
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
                  <th>Identificación</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Dirección</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.idcliente}>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>
                      {c.tipo_identificacion && (
                        <span className="badge badge-success" style={{ marginRight: 6, fontSize: 10 }}>
                          {c.tipo_identificacion}
                        </span>
                      )}
                      {c.identificacion || '—'}
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{c.telefono || '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{c.correo   || '—'}</td>
                    <td style={{ color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.direccion || '—'}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="Editar"    onClick={() => openEdit(c)}>✏️</button>
                        <button className="icon-btn" title="Eliminar"  onClick={() => handleDelete(c.idcliente)}>🗑️</button>
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
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Tipo identificación</label>
              <select value={form.tipo_identificacion} onChange={e => set('tipo_identificacion', e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {TIPOS_ID.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Número</label>
              <input value={form.identificacion} onChange={e => set('identificacion', e.target.value)} placeholder="0000000000" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+593..." />
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Dirección completa" />
          </div>
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}