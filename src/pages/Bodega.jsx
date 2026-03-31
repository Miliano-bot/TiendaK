import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1
const EMPTY = { idproducto: '', cantidad: '', precio_costo: '', idproveedor: '', nota: '' }

export default function Bodega() {
  const [movimientos,  setMovimientos]  = useState([])
  const [productos,    setProductos]    = useState([])
  const [proveedores,  setProveedores]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [modalPrecio,  setModalPrecio]  = useState(false)
  const [form,         setForm]         = useState(EMPTY)
  const [precioForm,   setPrecioForm]   = useState({ idproducto: '', precio_venta: '', precio_costo: '', nota: '' })
  const [saving,       setSaving]       = useState(false)
  const [filtro,       setFiltro]       = useState('todos')

  useEffect(() => { fetchTodo() }, [filtro])

  async function fetchTodo() {
    setLoading(true)
    const [{ data: prods }, { data: provs }] = await Promise.all([
      supabase.from('productos').select('idproducto,nombre,cantidad,unidad,stock_minimo,precio').eq('idempresa',ID_EMPRESA).eq('discontinuado',false).order('nombre'),
      supabase.from('proveedores').select('idproveedor,nombre').eq('idempresa',ID_EMPRESA).order('nombre'),
    ])
    setProductos(prods||[])
    setProveedores(provs||[])

    let q = supabase.from('inventariohistorico')
      .select('*,productos(nombre,unidad),proveedores(nombre)')
      .eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false}).limit(50)
    if (filtro!=='todos') q = q.eq('tipo_movimiento',filtro)
    const { data } = await q
    setMovimientos(data||[])
    setLoading(false)
  }

  function setF(f,v) { setForm(p=>({...p,[f]:v})) }

  async function handleSave() {
    if (!form.idproducto) return alert('Selecciona un producto')
    if (!form.cantidad || parseInt(form.cantidad)<=0) return alert('La cantidad debe ser mayor a 0')
    if (!form.precio_costo || parseFloat(form.precio_costo)<0) return alert('Ingresa el precio de costo')
    setSaving(true)

    const prod = productos.find(p=>p.idproducto===parseInt(form.idproducto))
    const cantNueva = (prod?.cantidad||0) + parseInt(form.cantidad)

    const { error: e1 } = await supabase.from('inventariohistorico').insert([{
      idempresa:      ID_EMPRESA,
      idproducto:     parseInt(form.idproducto),
      cantidad:       parseInt(form.cantidad),
      precio_costo:   parseFloat(form.precio_costo),
      tipo_movimiento:'entrada',
      idproveedor:    form.idproveedor ? parseInt(form.idproveedor) : null,
      nota:           form.nota.trim()||null,
    }])
    if (e1) { alert('Error: '+e1.message); setSaving(false); return }

    await supabase.from('productos').update({ cantidad: cantNueva }).eq('idproducto', parseInt(form.idproducto))

    setModal(false); setForm(EMPTY); fetchTodo()
    setSaving(false)
  }

  async function handleGuardarPrecio() {
    if (!precioForm.idproducto) return alert('Selecciona un producto')
    setSaving(true)
    const { error } = await supabase.from('historialprecios').insert([{
      idproducto:   parseInt(precioForm.idproducto),
      precio_venta: precioForm.precio_venta ? parseFloat(precioForm.precio_venta) : null,
      precio_costo: precioForm.precio_costo ? parseFloat(precioForm.precio_costo) : null,
      nota:         precioForm.nota.trim()||null,
    }])
    if (error) { alert('Error: '+error.message); setSaving(false); return }

    // Actualizar precio en producto si se ingresó
    if (precioForm.precio_venta) {
      await supabase.from('productos').update({ precio: parseFloat(precioForm.precio_venta) }).eq('idproducto', parseInt(precioForm.idproducto))
    }
    setModalPrecio(false); setPrecioForm({ idproducto:'',precio_venta:'',precio_costo:'',nota:'' })
    setSaving(false)
    alert('Precio actualizado y guardado en historial ✅')
  }

  async function actualizarStockMinimo(idproducto, valor) {
    await supabase.from('productos').update({ stock_minimo: parseInt(valor)||0 }).eq('idproducto', idproducto)
    setProductos(prev => prev.map(p => p.idproducto===idproducto ? {...p,stock_minimo:parseInt(valor)||0} : p))
  }

  const prodSeleccionado = productos.find(p=>p.idproducto===parseInt(form.idproducto))
  const totalInvertido   = movimientos.filter(m=>m.tipo_movimiento==='entrada').reduce((s,m)=>s+parseFloat(m.total_invertido||0),0)
  const necesitanStock   = productos.filter(p=>p.cantidad<=p.stock_minimo && p.stock_minimo>0)

  return (
    <div>
      <div className="section-header">
        <h2>🏭 Bodega</h2>
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => setModalPrecio(true)}>📝 Actualizar precio</button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}>+ Entrada</button>
        </div>
      </div>

      {/* Alertas stock mínimo */}
      {necesitanStock.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:12,color:'var(--warn)',marginBottom:8,fontWeight:600 }}>⚠️ Bajo stock mínimo — necesitan reabastecimiento</p>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {necesitanStock.map(p => (
              <div key={p.idproducto} onClick={() => { setForm({...EMPTY,idproducto:String(p.idproducto)}); setModal(true) }}
                style={{ background:'rgba(245,166,35,0.1)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:8,padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:13,fontWeight:500 }}>{p.nombre}</span>
                <span className="badge badge-warn">{p.cantidad}/{p.stock_minimo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cards-grid" style={{ marginBottom:16 }}>
        <div className="metric-card" style={{ cursor:'default' }}>
          <div className="metric-label">Total invertido</div>
          <div className="metric-value" style={{ color:'var(--warn)' }}>${totalInvertido.toFixed(2)}</div>
        </div>
        <div className="metric-card" style={{ cursor:'default' }}>
          <div className="metric-label">Alertas stock</div>
          <div className="metric-value" style={{ color: necesitanStock.length>0?'var(--danger)':'var(--success)' }}>{necesitanStock.length}</div>
        </div>
      </div>

      {/* Stock mínimo por producto */}
      <div className="panel" style={{ marginBottom:16 }}>
        <div className="panel-title">📊 Stock mínimo por producto</div>
        <p style={{ fontSize:12,color:'var(--text2)',marginBottom:12 }}>Define cuándo alertar para reabastecer cada producto</p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:8 }}>
          {productos.map(p => (
            <div key={p.idproducto} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg3)',borderRadius:8 }}>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.nombre}</p>
                <p style={{ fontSize:11,color: p.cantidad<=(p.stock_minimo||0) && p.stock_minimo>0 ? 'var(--warn)' : 'var(--text2)' }}>
                  Stock: {p.cantidad} {p.unidad||'und'}
                </p>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                <span style={{ fontSize:11,color:'var(--text2)' }}>Mín:</span>
                <input type="number" min="0" defaultValue={p.stock_minimo||0}
                  onBlur={e => actualizarStockMinimo(p.idproducto, e.target.value)}
                  style={{ width:56,padding:'4px 8px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',fontSize:13,outline:'none',textAlign:'center' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros y tabla movimientos */}
      <div style={{ display:'flex',gap:8,marginBottom:12 }}>
        {['todos','entrada','salida'].map(t=>(
          <button key={t} className={`btn ${filtro===t?'btn-primary':'btn-ghost'}`} style={{ fontSize:12 }} onClick={()=>setFiltro(t)}>
            {t==='todos'?'Todos':t==='entrada'?'📥 Entradas':'📤 Salidas'}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : movimientos.length===0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div>Sin movimientos</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Costo</th><th>Total</th><th>Proveedor</th><th>Nota</th></tr></thead>
              <tbody>
                {movimientos.map(m=>(
                  <tr key={m.idmovimiento}>
                    <td style={{ fontSize:12,color:'var(--text2)',whiteSpace:'nowrap' }}>{new Date(m.fecha).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td style={{ fontWeight:500 }}>{m.productos?.nombre||'—'}</td>
                    <td><span className={`badge ${m.tipo_movimiento==='entrada'?'badge-success':'badge-warn'}`}>{m.tipo_movimiento==='entrada'?'📥':'📤'} {m.tipo_movimiento}</span></td>
                    <td>{m.cantidad} {m.productos?.unidad||''}</td>
                    <td>{m.precio_costo>0?`$${parseFloat(m.precio_costo).toFixed(2)}`:'—'}</td>
                    <td style={{ fontWeight:600,color:'var(--warn)' }}>{m.total_invertido>0?`$${parseFloat(m.total_invertido).toFixed(2)}`:'—'}</td>
                    <td style={{ color:'var(--text2)',fontSize:12 }}>{m.proveedores?.nombre||'—'}</td>
                    <td style={{ color:'var(--text2)',fontSize:12 }}>{m.nota||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal entrada */}
      {modal && (
        <Modal title="Entrada de inventario" onClose={()=>setModal(false)} onSave={handleSave}>
          <div className="form-group">
            <label>Producto *</label>
            <select value={form.idproducto} onChange={e=>setF('idproducto',e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {productos.map(p=><option key={p.idproducto} value={p.idproducto}>{p.nombre} (stock: {p.cantidad})</option>)}
            </select>
          </div>

          {prodSeleccionado && (
            <div style={{ background:'rgba(108,99,255,0.1)',border:'1px solid rgba(108,99,255,0.2)',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13 }}>
              Stock actual: <strong style={{ color:'var(--accent)' }}>{prodSeleccionado.cantidad}</strong>
              {form.cantidad && <span style={{ color:'var(--success)',marginLeft:8 }}>→ {prodSeleccionado.cantidad+parseInt(form.cantidad||0)} después</span>}
            </div>
          )}

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label>Cantidad *</label><input type="number" min="1" value={form.cantidad} onChange={e=>setF('cantidad',e.target.value)} placeholder="0" /></div>
            <div className="form-group"><label>Precio costo (c/u) *</label><input type="number" min="0" step="0.01" value={form.precio_costo} onChange={e=>setF('precio_costo',e.target.value)} placeholder="0.00" /></div>
          </div>

          {form.cantidad && form.precio_costo && (
            <div style={{ background:'rgba(245,166,35,0.1)',border:'1px solid rgba(245,166,35,0.2)',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between' }}>
              <span style={{ fontSize:13,color:'var(--text2)' }}>Total a invertir</span>
              <span style={{ fontSize:16,fontWeight:700,color:'var(--warn)' }}>${((parseFloat(form.cantidad)||0)*(parseFloat(form.precio_costo)||0)).toFixed(2)}</span>
            </div>
          )}

          <div className="form-group">
            <label>Proveedor</label>
            <select value={form.idproveedor} onChange={e=>setF('idproveedor',e.target.value)}>
              <option value="">-- Sin proveedor --</option>
              {proveedores.map(p=><option key={p.idproveedor} value={p.idproveedor}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Nota</label><input value={form.nota} onChange={e=>setF('nota',e.target.value)} placeholder="Ej: Compra semanal" /></div>
          {saving && <p style={{ fontSize:13,color:'var(--text2)',marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}

      {/* Modal actualizar precio */}
      {modalPrecio && (
        <Modal title="📝 Actualizar precio de producto." onClose={()=>setModalPrecio(false)} onSave={handleGuardarPrecio}>
          <p style={{ fontSize:12,color:'var(--text2)',marginBottom:12 }}>El cambio se guarda en el historial de precios para seguimiento.</p>
          <div className="form-group">
            <label>Producto *</label>
            <select value={precioForm.idproducto} onChange={e=>setPrecioForm(p=>({...p,idproducto:e.target.value}))}>
              <option value="">-- Seleccionar --</option>
              {productos.map(p=><option key={p.idproducto} value={p.idproducto}>{p.nombre} (actual: ${parseFloat(p.precio).toFixed(2)})</option>)}
            </select>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label>Nuevo precio venta ($)</label><input type="number" min="0" step="0.01" value={precioForm.precio_venta} onChange={e=>setPrecioForm(p=>({...p,precio_venta:e.target.value}))} placeholder="0.00" /></div>
            <div className="form-group"><label>Nuevo precio costo ($)</label><input type="number" min="0" step="0.01" value={precioForm.precio_costo} onChange={e=>setPrecioForm(p=>({...p,precio_costo:e.target.value}))} placeholder="0.00" /></div>
          </div>
          <div className="form-group"><label>Motivo del cambio</label><input value={precioForm.nota} onChange={e=>setPrecioForm(p=>({...p,nota:e.target.value}))} placeholder="Ej: Subida del proveedor" /></div>
          {saving && <p style={{ fontSize:13,color:'var(--text2)',marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}