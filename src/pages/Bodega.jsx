import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1
const EMPTY = { idproducto: '', cantidad: '', precio_costo: '', nota: '' }

export default function Bodega() {
  const [movimientos, setMovimientos] = useState([])
  const [productos,   setProductos]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [filtro,      setFiltro]      = useState('todos')

  useEffect(() => { fetchProductos(); fetchMovimientos() }, [filtro])

  async function fetchProductos() {
    const { data } = await supabase.from('productos').select('idproducto,nombre,cantidad,unidad').eq('idempresa',ID_EMPRESA).eq('discontinuado',false).order('nombre')
    setProductos(data||[])
  }

  async function fetchMovimientos() {
    setLoading(true)
    let q = supabase.from('inventariohistorico').select('*,productos(nombre,unidad)').eq('idempresa',ID_EMPRESA).order('fecha',{ascending:false}).limit(50)
    if (filtro!=='todos') q = q.eq('tipo_movimiento',filtro)
    const { data } = await q
    setMovimientos(data||[])
    setLoading(false)
  }

  function setF(f,v) { setForm(p=>({...p,[f]:v})) }

  async function handleSave() {
    if (!form.idproducto) return alert('Selecciona un producto')
    if (!form.cantidad || parseInt(form.cantidad) <= 0) return alert('La cantidad debe ser mayor a 0')
    if (!form.precio_costo || parseFloat(form.precio_costo) < 0) return alert('Ingresa el precio de costo')
    setSaving(true)

    const prod = productos.find(p => p.idproducto === parseInt(form.idproducto))
    const cantNueva = (prod?.cantidad||0) + parseInt(form.cantidad)

    // 1. Registrar movimiento
    const { error: e1 } = await supabase.from('inventariohistorico').insert([{
      idempresa:      ID_EMPRESA,
      idproducto:     parseInt(form.idproducto),
      cantidad:       parseInt(form.cantidad),
      precio_costo:   parseFloat(form.precio_costo),
      tipo_movimiento:'entrada',
      nota:           form.nota.trim()||null,
    }])
    if (e1) { alert('Error: '+e1.message); setSaving(false); return }

    // 2. Actualizar stock del producto
    const { error: e2 } = await supabase.from('productos').update({ cantidad: cantNueva }).eq('idproducto', parseInt(form.idproducto))
    if (e2) { alert('Error actualizando stock: '+e2.message); setSaving(false); return }

    setModal(false); setForm(EMPTY); fetchMovimientos(); fetchProductos()
    setSaving(false)
  }

  const prodSeleccionado = productos.find(p => p.idproducto === parseInt(form.idproducto))
  const totalEntrada = (parseFloat(form.cantidad)||0) * (parseFloat(form.precio_costo)||0)

  const totalInvertido = movimientos.filter(m=>m.tipo_movimiento==='entrada').reduce((s,m)=>s+parseFloat(m.total_invertido||0),0)

  return (
    <div>
      <div className="section-header">
        <h2>🏭 Bodega</h2>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}>+ Entrada de inventario</button>
      </div>

      {/* Resumen rápido de stock bajo */}
      {productos.filter(p=>p.cantidad<=5).length > 0 && (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:12,color:'var(--text2)',marginBottom:8 }}>⚠️ Productos que necesitan reabastecimiento</p>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {productos.filter(p=>p.cantidad<=5).map(p => (
              <div key={p.idproducto} onClick={() => { setForm({...EMPTY,idproducto:String(p.idproducto)}); setModal(true) }}
                style={{ background:'rgba(245,166,35,0.1)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:8,padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:13,fontWeight:500 }}>{p.nombre}</span>
                <span className="badge badge-warn">{p.cantidad} {p.unidad||'und'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="cards-grid" style={{ marginBottom:16 }}>
        <div className="metric-card">
          <div className="metric-label">Total invertido</div>
          <div className="metric-value" style={{ color:'var(--warn)' }}>${totalInvertido.toFixed(2)}</div>
          <div className="metric-sub">en entradas registradas</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Movimientos</div>
          <div className="metric-value">{movimientos.length}</div>
          <div className="metric-sub">últimos 50</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex',gap:8,marginBottom:14 }}>
        {['todos','entrada','salida'].map(t => (
          <button key={t} className={`btn ${filtro===t?'btn-primary':'btn-ghost'}`} style={{ fontSize:12 }} onClick={() => setFiltro(t)}>
            {t==='todos'?'Todos':t==='entrada'?'📥 Entradas':'📤 Salidas'}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading ? <div className="loading">Cargando...</div> : movimientos.length===0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div>Sin movimientos registrados</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Costo unit.</th><th>Total</th><th>Nota</th></tr></thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.idmovimiento}>
                    <td style={{ fontSize:12,color:'var(--text2)',whiteSpace:'nowrap' }}>{new Date(m.fecha).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td style={{ fontWeight:500 }}>{m.productos?.nombre||'—'}</td>
                    <td><span className={`badge ${m.tipo_movimiento==='entrada'?'badge-success':'badge-warn'}`}>{m.tipo_movimiento==='entrada'?'📥 Entrada':'📤 Salida'}</span></td>
                    <td>{m.cantidad} {m.productos?.unidad||'und'}</td>
                    <td>{m.precio_costo>0?`$${parseFloat(m.precio_costo).toFixed(2)}`:'—'}</td>
                    <td style={{ fontWeight:600,color:m.tipo_movimiento==='entrada'?'var(--warn)':'var(--text2)' }}>{m.total_invertido>0?`$${parseFloat(m.total_invertido).toFixed(2)}`:'—'}</td>
                    <td style={{ fontSize:12,color:'var(--text2)' }}>{m.nota||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title="Entrada de inventario" onClose={() => setModal(false)} onSave={handleSave}>
          <div className="form-group">
            <label>Producto *</label>
            <select value={form.idproducto} onChange={e => setF('idproducto',e.target.value)}>
              <option value="">-- Seleccionar producto --</option>
              {productos.map(p => (
                <option key={p.idproducto} value={p.idproducto}>{p.nombre} (stock actual: {p.cantidad})</option>
              ))}
            </select>
          </div>

          {prodSeleccionado && (
            <div style={{ background:'rgba(108,99,255,0.1)',border:'1px solid rgba(108,99,255,0.2)',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13 }}>
              <span style={{ color:'var(--text2)' }}>Stock actual: </span>
              <span style={{ fontWeight:600,color:'var(--accent)' }}>{prodSeleccionado.cantidad} {prodSeleccionado.unidad||'unidades'}</span>
              {form.cantidad && <span style={{ color:'var(--success)',marginLeft:8 }}>→ {prodSeleccionado.cantidad+parseInt(form.cantidad||0)} después</span>}
            </div>
          )}

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group">
              <label>Cantidad a ingresar *</label>
              <input type="number" min="1" value={form.cantidad} onChange={e=>setF('cantidad',e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Precio de costo (c/u) *</label>
              <input type="number" min="0" step="0.01" value={form.precio_costo} onChange={e=>setF('precio_costo',e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {totalEntrada > 0 && (
            <div style={{ background:'rgba(245,166,35,0.1)',border:'1px solid rgba(245,166,35,0.2)',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontSize:13,color:'var(--text2)' }}>Total a invertir</span>
              <span style={{ fontSize:18,fontWeight:700,color:'var(--warn)' }}>${totalEntrada.toFixed(2)}</span>
            </div>
          )}

          <div className="form-group">
            <label>Nota (opcional)</label>
            <input value={form.nota} onChange={e=>setF('nota',e.target.value)} placeholder="Ej: Compra proveedor Juan" />
          </div>

          {saving && <p style={{ fontSize:13,color:'var(--text2)',marginTop:8 }}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}