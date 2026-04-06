import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1

const EMPTY = {
  nombre: '', codigo_barras: '', idcategoria: '', descripcion: '',
  precio: '', cantidad: '', unidad: 'Unidad', imagen: '', discontinuado: false,
  precio_costo: '', // para registrar entrada al crear
}

function EstadoBadge({ discontinuado }) {
  return discontinuado
    ? <span className="badge badge-danger">Discontinuado</span>
    : <span className="badge badge-success">Activo</span>
}

function StockBadge({ cantidad, stockMinimo }) {
  if (cantidad === 0)  return <span className="badge badge-danger">0</span>
  if (stockMinimo > 0 && cantidad <= stockMinimo) return <span className="badge badge-warn">{cantidad}</span>
  return <span style={{ fontWeight:600, color:'var(--text)' }}>{cantidad}</span>
}

function EscanerModal({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let stopped = false
    async function start() {
      try {
        const ZXing = await import('https://esm.sh/@zxing/library@0.21.3')
        const reader = new ZXing.BrowserMultiFormatReader()
        readerRef.current = reader
        const devices = await reader.listVideoInputDevices()
        if (!devices.length) { setError('No se encontró cámara'); return }
        const device = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length-1]
        reader.decodeFromVideoDevice(device.deviceId, videoRef.current, (result) => {
          if (stopped || !result) return
          stopped = true; reader.reset(); onScan(result.getText())
        })
      } catch(e) { setError('Error: '+e.message) }
    }
    start()
    return () => { stopped = true; readerRef.current?.reset() }
  }, [])
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:20 }}>
      <p style={{ color:'#fff',fontSize:15,fontWeight:500 }}>Apunta al código de barras</p>
      {error
        ? <p style={{ color:'#ff6584',fontSize:13,textAlign:'center' }}>{error}</p>
        : <div style={{ position:'relative',width:'min(300px,90vw)',height:220,borderRadius:12,overflow:'hidden',border:'2px solid #6c63ff' }}>
            <video ref={videoRef} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            <div style={{ position:'absolute',left:0,right:0,height:2,background:'#6c63ff',animation:'scan 1.5s ease-in-out infinite' }} />
          </div>
      }
      <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      <style>{`@keyframes scan{0%{top:10%}50%{top:85%}100%{top:10%}}`}</style>
    </div>
  )
}

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
    <div style={{ marginTop:8 }}>
      {status==='loading' && <p style={{ fontSize:12, color:'var(--text2)' }}>Cargando imagen...</p>}
      {status==='error'   && <p style={{ fontSize:12, color:'var(--danger)' }}>⚠ URL no válida</p>}
      {status==='ok'      && <img src={url} alt="Preview" style={{ width:'100%', maxHeight:160, objectFit:'contain', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)' }} />}
    </div>
  )
}

export default function Productos() {
  const [productos,   setProductos]   = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [unidades,    setUnidades]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [modal,       setModal]       = useState(false)
  const [escaner,     setEscaner]     = useState(false)
  const [escanerCampo,setEscanerCampo]= useState('form')
  const [form,        setForm]        = useState(EMPTY)
  const [editId,      setEditId]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [soloActivos, setSoloActivos] = useState(true)
  const [busNombre,   setBusNombre]   = useState('')
  const [busCodigo,   setBusCodigo]   = useState('')
  const [filtroStock, setFiltroStock] = useState('todos')

  useEffect(() => { fetchCategorias(); fetchUnidades(); fetchProductos() }, [soloActivos])

  async function fetchCategorias() {
    const { data } = await supabase.from('categorias').select('idcategoria,nombre').eq('idempresa',ID_EMPRESA).order('nombre')
    setCategorias(data||[])
  }

  async function fetchUnidades() {
    const { data } = await supabase.from('unidades').select('idunidad,nombre').order('nombre')
    setUnidades(data||[])
  }

  async function fetchProductos() {
    setLoading(true); setError(null)
    let q = supabase.from('productos')
      .select('*, categorias!productos_idcategoria_fkey(nombre)')
      .eq('idempresa',ID_EMPRESA).order('nombre')
    if (soloActivos) q = q.eq('discontinuado',false)
    const { data, error } = await q
    if (error) setError(error.message)
    else setProductos(data)
    setLoading(false)
  }

  const productosFiltrados = productos.filter(p => {
    const matchNombre = p.nombre.toLowerCase().includes(busNombre.toLowerCase())
    const matchCodigo = !busCodigo || (p.codigo_barras||'').toLowerCase().includes(busCodigo.toLowerCase())
    const matchStock  =
      filtroStock==='todos'       ? true :
      filtroStock==='sin'         ? p.cantidad===0 :
      filtroStock==='bajo'        ? p.cantidad>0 && p.cantidad<=(p.stock_minimo||5) :
      filtroStock==='disponible'  ? p.cantidad>(p.stock_minimo||5) : true
    return matchNombre && matchCodigo && matchStock
  })

  function openNew()  { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p) {
    setForm({
      nombre:        p.nombre,
      codigo_barras: p.codigo_barras||'',
      idcategoria:   p.idcategoria,
      descripcion:   p.descripcion||'',
      precio:        p.precio,
      cantidad:      p.cantidad,
      unidad:        p.unidad||'Unidad',
      imagen:        p.imagen||'',
      discontinuado: p.discontinuado,
      precio_costo:  '',
    })
    setEditId(p.idproducto)
    setModal(true)
  }
  function closeModal() { setModal(false); setForm(EMPTY); setEditId(null) }
  function setF(field,value) { setForm(f=>({...f,[field]:value})) }

  function abrirEscaner(campo) { setEscanerCampo(campo); setEscaner(true) }
  function onScanResult(codigo) {
    setEscaner(false)
    if (escanerCampo==='filtro') setBusCodigo(codigo)
    else setF('codigo_barras',codigo)
  }

  async function handleSave() {
    if (!form.nombre.trim())  return alert('El nombre es obligatorio')
    if (!form.idcategoria)    return alert('Selecciona una categoría')
    if (!form.precio)         return alert('El precio es obligatorio')
    setSaving(true)

    const payload = {
      idempresa:     ID_EMPRESA,
      nombre:        form.nombre.trim(),
      codigo_barras: form.codigo_barras.trim()||null,
      idcategoria:   parseInt(form.idcategoria),
      descripcion:   form.descripcion.trim(),
      precio:        parseFloat(form.precio)||0,
      cantidad:      parseInt(form.cantidad)||0,
      unidad:        form.unidad||'Unidad',
      imagen:        form.imagen.trim()||null,
      discontinuado: form.discontinuado,
    }

    let idproducto = editId

    if (editId) {
      const { error } = await supabase.from('productos').update(payload).eq('idproducto',editId)
      if (error) { alert('Error: '+error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('productos').insert([payload]).select().single()
      if (error) { alert('Error: '+error.message); setSaving(false); return }
      idproducto = data.idproducto

      // ✅ Registrar entrada en inventario si tiene cantidad inicial
      if (parseInt(form.cantidad) > 0) {
        await supabase.from('inventariohistorico').insert([{
          idempresa:       ID_EMPRESA,
          idproducto:      idproducto,
          cantidad:        parseInt(form.cantidad),
          precio_costo:    parseFloat(form.precio_costo)||0,
          tipo_movimiento: 'entrada',
          nota:            'Stock inicial al crear producto',
        }])
      }
    }

    closeModal()
    fetchProductos()
    setSaving(false)
  }

  async function toggleDiscontinuado(p) {
    const msg = p.discontinuado ? '¿Reactivar este producto?' : '¿Marcar como discontinuado?'
    if (!confirm(msg)) return
    await supabase.from('productos').update({ discontinuado:!p.discontinuado }).eq('idproducto',p.idproducto)
    fetchProductos()
  }

  return (
    <div>
      {escaner && <EscanerModal onScan={onScanResult} onClose={()=>setEscaner(false)} />}

      <div className="section-header">
        <h2>Productos</h2>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <label style={{ fontSize:13, color:'var(--text2)', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <input type="checkbox" checked={soloActivos} onChange={e=>setSoloActivos(e.target.checked)} />
            Solo activos
          </label>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, marginBottom:12, alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>NOMBRE</label>
          <input className="search-input" placeholder="Buscar..." value={busNombre} onChange={e=>setBusNombre(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>CÓDIGO</label>
          <div style={{ display:'flex', gap:6 }}>
            <input className="search-input" placeholder="Código..." value={busCodigo} onChange={e=>setBusCodigo(e.target.value)} style={{ flex:1 }} />
            <button className="btn btn-ghost" onClick={()=>abrirEscaner('filtro')} style={{ fontSize:18, padding:'8px 10px' }}>📷</button>
          </div>
        </div>
        <div>
          <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>STOCK</label>
          <select className="search-input" value={filtroStock} onChange={e=>setFiltroStock(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="disponible">Disponible</option>
            <option value="bajo">Stock bajo</option>
            <option value="sin">Sin stock (0)</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={()=>{setBusNombre('');setBusCodigo('');setFiltroStock('todos')}} style={{ fontSize:12 }}>Limpiar</button>
      </div>

      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>
        {productosFiltrados.length} producto{productosFiltrados.length!==1?'s':''} encontrado{productosFiltrados.length!==1?'s':''}
      </p>

      {error && <div className="error-msg">Error: {error}</div>}

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : productosFiltrados.length===0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div>{productos.length===0?'No hay productos':'Sin resultados con esos filtros'}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th></th><th>Nombre</th><th>Código</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Unidad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {productosFiltrados.map(p=>(
                  <tr key={p.idproducto}>
                    <td>
                      {p.imagen
                        ? <img src={p.imagen} alt={p.nombre} style={{ width:38, height:38, objectFit:'cover', borderRadius:6 }} onError={e=>e.target.style.display='none'} />
                        : <div style={{ width:38, height:38, borderRadius:6, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📦</div>
                      }
                    </td>
                    <td style={{ fontWeight:500 }}>{p.nombre}</td>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace', fontSize:12 }}>
                      {p.codigo_barras||<span style={{ fontStyle:'italic', opacity:0.5 }}>Sin código</span>}
                    </td>
                    <td style={{ color:'var(--text2)' }}>{p.categorias?.nombre||'—'}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td><StockBadge cantidad={p.cantidad} stockMinimo={p.stock_minimo} /></td>
                    <td style={{ color:'var(--text2)', fontSize:12 }}>{p.unidad||'Unidad'}</td>
                    <td><EstadoBadge discontinuado={p.discontinuado} /></td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="Editar" onClick={()=>openEdit(p)}>✏️</button>
                        <button className="icon-btn" title={p.discontinuado?'Reactivar':'Discontinuar'} onClick={()=>toggleDiscontinuado(p)}>
                          {p.discontinuado?'✅':'🚫'}
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
        <Modal title={editId?'Editar producto':'Nuevo producto'} onClose={closeModal} onSave={handleSave}>
          <div className="form-group">
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e=>setF('nombre',e.target.value)} placeholder="Nombre del producto" />
          </div>
          <div className="form-group">
            <label>Código de barras <span style={{ color:'var(--text2)', fontWeight:400 }}>(opcional)</span></label>
            <div style={{ display:'flex', gap:6 }}>
              <input style={{ flex:1 }} value={form.codigo_barras} onChange={e=>setF('codigo_barras',e.target.value)} placeholder="Déjalo vacío si no tiene" />
              <button type="button" className="btn btn-ghost" onClick={()=>abrirEscaner('form')} style={{ fontSize:18, padding:'8px 10px' }}>📷</button>
            </div>
          </div>
          <div className="form-group">
            <label>Categoría *</label>
            <select value={form.idcategoria} onChange={e=>setF('idcategoria',e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {categorias.map(c=><option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label>Precio venta ($) *</label>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e=>setF('precio',e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Unidad</label>
              <select value={form.unidad} onChange={e=>setF('unidad',e.target.value)}>
                {unidades.length > 0
                  ? unidades.map(u=><option key={u.idunidad}>{u.nombre}</option>)
                  : ['Unidad','Docena','Kg','Litro','Caja'].map(u=><option key={u}>{u}</option>)
                }
              </select>
            </div>
          </div>

          {/* Solo al crear: precio de costo para registrar entrada */}
          {!editId && parseInt(form.cantidad) > 0 && (
            <div className="form-group">
              <label>Precio de costo (c/u) <span style={{ color:'var(--text2)', fontWeight:400 }}>(para inventario)</span></label>
              <input type="number" min="0" step="0.01" value={form.precio_costo} onChange={e=>setF('precio_costo',e.target.value)} placeholder="0.00 — déjalo vacío si no sabes aún" />
              <p style={{ fontSize:11, color:'var(--text2)', marginTop:4 }}>Se registrará la entrada en bodega automáticamente</p>
            </div>
          )}

          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e=>setF('descripcion',e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div className="form-group">
            <label>URL de imagen</label>
            <input value={form.imagen} onChange={e=>setF('imagen',e.target.value)} placeholder="https://..." />
            <ImagePreview url={form.imagen} />
          </div>
          {editId && (
            <div className="form-group" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" id="disc" checked={form.discontinuado} onChange={e=>setF('discontinuado',e.target.checked)} />
              <label htmlFor="disc" style={{ marginBottom:0, cursor:'pointer' }}>Marcar como discontinuado</label>
            </div>
          )}
          {saving && <p style={{ fontSize:13, color:'var(--text2)', marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}