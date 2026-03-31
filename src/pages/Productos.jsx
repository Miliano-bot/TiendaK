import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1 // 👈 cambia esto por el IdEmpresa de tu empresa

const EMPTY = {
  nombre: '',
  codigo_barras: '',
  idcategoria: '',
  descripcion: '',
  precio: '',
  cantidad: '',
  imagen: '',
  discontinuado: false,
}

function EstadoBadge({ discontinuado }) {
  return discontinuado
    ? <span className="badge badge-danger">Discontinuado</span>
    : <span className="badge badge-success">Activo</span>
}

function StockBadge({ cantidad }) {
  if (cantidad === 0)  return <span className="badge badge-danger">Sin stock</span>
  if (cantidad <= 5)   return <span className="badge badge-warn">Stock bajo</span>
  return <span className="badge badge-success">{cantidad}</span>
}

export default function Productos() {
  const [productos,   setProductos]   = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(EMPTY)
  const [editId,      setEditId]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [soloActivos, setSoloActivos] = useState(true)

  useEffect(() => {
    fetchCategorias()
    fetchProductos()
  }, [soloActivos])

  async function fetchCategorias() {
    const { data } = await supabase
      .from('categorias')
      .select('idcategoria, nombre')
      .eq('idempresa', ID_EMPRESA)
      .order('nombre')
    setCategorias(data || [])
  }

  async function fetchProductos() {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('idempresa', ID_EMPRESA)
      .order('nombre')

    if (soloActivos) query = query.eq('discontinuado', false)

    const { data, error } = await query
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
    setForm({
      nombre:        p.nombre,
      codigo_barras: p.codigo_barras,
      idcategoria:   p.idcategoria,
      descripcion:   p.descripcion || '',
      precio:        p.precio,
      cantidad:      p.cantidad,
      imagen:        p.imagen || '',
      discontinuado: p.discontinuado,
    })
    setEditId(p.idproducto)
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
    if (!form.nombre.trim())        return alert('El nombre es obligatorio')
    if (!form.codigo_barras.trim()) return alert('El código de barras es obligatorio')
    if (!form.idcategoria)          return alert('Selecciona una categoría')
    setSaving(true)

    const payload = {
      idempresa:     ID_EMPRESA,
      nombre:        form.nombre.trim(),
      codigo_barras: form.codigo_barras.trim(),
      idcategoria:   parseInt(form.idcategoria),
      descripcion:   form.descripcion.trim(),
      precio:        parseFloat(form.precio)  || 0,
      cantidad:      parseInt(form.cantidad)  || 0,
      imagen:        form.imagen.trim(),
      discontinuado: form.discontinuado,
    }

    let error
    if (editId) {
      ;({ error } = await supabase.from('productos').update(payload).eq('idproducto', editId))
    } else {
      ;({ error } = await supabase.from('productos').insert([payload]))
    }

    if (error) alert('Error: ' + error.message)
    else { closeModal(); fetchProductos() }
    setSaving(false)
  }

  async function toggleDiscontinuado(p) {
    const msg = p.discontinuado
      ? '¿Reactivar este producto?'
      : '¿Marcar como discontinuado?'
    if (!confirm(msg)) return
    const { error } = await supabase
      .from('productos')
      .update({ discontinuado: !p.discontinuado })
      .eq('idproducto', p.idproducto)
    if (error) alert('Error: ' + error.message)
    else fetchProductos()
  }

  return (
    <div>
      <div className="section-header">
        <h2>Productos</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={e => setSoloActivos(e.target.checked)}
            />
            Solo activos
          </label>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
        </div>
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
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.idproducto}>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>{p.codigo_barras}</td>
                    <td style={{ color: 'var(--text2)' }}>{p.Categorias?.nombre || '—'}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td><StockBadge cantidad={p.cantidad} /></td>
                    <td><EstadoBadge discontinuado={p.discontinuado} /></td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(p)}>✏️</button>
                        <button
                          className="icon-btn"
                          title={p.discontinuado ? 'Reactivar' : 'Discontinuar'}
                          onClick={() => toggleDiscontinuado(p)}
                        >
                          {p.discontinuado ? '✅' : '🚫'}
                        </button>
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
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del producto" />
          </div>
          <div className="form-group">
            <label>Código de barras *</label>
            <input value={form.codigo_barras} onChange={e => set('codigo_barras', e.target.value)} placeholder="Ej: 7501234567890" />
          </div>
          <div className="form-group">
            <label>Categoría *</label>
            <select value={form.idcategoria} onChange={e => set('idcategoria', e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c => (
                <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Precio ($) *</label>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min="0" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div className="form-group">
            <label>URL de imagen</label>
            <input value={form.imagen} onChange={e => set('imagen', e.target.value)} placeholder="https://..." />
          </div>
          {editId && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="disc" checked={form.discontinuado} onChange={e => set('discontinuado', e.target.checked)} />
              <label htmlFor="disc" style={{ marginBottom: 0, cursor: 'pointer' }}>Marcar como discontinuado</label>
            </div>
          )}
          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}