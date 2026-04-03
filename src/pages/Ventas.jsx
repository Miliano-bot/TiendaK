import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatFechaHora } from '../utils/fecha'

const ID_EMPRESA = 1
const TIPOS_ID   = ['Cédula','RUC','Pasaporte','Otro']

function EscanerModal({ onScan, onClose }) {
  const videoRef=useRef(null); const readerRef=useRef(null); const [error,setError]=useState(null)
  useEffect(()=>{ let stopped=false; async function start() { try { const ZXing=await import('https://esm.sh/@zxing/library@0.21.3'); const reader=new ZXing.BrowserMultiFormatReader(); readerRef.current=reader; const devices=await reader.listVideoInputDevices(); if(!devices.length){setError('No se encontró cámara');return} const device=devices.find(d=>/back|rear|environment/i.test(d.label))||devices[devices.length-1]; reader.decodeFromVideoDevice(device.deviceId,videoRef.current,(result)=>{if(stopped||!result)return;stopped=true;reader.reset();onScan(result.getText())}) }catch(e){setError('Error: '+e.message)} } start(); return()=>{stopped=true;readerRef.current?.reset()} },[])
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:20 }}>
      <p style={{ color:'#fff',fontSize:15,fontWeight:500 }}>Apunta al código de barras</p>
      {error?<p style={{ color:'#ff6584',fontSize:13,textAlign:'center' }}>{error}</p>:(
        <div style={{ position:'relative',width:'min(300px,90vw)',height:220,borderRadius:12,overflow:'hidden',border:'2px solid #6c63ff' }}>
          <video ref={videoRef} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
          <div style={{ position:'absolute',left:0,right:0,height:2,background:'#6c63ff',animation:'scan 1.5s ease-in-out infinite' }} />
        </div>
      )}
      <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      <style>{`@keyframes scan{0%{top:10%}50%{top:85%}100%{top:10%}}`}</style>
    </div>
  )
}

function ModalNuevoCliente({ onCreado, onClose }) {
  const [form, setForm] = useState({ nombre:'', tipo_identificacion:'Cédula', identificacion:'', telefono:'', correo:'', direccion:'' })
  const [saving, setSaving] = useState(false)
  function setF(f,v) { setForm(p=>({...p,[f]:v})) }
  async function crear() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const{data,error}=await supabase.from('clientes').insert([{ idempresa:ID_EMPRESA, nombre:form.nombre.trim(), tipo_identificacion:form.tipo_identificacion, identificacion:form.identificacion.trim(), telefono:form.telefono.trim(), correo:form.correo.trim(), direccion:form.direccion.trim() }]).select().single()
    if(error){alert('Error: '+error.message);setSaving(false);return}
    onCreado(data)
  }
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Nuevo cliente</h3>
        <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e=>setF('nombre',e.target.value)} placeholder="Nombre completo" autoFocus /></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <div className="form-group"><label>Tipo ID</label>
            <select value={form.tipo_identificacion} onChange={e=>setF('tipo_identificacion',e.target.value)}>
              {TIPOS_ID.map(t=><option key={t}>{t}</option>)}
            </select></div>
          <div className="form-group"><label>Número</label><input value={form.identificacion} onChange={e=>setF('identificacion',e.target.value)} placeholder="0000000000" /></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <div className="form-group"><label>Teléfono</label><input value={form.telefono} onChange={e=>setF('telefono',e.target.value)} placeholder="+593..." /></div>
          <div className="form-group"><label>Correo</label><input type="email" value={form.correo} onChange={e=>setF('correo',e.target.value)} placeholder="correo@..." /></div>
        </div>
        <div className="form-group"><label>Dirección</label><input value={form.direccion} onChange={e=>setF('direccion',e.target.value)} placeholder="Dirección" /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={crear} disabled={saving}>{saving?'Guardando...':'Crear cliente'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalCobro({ total, onConfirmar, onClose }) {
  const [pago,setPago]=useState('')
  const pagof=parseFloat(pago)||0; const vuelto=pagof-total; const ok=pagof>=total
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Cobrar venta</h3>
        <div style={{ background:'var(--bg3)',borderRadius:10,padding:16,marginBottom:16,textAlign:'center' }}>
          <p style={{ fontSize:12,color:'var(--text2)',marginBottom:4 }}>TOTAL A COBRAR</p>
          <p style={{ fontSize:34,fontWeight:700,color:'var(--accent)' }}>${total.toFixed(2)}</p>
        </div>
        <div className="form-group"><label>El cliente paga con ($)</label>
          <input type="number" min={total} step="0.01" value={pago} onChange={e=>setPago(e.target.value)} placeholder={`Mínimo $${total.toFixed(2)}`} autoFocus style={{ fontSize:18,textAlign:'center' }} /></div>
        <div style={{ display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' }}>
          {[1,5,10,20,50].map(v=>{const r=Math.ceil(total/v)*v;return <button key={v} className="btn btn-ghost" style={{ flex:1,minWidth:48,fontSize:13 }} onClick={()=>setPago(String(r))}>${r}</button>})}
        </div>
        {pago&&(
          <div style={{ background:ok?'rgba(76,175,135,0.1)':'rgba(224,82,82,0.1)',border:`1px solid ${ok?'rgba(76,175,135,0.3)':'rgba(224,82,82,0.3)'}`,borderRadius:8,padding:'12px 16px',marginBottom:14 }}>
            {ok?<div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}><span style={{ fontSize:14,color:'var(--text2)' }}>Vuelto</span><span style={{ fontSize:26,fontWeight:700,color:'var(--success)' }}>${vuelto.toFixed(2)}</span></div>
              :<p style={{ fontSize:13,color:'var(--danger)',textAlign:'center' }}>Faltan ${(total-pagof).toFixed(2)}</p>}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>onConfirmar(pagof,vuelto)} disabled={!ok} style={{ flex:1 }}>✅ Confirmar</button>
        </div>
      </div>
    </div>
  )
}

export default function Ventas({ onVentaRealizada }) {
  const [tab,          setTab]          = useState('productos')
  const [carrito,      setCarrito]      = useState([])
  const [productos,    setProductos]    = useState([])
  const [clientes,     setClientes]     = useState([])
  const [clienteSel,   setClienteSel]   = useState(null)
  const [busCliente,   setBusCliente]   = useState('')
  const [busProducto,  setBusProducto]  = useState('')
  const [codigoBus,    setCodigoBus]    = useState('')
  const [prodFilt,     setProdFilt]     = useState([])
  const [cliFilt,      setCliFilt]      = useState([])
  const [escaner,      setEscaner]      = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [modalCobro,   setModalCobro]   = useState(false)
  const [ventaOk,      setVentaOk]      = useState(null)
  const [guardando,    setGuardando]    = useState(false)
  const codigoRef = useRef(null)

  const total = carrito.reduce((s,i)=>s+i.precio*i.cantidad,0)

  useEffect(()=>{ fetchProductos(); fetchClientes() },[])

  async function fetchProductos() {
    const{data}=await supabase.from('productos').select('idproducto,nombre,precio,cantidad,unidad,codigo_barras,imagen').eq('idempresa',ID_EMPRESA).eq('discontinuado',false).gt('cantidad',0)
    setProductos(data||[])
  }

  async function fetchClientes() {
    const{data}=await supabase.from('clientes').select('idcliente,nombre,telefono,identificacion,tipo_identificacion').eq('idempresa',ID_EMPRESA).order('nombre')
    setClientes(data||[])
  }

  // Filtrar productos
  useEffect(()=>{
    const q=busProducto.toLowerCase()
    if(!q){setProdFilt([]);return}
    setProdFilt(productos.filter(p=>p.nombre.toLowerCase().includes(q)||(p.codigo_barras||'').includes(q)).slice(0,8))
  },[busProducto,productos])

  // Filtrar clientes por nombre O cédula
  useEffect(()=>{
    const q=busCliente.toLowerCase()
    if(!q||clienteSel){setCliFilt([]);return}
    setCliFilt(clientes.filter(c=>c.nombre.toLowerCase().includes(q)||(c.identificacion||'').includes(q)).slice(0,5))
  },[busCliente,clientes,clienteSel])

  function agregar(prod) {
    setCarrito(prev=>{
      const existe=prev.find(i=>i.idproducto===prod.idproducto)
      if(existe){ if(existe.cantidad>=prod.cantidad_stock){alert(`Solo hay ${prod.cantidad_stock} disponibles`);return prev} return prev.map(i=>i.idproducto===prod.idproducto?{...i,cantidad:i.cantidad+1}:i) }
      return [...prev,{...prod,cantidad:1}]
    })
    setBusProducto(''); setCodigoBus('')
  }

  async function buscarCodigo(codigo) {
    const prod=productos.find(p=>p.codigo_barras===codigo)
    if(prod) agregar({...prod,cantidad_stock:prod.cantidad})
    else alert(`No encontrado: ${codigo}`)
    setCodigoBus('')
  }

  function cambiarCantidad(id,delta) {
    setCarrito(prev=>{
      const nuevos=prev.map(i=>{
        if(i.idproducto!==id) return i
        const nueva=i.cantidad+delta
        if(nueva<=0){if(confirm(`¿Quitar "${i.nombre}"?`))return null;return i}
        if(nueva>i.cantidad_stock){alert(`Solo hay ${i.cantidad_stock} disponibles`);return i}
        return{...i,cantidad:nueva}
      })
      return nuevos.filter(Boolean)
    })
  }

  async function confirmarVenta(pagoCon,vuelto) {
    setModalCobro(false); setGuardando(true)
    const{data:venta,error:e1}=await supabase.from('ventas').insert([{idempresa:ID_EMPRESA,idcliente:clienteSel?.idcliente||null,total}]).select().single()
    if(e1){alert('Error: '+e1.message);setGuardando(false);return}
    await supabase.from('ventasdetalle').insert(carrito.map(i=>({idventa:venta.idventa,idproducto:i.idproducto,cantidad:i.cantidad,precio:i.precio})))
    for(const item of carrito){
      await supabase.from('productos').update({cantidad:item.cantidad_stock-item.cantidad}).eq('idproducto',item.idproducto)
      await supabase.from('inventariohistorico').insert([{idempresa:ID_EMPRESA,idproducto:item.idproducto,cantidad:item.cantidad,tipo_movimiento:'salida',precio_costo:0,nota:`Venta #${venta.idventa}`}])
    }
    setVentaOk({total,pagoCon,vuelto,cliente:clienteSel?.nombre||'Consumidor final',idventa:venta.idventa})
    onVentaRealizada?.()
    setGuardando(false)
  }

  function limpiar(){setCarrito([]);setClienteSel(null);setBusCliente('');setVentaOk(null);fetchProductos()}

  if(ventaOk) return (
    <div style={{ maxWidth:380,margin:'40px auto',textAlign:'center',padding:'0 16px' }}>
      <div style={{ fontSize:70,marginBottom:12 }}>✅</div>
      <h2 style={{ fontSize:22,fontWeight:700,marginBottom:4 }}>¡Venta realizada!</h2>
      <p style={{ color:'var(--text2)',marginBottom:4,fontSize:13 }}>{ventaOk.cliente}</p>
      <p style={{ color:'var(--text2)',marginBottom:20,fontSize:12 }}>Venta #{ventaOk.idventa}</p>
      <div className="panel" style={{ marginBottom:20,textAlign:'left' }}>
        {[['Total',`$${ventaOk.total.toFixed(2)}`],['Pagó con',`$${ventaOk.pagoCon.toFixed(2)}`]].map(([k,v])=>(
          <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}><span style={{ color:'var(--text2)' }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span></div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:10,marginTop:4 }}>
          <span style={{ color:'var(--text2)' }}>Vuelto</span>
          <span style={{ fontSize:24,fontWeight:700,color:'var(--success)' }}>${ventaOk.vuelto.toFixed(2)}</span>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:'100%',padding:14,fontSize:15 }} onClick={limpiar}>Nueva venta</button>
    </div>
  )

  if(guardando) return <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,gap:12 }}><div style={{ fontSize:40 }}>⏳</div><p style={{ color:'var(--text2)',fontSize:14 }}>Procesando...</p></div>

  return (
    <div>
      {escaner      && <EscanerModal onScan={c=>{setEscaner(false);buscarCodigo(c)}} onClose={()=>setEscaner(false)} />}
      {modalCliente && <ModalNuevoCliente onCreado={c=>{setClientes(p=>[...p,c]);setClienteSel(c);setBusCliente(c.nombre);setModalCliente(false)}} onClose={()=>setModalCliente(false)} />}
      {modalCobro   && <ModalCobro total={total} onConfirmar={confirmarVenta} onClose={()=>setModalCobro(false)} />}

      {/* Tabs */}
      <div style={{ display:'flex',gap:0,marginBottom:16,background:'var(--bg2)',borderRadius:10,padding:4,border:'1px solid var(--border)' }}>
        {[['productos','🛍 Productos'],['carrito',`🛒 Carrito${carrito.length>0?` (${carrito.length})`:''}`]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1,padding:'9px 8px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,background:tab===id?'var(--accent)':'transparent',color:tab===id?'#fff':'var(--text2)',transition:'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {tab==='productos'&&(
        <div>
          <div style={{ display:'flex',gap:8,marginBottom:10 }}>
            <input ref={codigoRef} className="search-input" placeholder="Código de barras + Enter" value={codigoBus} onChange={e=>setCodigoBus(e.target.value)} onKeyDown={e=>e.key==='Enter'&&codigoBus.trim()&&buscarCodigo(codigoBus.trim())} />
            <button className="btn btn-ghost" onClick={()=>setEscaner(true)} style={{ fontSize:20,padding:'8px 12px' }}>📷</button>
          </div>
          <div style={{ position:'relative',marginBottom:14 }}>
            <input className="search-input" placeholder="🔍 Buscar producto por nombre..." value={busProducto} onChange={e=>setBusProducto(e.target.value)} />
            {prodFilt.length>0&&(
              <div className="dropdown">
                {prodFilt.map(p=>(
                  <div key={p.idproducto} className="dropdown-item" onClick={()=>agregar({...p,cantidad_stock:p.cantidad})}>
                    {p.imagen?<img src={p.imagen} style={{ width:36,height:36,borderRadius:6,objectFit:'cover',flexShrink:0 }} />:<div style={{ width:36,height:36,borderRadius:6,background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>📦</div>}
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.nombre}</p>
                      <p style={{ fontSize:11,color:'var(--text2)' }}>Stock: {p.cantidad} · ${parseFloat(p.precio).toFixed(2)}</p>
                    </div>
                    <span style={{ fontWeight:700,color:'var(--accent)',flexShrink:0 }}>${parseFloat(p.precio).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10 }}>
            {productos.map(p=>(
              <div key={p.idproducto} onClick={()=>agregar({...p,cantidad_stock:p.cantidad})}
                style={{ background:'var(--bg2)',borderRadius:10,padding:10,cursor:'pointer',border:'1px solid var(--border)',transition:'border-color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                {p.imagen?<img src={p.imagen} style={{ width:'100%',height:70,objectFit:'cover',borderRadius:6,marginBottom:8 }} onError={e=>e.target.style.display='none'} />:<div style={{ width:'100%',height:70,background:'var(--bg3)',borderRadius:6,marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28 }}>📦</div>}
                <p style={{ fontSize:12,fontWeight:500,lineHeight:1.3,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.nombre}</p>
                <p style={{ fontSize:14,fontWeight:700,color:'var(--accent)' }}>${parseFloat(p.precio).toFixed(2)}</p>
                <p style={{ fontSize:11,color:'var(--text2)' }}>Stock: {p.cantidad}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='carrito'&&(
        <div>
          <div className="panel" style={{ marginBottom:12 }}>
            <p style={{ fontSize:13,fontWeight:600,marginBottom:10 }}>👤 Cliente</p>
            <div style={{ display:'flex',gap:8,marginBottom:8 }}>
              <button className={`btn ${!clienteSel?'btn-primary':'btn-ghost'}`} style={{ flex:1,fontSize:12 }} onClick={()=>{setClienteSel(null);setBusCliente('')}}>Consumidor final</button>
              <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>setModalCliente(true)}>+ Nuevo</button>
            </div>
            <div style={{ position:'relative' }}>
              <input className="search-input" placeholder="Buscar por nombre o cédula..." value={busCliente} onChange={e=>{setBusCliente(e.target.value);if(clienteSel)setClienteSel(null)}} />
              {cliFilt.length>0&&(
                <div className="dropdown">
                  {cliFilt.map(c=>(
                    <div key={c.idcliente} className="dropdown-item" onClick={()=>{setClienteSel(c);setBusCliente(c.nombre)}}>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13,fontWeight:500 }}>{c.nombre}</p>
                        <p style={{ fontSize:11,color:'var(--text2)' }}>{c.tipo_identificacion}: {c.identificacion||'—'} · {c.telefono||'—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {clienteSel&&(
              <div style={{ marginTop:8,padding:'8px 12px',background:'rgba(108,99,255,0.1)',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:13,color:'var(--accent)',fontWeight:500 }}>✓ {clienteSel.nombre}</span>
                  {clienteSel.identificacion&&<p style={{ fontSize:11,color:'var(--text2)' }}>{clienteSel.tipo_identificacion}: {clienteSel.identificacion}</p>}
                </div>
                <button onClick={()=>{setClienteSel(null);setBusCliente('')}} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:18 }}>×</button>
              </div>
            )}
          </div>

          {carrito.length===0
            ?<div className="empty-state"><div className="empty-icon">🛒</div>Carrito vacío</div>
            :<div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:12 }}>
              {carrito.map(item=>(
                <div key={item.idproducto} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg2)',borderRadius:10,border:'1px solid var(--border)' }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.nombre}</p>
                    <p style={{ fontSize:11,color:'var(--text2)' }}>${parseFloat(item.precio).toFixed(2)} c/u</p>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                    <button onClick={()=>cambiarCantidad(item.idproducto,-1)} style={{ width:30,height:30,borderRadius:8,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                    <span style={{ fontSize:15,fontWeight:700,minWidth:24,textAlign:'center' }}>{item.cantidad}</span>
                    <button onClick={()=>cambiarCantidad(item.idproducto,+1)} style={{ width:30,height:30,borderRadius:8,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                  </div>
                  <div style={{ minWidth:60,textAlign:'right',flexShrink:0 }}>
                    <p style={{ fontSize:14,fontWeight:700 }}>${(item.precio*item.cantidad).toFixed(2)}</p>
                    <button onClick={()=>setCarrito(p=>p.filter(i=>i.idproducto!==item.idproducto))} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:11,padding:0 }}>quitar</button>
                  </div>
                </div>
              ))}
            </div>
          }

          <div className="panel" style={{ position:'sticky',bottom:0 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <span style={{ fontSize:14,color:'var(--text2)' }}>Total ({carrito.reduce((s,i)=>s+i.cantidad,0)} items)</span>
              <span style={{ fontSize:28,fontWeight:700,color:'var(--accent)' }}>${total.toFixed(2)}</span>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setCarrito([])} disabled={carrito.length===0}>Limpiar</button>
              <button className="btn btn-primary" style={{ flex:2,padding:12,fontSize:15 }} onClick={()=>setModalCobro(true)} disabled={carrito.length===0}>Cobrar ${total.toFixed(2)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}