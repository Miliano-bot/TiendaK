import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

// ── Escáner ──────────────────────────────────────────────────
function EscanerModal({ onScan, onClose }) {
  const videoRef  = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)

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
        codeReader.decodeFromVideoDevice(device.deviceId, videoRef.current, (result) => {
          if (stopped || !result) return
          stopped = true
          codeReader.reset()
          onScan(result.getText())
        })
      } catch (e) { setError('Error: ' + e.message) }
    }
    startScan()
    return () => { stopped = true; readerRef.current?.reset() }
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <p style={{ color:'#fff', fontSize:15, fontWeight:500 }}>Apunta al código de barras</p>
      {error
        ? <div style={{ color:'#ff6584', fontSize:14, maxWidth:300, textAlign:'center' }}>{error}</div>
        : <div style={{ position:'relative', width:300, height:220, borderRadius:12, overflow:'hidden', border:'2px solid #6c63ff' }}>
            <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', left:0, right:0, height:2, background:'#6c63ff', animation:'scan 1.5s ease-in-out infinite' }} />
          </div>
      }
      <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      <style>{`@keyframes scan{0%{top:10%}50%{top:85%}100%{top:10%}}`}</style>
    </div>
  )
}

// ── Modal nuevo cliente rápido ───────────────────────────────
function ModalNuevoCliente({ onCreado, onClose }) {
  const [nombre,   setNombre]   = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo,   setCorreo]   = useState('')
  const [saving,   setSaving]   = useState(false)

  async function crear() {
    if (!nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ idempresa: ID_EMPRESA, nombre: nombre.trim(), telefono, correo }])
      .select()
      .single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    onCreado(data)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:340, maxWidth:'95vw' }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Nuevo cliente rápido</h3>
        <div className="form-group">
          <label>Nombre *</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
        </div>
        <div className="form-group">
          <label>Teléfono</label>
          <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+593..." />
        </div>
        <div className="form-group">
          <label>Correo</label>
          <input value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={crear} disabled={saving}>{saving ? 'Guardando...' : 'Crear cliente'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal cobro ──────────────────────────────────────────────
function ModalCobro({ total, onConfirmar, onClose }) {
  const [pagaCon, setPagaCon] = useState('')
  const pago    = parseFloat(pagaCon) || 0
  const vuelto  = pago - total
  const valido  = pago >= total

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:340, maxWidth:'95vw' }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Cobrar venta</h3>

        <div style={{ background:'var(--bg3)', borderRadius:10, padding:'14px 18px', marginBottom:20, textAlign:'center' }}>
          <p style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>TOTAL A COBRAR</p>
          <p style={{ fontSize:32, fontWeight:700, color:'var(--accent)' }}>${total.toFixed(2)}</p>
        </div>

        <div className="form-group">
          <label>El cliente paga con ($)</label>
          <input
            type="number" min={total} step="0.01"
            value={pagaCon}
            onChange={e => setPagaCon(e.target.value)}
            placeholder={`Mínimo $${total.toFixed(2)}`}
            autoFocus
          />
        </div>

        {pagaCon && (
          <div style={{ background: valido ? 'rgba(76,175,135,0.1)' : 'rgba(224,82,82,0.1)', border:`1px solid ${valido ? 'rgba(76,175,135,0.3)' : 'rgba(224,82,82,0.3)'}`, borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            {valido ? (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, color:'var(--text2)' }}>Vuelto</span>
                <span style={{ fontSize:22, fontWeight:700, color:'var(--success)' }}>${vuelto.toFixed(2)}</span>
              </div>
            ) : (
              <p style={{ fontSize:13, color:'var(--danger)', textAlign:'center' }}>Monto insuficiente — faltan ${(total - pago).toFixed(2)}</p>
            )}
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onConfirmar(pago, vuelto)} disabled={!valido}>
            ✅ Confirmar venta
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
export default function Ventas() {
  const [carrito,       setCarrito]       = useState([])
  const [clientes,      setClientes]      = useState([])
  const [clienteSel,    setClienteSel]    = useState(null)   // null = consumidor final
  const [busCliente,    setBusCliente]    = useState('')
  const [busProducto,   setBusProducto]   = useState('')
  const [codigoBus,     setCodigoBus]     = useState('')
  const [productos,     setProductos]     = useState([])
  const [prodFiltrados, setProdFiltrados] = useState([])
  const [escaner,       setEscaner]       = useState(false)
  const [modalCliente,  setModalCliente]  = useState(false)
  const [modalCobro,    setModalCobro]    = useState(false)
  const [ventaOk,       setVentaOk]       = useState(null)   // { vuelto, total }
  const codigoRef = useRef(null)

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)

  useEffect(() => { fetchProductos(); fetchClientes() }, [])

  async function fetchProductos() {
    const { data } = await supabase
      .from('productos')
      .select('idproducto, nombre, precio, cantidad, unidad, codigo_barras, imagen')
      .eq('idempresa', ID_EMPRESA)
      .eq('discontinuado', false)
      .gt('cantidad', 0)
    setProductos(data || [])
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('idcliente, nombre, telefono')
      .eq('idempresa', ID_EMPRESA)
      .order('nombre')
    setClientes(data || [])
  }

  // Filtrar productos al buscar
  useEffect(() => {
    const q = busProducto.toLowerCase()
    if (!q) { setProdFiltrados([]); return }
    setProdFiltrados(productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo_barras || '').toLowerCase().includes(q)
    ).slice(0, 6))
  }, [busProducto, productos])

  function agregarAlCarrito(prod) {
    setCarrito(prev => {
      const existe = prev.find(i => i.idproducto === prod.idproducto)
      if (existe) {
        if (existe.cantidad >= prod.cantidad) {
          alert(`Solo hay ${prod.cantidad} unidades disponibles`)
          return prev
        }
        return prev.map(i => i.idproducto === prod.idproducto ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { ...prod, cantidad: 1 }]
    })
    setBusProducto('')
    setCodigoBus('')
    codigoRef.current?.focus()
  }

  async function buscarPorCodigo(codigo) {
    const prod = productos.find(p => p.codigo_barras === codigo)
    if (prod) {
      agregarAlCarrito(prod)
    } else {
      alert(`No se encontró producto con código: ${codigo}`)
    }
    setCodigoBus('')
  }

  function onScanResult(codigo) {
    setEscaner(false)
    buscarPorCodigo(codigo)
  }

function cambiarCantidad(id, delta) {
  setCarrito(prev => {
    const nuevos = prev.map(i => {
      if (i.idproducto !== id) return i
      const nuevaCantidad = i.cantidad + delta

      // Si llega a 0 preguntar si quitar
      if (nuevaCantidad <= 0) {
        if (confirm(`¿Quitar "${i.nombre}" del carrito?`)) return null
        return i // si cancela, no hace nada
      }

      // No superar el stock disponible
      if (nuevaCantidad > i.cantidad_stock) {
        alert(`Solo hay ${i.cantidad_stock} unidades disponibles de "${i.nombre}"`)
        return i
      }

      return { ...i, cantidad: nuevaCantidad }
    })
    return nuevos.filter(Boolean) // elimina los null
  })
}

  function quitarItem(id) {
    setCarrito(prev => prev.filter(i => i.idproducto !== id))
  }

  function limpiarVenta() {
    setCarrito([])
    setClienteSel(null)
    setBusCliente('')
    setVentaOk(null)
    fetchProductos()
  }

  async function confirmarVenta(pagoCon, vuelto) {
    setModalCobro(false)

    // 1. Crear venta
    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert([{
        idempresa: ID_EMPRESA,
        idcliente: clienteSel?.idcliente || null,
        total,
      }])
      .select()
      .single()

    if (errVenta) { alert('Error al guardar venta: ' + errVenta.message); return }

    // 2. Insertar detalle
    const detalle = carrito.map(i => ({
      idventa:    venta.idventa,
      idproducto: i.idproducto,
      cantidad:   i.cantidad,
      precio:     i.precio,
    }))
    const { error: errDet } = await supabase.from('ventasdetalle').insert(detalle)
    if (errDet) { alert('Error en detalle: ' + errDet.message); return }

    // 3. Descontar stock
    for (const item of carrito) {
      await supabase
        .from('productos')
        .update({ cantidad: item.cantidad_stock - item.cantidad })
        .eq('idproducto', item.idproducto)
    }

    setVentaOk({ total, pagoCon, vuelto, cliente: clienteSel?.nombre || 'Consumidor final' })
  }

  // Clientes filtrados
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busCliente.toLowerCase())
  ).slice(0, 5)

  // ── Pantalla de venta exitosa ────────────────────────────────
  if (ventaOk) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>¡Venta realizada!</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Cliente: {ventaOk.cliente}</p>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text2)' }}>Total</span>
            <span style={{ fontWeight: 600 }}>${ventaOk.total.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text2)' }}>Pagó con</span>
            <span style={{ fontWeight: 600 }}>${ventaOk.pagoCon.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
            <span style={{ color: 'var(--text2)' }}>Vuelto</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--success)' }}>${ventaOk.vuelto.toFixed(2)}</span>
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={limpiarVenta}>
          Nueva venta
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, height: 'calc(100vh - 100px)' }}>
      {escaner && <EscanerModal onScan={onScanResult} onClose={() => setEscaner(false)} />}
      {modalCliente && (
        <ModalNuevoCliente
          onCreado={c => { setClientes(prev => [...prev, c]); setClienteSel(c); setModalCliente(false) }}
          onClose={() => setModalCliente(false)}
        />
      )}
      {modalCobro && <ModalCobro total={total} onConfirmar={confirmarVenta} onClose={() => setModalCobro(false)} />}

      {/* ── Panel izquierdo: buscar productos ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

        {/* Buscador */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Agregar producto</p>

          {/* Por código de barras */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              ref={codigoRef}
              style={{ flex: 1, padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
              placeholder="Escanea o escribe el código de barras y presiona Enter"
              value={codigoBus}
              onChange={e => setCodigoBus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && codigoBus.trim() && buscarPorCodigo(codigoBus.trim())}
            />
            <button className="btn btn-ghost" onClick={() => setEscaner(true)} title="Cámara" style={{ fontSize: 18, padding: '8px 12px' }}>📷</button>
          </div>

          {/* Por nombre */}
          <div style={{ position: 'relative' }}>
            <input
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
              placeholder="O busca por nombre..."
              value={busProducto}
              onChange={e => setBusProducto(e.target.value)}
            />
            {prodFiltrados.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 50, marginTop: 4, overflow: 'hidden' }}>
                {prodFiltrados.map(p => (
                  <div
                    key={p.idproducto}
                    onClick={() => agregarAlCarrito({ ...p, cantidad_stock: p.cantidad })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {p.imagen
                      ? <img src={p.imagen} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)' }}>Stock: {p.cantidad} {p.unidad || 'und'}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${parseFloat(p.precio).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lista de productos en pantalla */}
        <div className="panel" style={{ flex: 1, overflow: 'auto' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Productos disponibles</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {productos.slice(0, 20).map(p => (
              <div
                key={p.idproducto}
                onClick={() => agregarAlCarrito({ ...p, cantidad_stock: p.cantidad })}
                style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {p.imagen
                  ? <img src={p.imagen} style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} onError={e => e.target.style.display='none'} />
                  : <div style={{ width: '100%', height: 70, background: 'var(--bg2)', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📦</div>
                }
                <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{p.nombre}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>${parseFloat(p.precio).toFixed(2)}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>Stock: {p.cantidad}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: carrito ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

        {/* Cliente */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Cliente</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              className={`btn ${!clienteSel ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, fontSize: 12 }}
              onClick={() => { setClienteSel(null); setBusCliente('') }}
            >
              Consumidor final
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '8px 10px' }}
              onClick={() => setModalCliente(true)}
              title="Nuevo cliente"
            >
              + Nuevo
            </button>
          </div>

          {/* Buscar cliente existente */}
          <div style={{ position: 'relative' }}>
            <input
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
              placeholder="Buscar cliente..."
              value={busCliente}
              onChange={e => { setBusCliente(e.target.value); if (clienteSel) setClienteSel(null) }}
            />
            {busCliente && clientesFiltrados.length > 0 && !clienteSel && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 50, marginTop: 4 }}>
                {clientesFiltrados.map(c => (
                  <div
                    key={c.idcliente}
                    onClick={() => { setClienteSel(c); setBusCliente(c.nombre) }}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <p style={{ fontWeight: 500 }}>{c.nombre}</p>
                    {c.telefono && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{c.telefono}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {clienteSel && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(108,99,255,0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>👤 {clienteSel.nombre}</span>
              <button onClick={() => { setClienteSel(null); setBusCliente('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 16 }}>×</button>
            </div>
          )}
        </div>

        {/* Items del carrito */}
        <div className="panel" style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Carrito {carrito.length > 0 && <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({carrito.length} ítem{carrito.length !== 1 ? 's' : ''})</span>}
          </p>

          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
              <p style={{ fontSize: 13 }}>Agrega productos al carrito</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {carrito.map(item => (
                <div key={item.idproducto} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</p>
                    <p style={{ fontSize: 11, color: 'var(--text2)' }}>${parseFloat(item.precio).toFixed(2)} c/u</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => cambiarCantidad(item.idproducto, -1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.idproducto, +1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <span style={{ fontWeight: 700, minWidth: 56, textAlign: 'right', fontSize: 13 }}>${(item.precio * item.cantidad).toFixed(2)}</span>
                  <button onClick={() => quitarItem(item.idproducto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '0 2px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total y cobrar */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, color: 'var(--text2)' }}>Total</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>${total.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setCarrito([])}
              disabled={carrito.length === 0}
            >
              Limpiar
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, padding: 12, fontSize: 15 }}
              onClick={() => setModalCobro(true)}
              disabled={carrito.length === 0}
            >
              Cobrar ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}