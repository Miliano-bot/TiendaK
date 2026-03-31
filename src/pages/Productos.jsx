import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const EMPTY = { nombre: '', categoria: '', precio: '', stock: '' }
const CATEGORIAS = ['Ropa', 'Calzado', 'Accesorios', 'Electrónica', 'Hogar', 'Otro']

function getEstado(stock) {
  if (stock === 0) return <span className="badge badge-danger">Sin stock</span>
  if (stock <= 5)  return <span className="badge badge-warn">Stock bajo</span>
  return <span className="badge badge-success">Disponible</span>
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => { fetchProductos() }, [])

  async function fetchProductos() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setProductos(data)
    setLoading(false)
  }

  function openNew() {
    setForm(EMPTY)
    setEditId(null)
    setModal(true)
  }

  function openEdit(p) {
    setForm({ nombre: p.nombre, categoria: p.categoria, precio: p.precio, stock: p.stock })
    setEditId(p.id)
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
      categoria: form.categoria,
      precio: parseFloat(form.precio) || 0,
      stock: parseInt(form.stock) || 0,
    }

    let error
    if (editId) {
      ;({ error } = await supabase.from('productos').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('productos').insert([payload]))
    }

    if (error) alert('Error: ' + error.message)
    else { closeModal(); fetchProductos() }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchProductos()
  }

  return (
    <div>
      <div className="section-header">
        <h2>Productos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      {error && <div className="error-msg">Error: {error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading">Cargando productos...</div>
        ) : productos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            No hay productos. ¡Agrega el primero!
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>{p.categoria}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>{getEstado(p.stock)}</td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(p)}>✏️</button>
                        <button className="icon-btn" title="Eliminar" onClick={() => handleDelete(p.id)}>🗑️</button>
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
          title={editId ? 'Editar producto' : 'Nuevo producto'}
          onClose={closeModal}
          onSave={handleSave}
        >
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Camisa azul"
            />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
            >
              <option value="">-- Seleccionar --</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Precio ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.precio}
              onChange={e => setForm({ ...form, precio: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Stock</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={e => setForm({ ...form, stock: e.target.value })}
              placeholder="0"
            />
          </div>
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}