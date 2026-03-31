import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1

const UNIDADES = [
  'Unidad', 'Docena', 'Par', 'Paquete', 'Caja',
  'Kg', 'Gramo', 'Libra', 'Litro', 'Ml',
]

const EMPTY = {
  nombre:        '',
  codigo_barras: '',
  idcategoria:   '',
  descripcion:   '',
  precio:        '',
  cantidad:      '',
  unidad:        'Unidad',
  imagen:        '',
  discontinuado: false,
}

function EstadoBadge({ discontinuado }) {
  return discontinuado
    ? <span className="badge badge-danger">Discontinuado</span>
    : <span className="badge badge-success">Activo</span>
}

function StockBadge({ cantidad }) {
  if (cantidad === 0) return <span className="badge badge-danger">Sin stock</span>
  if (cantidad <= 5)  return <span className="badge badge-warn">Stock bajo</span>
  return <span style={{ fontWeight: 600, color: 'var(--text)' }}>{cantidad}</span>
}

// ── Escáner de cámara ────────────────────────────────────────
function EscanerModal({ onScan, onClose }) {
  const videoRef  = useRef(null)
  const readerRef = useRef(null)
  const [error,    setError]    = useState(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    let stopped = false

    async function startScan() {
      try {
        const ZXing = await import('https://esm.sh/@zxing/library@0.21.3')
        const codeReader = new ZXing.BrowserMultiFormatReader()
        readerRef.current = codeReader

        const devices = await codeReader.listVideoInputDevices()
        if (!devices.length) { setError('No se encontró cámara'); return }

        const device = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1]

        codeReader.decodeFromVideoDevice(device.deviceId, videoRef.current, (result, err) => {
          if (stopped) return
          if (result) {
            stopped = true
            setScanning(false)
            codeReader.reset()
            onScan(result.getText())
          }
        })
      } catch (e) {
        setError('Error al iniciar cámara: ' + e.message)
      }
    }

    startScan()
    return () => { stopped = true; readerRef.current?.reset() }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <p style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
        {scanning ? 'Apunta al código de barras' : '✅ ¡Código detectado!'}
      </p>
      {error ? (
        <div style={{ color: '#ff6584', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>{error}</div>
      ) : (
        <div style={{ position: 'relative', width: 300, height: 220, borderRadius: 12, overflow: 'hidden', border: '2px solid #6c63ff' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: '#6c63ff', animation: 'scan 1.5s ease-in-out infinite',
          }} />
        </div>
      )}
      <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      <style>{`@keyframes scan { 0%{top:10%} 50%{top:85%} 100%{top:10%} }`}</style>
    </div>
  )
}

// ── Preview imagen ───────────────────────────────────────────
function ImagePreview({ url }) {
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!url.trim()) { setStatus('idle'); return }
    setStatus('loading')
    const img = new Image()
    img.onload  = () => setStatus('ok')
    img.onerror = () => setStatus('error')
    img.src = url
  }, [url])

  if (!url.trim()) return null
  return (
    <div style={{ marginTop: 8 }}>
      {status === 'loading' && <p style={{ fontSize: 12, color: 'var(--text2)' }}>Cargando imagen...</p>}
      {status === 'error'   && <p style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ URL no válida o imagen no encontrada</p>}
      {status === 'ok'      && (
        <img src={url} alt="Preview" style={{
          width: '100%', maxHeight: 160, objectFit: 'contain',
          borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)',
        }} />
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
export default function Productos() {
  const [productos,    setProductos]    = useState([])
  const [categorias,   setCategorias]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [modal,        setModal]        = useState(false)
  const [escaner,      setEscaner]      = useState(false)
  const [escanerCampo, setEscanerCampo] = useState('filtro')
  const [form,         setForm]         = useState(EMPTY)
  const [editId,       setEditId]       = useState(null)
  const [saving,       setSaving]       = useState(false)

  const [busNombre,   setBusNombre]   = useState('')
  const [busCodigo,   setBusCodigo]   = useState('')
  const [filtroStock, setFiltroStock] = useState('todos')
  const [soloActivos, setSoloActivos] = useState(true)

  useEffect(() => { fetchCategorias(); fetchProductos() }, [soloActivos])

  async function fetchCategorias() {
    const { data } = await supabase
      .from('categorias')
      .select('idcategoria, nombre')
      .eq('idempresa', ID_EMPRESA)
      .order('nombre')
    setCategorias(data || [])
  }

  async function fetchProductos() {
    setLoading(true); setError(null)
    let query = supabase
      .from('productos')
      .select('*, categorias!productos_idcategoria_fkey(nombre)')
      .eq('idempresa', ID_EMPRESA)
      .order('nombre')
    if (soloActivos) query = query.eq('discontinuado', false)
    const { data, error } = await query
  console.log('productos:', data)
  console.log('data:', data)
console.log('error:', error)
    if (error) setError(error.message)
    else setProductos(data)
    setLoading(false)
  }

  const productosFiltrados = productos.filter(p => {
    const matchNombre = p.nombre.toLowerCase().includes(busNombre.toLowerCase())
    const matchCodigo = !busCodigo || (p.codigo_barras || '').toLowerCase().includes(busCodigo.toLowerCase())
    const matchStock  =
      filtroStock === 'todos'      ? true :
      filtroStock === 'sin'        ? p.cantidad === 0 :
      filtroStock === 'bajo'       ? p.cantidad > 0 && p.cantidad <= 5 :
      filtroStock === 'disponible' ? p.cantidad > 5 : true
    return matchNombre && matchCodigo && matchStock
  })

  function openNew()  { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p) {
    setForm({
      nombre:        p.nombre,
      codigo_barras: p.codigo_barras || '',
      idcategoria:   p.idcategoria,
      descripcion:   p.descripcion  || '',
      precio:        p.precio,
      cantidad:      p.cantidad,
      unidad:        p.unidad       || 'Unidad',
      imagen:        p.imagen       || '',
      discontinuado: p.discontinuado,
    })
    setEditId(p.idproducto)
    setModal(true)
  }
  function closeModal() { setModal(false); setForm(EMPTY); setEditId(null) }
  function setF(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function abrirEscaner(campo) { setEscanerCampo(campo); setEscaner(true) }
  function onScanResult(codigo) {
    setEscaner(false)
    if (escanerCampo === 'filtro') setBusCodigo(codigo)
    else setF('codigo_barras', codigo)
  }

  async function handleSave() {
    if (!form.nombre.trim())    return alert('El nombre es obligatorio')
    if (!form.idcategoria)      return alert('Selecciona una categoría')
    setSaving(true)

    const payload = {
      idempresa:     ID_EMPRESA,
      nombre:        form.nombre.trim(),
      codigo_barras: form.codigo_barras.trim() || null, // null si está vacío
      idcategoria:   parseInt(form.idcategoria),
      descripcion:   form.descripcion.trim(),
      precio:        parseFloat(form.precio)  || 0,
      cantidad:      parseInt(form.cantidad)  || 0,
      unidad:        form.unidad || 'Unidad',
      imagen:        form.imagen.trim() || null,
      discontinuado: form.discontinuado,
    }

    let err
    if (editId) {
      ;({ error: err } = await supabase.from('productos').update(payload).eq('idproducto', editId))
    } else {
      ;({ error: err } = await supabase.from('productos').insert([payload]))
    }

    if (err) alert('Error: ' + err.message)
    else { closeModal(); fetchProductos() }
    setSaving(false)
  }

  async function toggleDiscontinuado(p) {
    if (!confirm(p.discontinuado ? '¿Reactivar este producto?' : '¿Marcar como discontinuado?')) return
    const { error } = await supabase.from('productos').update({ discontinuado: !p.discontinuado }).eq('idproducto', p.idproducto)
    if (error) alert('Error: ' + error.message)
    else fetchProductos()
  }

  return (
    <div>
      {escaner && <EscanerModal onScan={onScanResult} onClose={() => setEscaner(false)} />}

      <div className="section-header">
        <h2>Productos</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} />
            Solo activos
          </label>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 12, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>NOMBRE</label>
          <input
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
            placeholder="Buscar por nombre..."
            value={busNombre}
            onChange={e => setBusNombre(e.target.value)}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>CÓDIGO DE BARRAS</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
              placeholder="Buscar por código..."
              value={busCodigo}
              onChange={e => setBusCodigo(e.target.value)}
            />
            <button className="btn btn-ghost" title="Escanear" onClick={() => abrirEscaner('filtro')} style={{ padding: '8px 10px', fontSize: 16 }}>📷</button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>STOCK</label>
          <select
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
            value={filtroStock}
            onChange={e => setFiltroStock(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="disponible">Disponible (+5)</option>
            <option value="bajo">Stock bajo (1–5)</option>
            <option value="sin">Sin stock (0)</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={() => { setBusNombre(''); setBusCodigo(''); setFiltroStock('todos') }} style={{ fontSize: 12 }}>
          Limpiar
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
        {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
      </p>

      {error && <div className="error-msg">Error: {error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading">Cargando productos...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            {productos.length === 0 ? 'No hay productos. ¡Agrega el primero!' : 'No hay productos con esos filtros.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(p => (
                  <tr key={p.idproducto}>
                    <td>
                      {p.imagen ? (
                        <img src={p.imagen} alt={p.nombre} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ color: 'var(--text2)', fontFamily: 'monospace', fontSize: 12 }}>
                      {p.codigo_barras || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>Sin código</span>}
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{p.categorias?.nombre || '—'}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td><StockBadge cantidad={p.cantidad} /></td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{p.unidad || 'Unidad'}</td>
                    <td><EstadoBadge discontinuado={p.discontinuado} /></td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(p)}>✏️</button>
                        <button className="icon-btn" title={p.discontinuado ? 'Reactivar' : 'Discontinuar'} onClick={() => toggleDiscontinuado(p)}>
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

      {/* Modal */}
      {modal && (
        <Modal title={editId ? 'Editar producto' : 'Nuevo producto'} onClose={closeModal} onSave={handleSave}>

          <div className="form-group">
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e => setF('nombre', e.target.value)} placeholder="Ej: Huevo" />
          </div>

          <div className="form-group">
            <label>Código de barras <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ flex: 1 }}
                value={form.codigo_barras}
                onChange={e => setF('codigo_barras', e.target.value)}
                placeholder="Déjalo vacío si no tiene código"
              />
              <button type="button" className="btn btn-ghost" title="Escanear" onClick={() => abrirEscaner('form')} style={{ padding: '8px 10px', fontSize: 16 }}>📷</button>
            </div>
          </div>

          <div className="form-group">
            <label>Categoría *</label>
            <select value={form.idcategoria} onChange={e => setF('idcategoria', e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Precio ($) *</label>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e => setF('precio', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min="0" value={form.cantidad} onChange={e => setF('cantidad', e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Unidad</label>
              <select value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="Descripción opcional" />
          </div>

          <div className="form-group">
            <label>URL de imagen</label>
            <input value={form.imagen} onChange={e => setF('imagen', e.target.value)} placeholder="https://..." />
            <ImagePreview url={form.imagen} />
          </div>

          {editId && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="disc" checked={form.discontinuado} onChange={e => setF('discontinuado', e.target.checked)} />
              <label htmlFor="disc" style={{ marginBottom: 0, cursor: 'pointer' }}>Marcar como discontinuado</label>
            </div>
          )}

          {saving && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}