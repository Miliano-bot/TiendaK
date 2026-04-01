import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'

const ID_EMPRESA = 1

function SeccionCategorias() {
  const [categorias,setCategorias]=useState([]); const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(false); const [form,setForm]=useState({nombre:'',descripcion:''}); const [editId,setEditId]=useState(null); const [saving,setSaving]=useState(false)

  useEffect(()=>{fetch()},[])
  async function fetch() { setLoading(true); const{data}=await supabase.from('categorias').select('*').eq('idempresa',ID_EMPRESA).order('nombre'); setCategorias(data||[]); setLoading(false) }
  function openNew()   { setForm({nombre:'',descripcion:''}); setEditId(null); setModal(true) }
  function openEdit(c) { setForm({nombre:c.nombre,descripcion:c.descripcion||''}); setEditId(c.idcategoria); setModal(true) }
  function close()     { setModal(false); setForm({nombre:'',descripcion:''}); setEditId(null) }

  async function save() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload={idempresa:ID_EMPRESA,nombre:form.nombre.trim(),descripcion:form.descripcion.trim()}
    const{error}=editId ? await supabase.from('categorias').update(payload).eq('idcategoria',editId) : await supabase.from('categorias').insert([payload])
    if(error) alert('Error: '+error.message); else { close(); fetch() }
    setSaving(false)
  }

  async function del(id) {
    if(!confirm('¿Eliminar esta categoría?')) return
    const{error}=await supabase.from('categorias').delete().eq('idcategoria',id)
    if(error) alert('Error: '+error.message); else fetch()
  }

  return (
    <div className="panel" style={{marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div><p style={{fontWeight:600,fontSize:15}}>🏷️ Categorías de productos</p><p style={{fontSize:12,color:'var(--text2)'}}>Para organizar tus productos</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nueva</button>
      </div>
      {loading ? <div className="loading">Cargando...</div> : categorias.length===0 ? (
        <div className="empty-state"><div className="empty-icon">🏷️</div>No hay categorías</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th></th></tr></thead>
            <tbody>
              {categorias.map(c=>(
                <tr key={c.idcategoria}>
                  <td style={{fontWeight:500}}>{c.nombre}</td>
                  <td style={{color:'var(--text2)'}}>{c.descripcion||'—'}</td>
                  <td><div className="actions"><button className="icon-btn" onClick={()=>openEdit(c)}>✏️</button><button className="icon-btn" onClick={()=>del(c.idcategoria)}>🗑️</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editId?'Editar categoría':'Nueva categoría'} onClose={close} onSave={save}>
          <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Bebidas" /></div>
          <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Opcional" /></div>
          {saving && <p style={{fontSize:13,color:'var(--text2)',marginTop:8}}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}

function SeccionCategoriasGasto() {
  const [categorias,setCategorias]=useState([]); const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(false); const [form,setForm]=useState({nombre:'',descripcion:'',activo:true}); const [editId,setEditId]=useState(null); const [saving,setSaving]=useState(false)

  useEffect(()=>{fetch()},[])
  async function fetch() { setLoading(true); const{data}=await supabase.from('categoriasgasto').select('*').order('nombre'); setCategorias(data||[]); setLoading(false) }
  function openNew()   { setForm({nombre:'',descripcion:'',activo:true}); setEditId(null); setModal(true) }
  function openEdit(c) { setForm({nombre:c.nombre,descripcion:c.descripcion||'',activo:c.activo}); setEditId(c.idcategoria); setModal(true) }
  function close()     { setModal(false); setForm({nombre:'',descripcion:'',activo:true}); setEditId(null) }

  async function save() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload={nombre:form.nombre.trim(),descripcion:form.descripcion.trim(),activo:form.activo}
    const{error}=editId ? await supabase.from('categoriasgasto').update(payload).eq('idcategoria',editId) : await supabase.from('categoriasgasto').insert([payload])
    if(error) alert('Error: '+error.message); else { close(); fetch() }
    setSaving(false)
  }

  async function toggleActivo(c) {
    await supabase.from('categoriasgasto').update({activo:!c.activo}).eq('idcategoria',c.idcategoria)
    fetch()
  }

  return (
    <div className="panel" style={{marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div><p style={{fontWeight:600,fontSize:15}}>💸 Categorías de gastos</p><p style={{fontSize:12,color:'var(--text2)'}}>Categorías disponibles al registrar gastos</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nueva</button>
      </div>
      {loading ? <div className="loading">Cargando...</div> : categorias.length===0 ? (
        <div className="empty-state"><div className="empty-icon">💸</div>No hay categorías de gasto</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {categorias.map(c=>(
                <tr key={c.idcategoria}>
                  <td style={{fontWeight:500}}>{c.nombre}</td>
                  <td style={{color:'var(--text2)'}}>{c.descripcion||'—'}</td>
                  <td>
                    <span className={`badge ${c.activo?'badge-success':'badge-danger'}`} style={{cursor:'pointer'}} onClick={()=>toggleActivo(c)}>
                      {c.activo?'Activo':'Inactivo'}
                    </span>
                  </td>
                  <td><div className="actions"><button className="icon-btn" onClick={()=>openEdit(c)}>✏️</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editId?'Editar categoría':'Nueva categoría de gasto'} onClose={close} onSave={save}>
          <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Arriendo" /></div>
          <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Opcional" /></div>
          <div className="form-group" style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" id="activo" checked={form.activo} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} />
            <label htmlFor="activo" style={{marginBottom:0,cursor:'pointer'}}>Activa (aparece al registrar gastos)</label>
          </div>
          {saving && <p style={{fontSize:13,color:'var(--text2)',marginTop:8}}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}

function SeccionUnidades() {
  const [unidades,setUnidades]=useState([]); const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(false); const [form,setForm]=useState({nombre:'',descripcion:''}); const [editId,setEditId]=useState(null); const [saving,setSaving]=useState(false)

  useEffect(()=>{fetchUnidades()},[])

  async function fetchUnidades() {
    setLoading(true)
    const{data}=await supabase.from('unidades').select('*').order('nombre')
    setUnidades(data||[])
    setLoading(false)
  }

  function openNew()   { setForm({nombre:'',descripcion:''}); setEditId(null); setModal(true) }
  function openEdit(u) { setForm({nombre:u.nombre,descripcion:u.descripcion||''}); setEditId(u.idunidad); setModal(true) }
  function close()     { setModal(false); setForm({nombre:'',descripcion:''}); setEditId(null) }

  async function save() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload={nombre:form.nombre.trim(),descripcion:form.descripcion.trim()}
    const{error}=editId ? await supabase.from('unidades').update(payload).eq('idunidad',editId) : await supabase.from('unidades').insert([payload])
    if(error) alert('Error: '+error.message); else { close(); fetchUnidades() }
    setSaving(false)
  }

  async function del(id) {
    if(!confirm('¿Eliminar esta unidad?')) return
    const{error}=await supabase.from('unidades').delete().eq('idunidad',id)
    if(error) alert('Error: '+error.message); else fetchUnidades()
  }

  return (
    <div className="panel">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div><p style={{fontWeight:600,fontSize:15}}>📏 Unidades de medida</p><p style={{fontSize:12,color:'var(--text2)'}}>Unidades disponibles al crear productos</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nueva</button>
      </div>
      {loading ? <div className="loading">Cargando...</div> : unidades.length===0 ? (
        <div className="empty-state"><div className="empty-icon">📏</div>No hay unidades</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th></th></tr></thead>
            <tbody>
              {unidades.map(u=>(
                <tr key={u.idunidad}>
                  <td style={{fontWeight:500}}>{u.nombre}</td>
                  <td style={{color:'var(--text2)'}}>{u.descripcion||'—'}</td>
                  <td><div className="actions"><button className="icon-btn" onClick={()=>openEdit(u)}>✏️</button><button className="icon-btn" onClick={()=>del(u.idunidad)}>🗑️</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editId?'Editar unidad':'Nueva unidad'} onClose={close} onSave={save}>
          <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Quintal" /></div>
          <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Ej: 100 libras" /></div>
          {saving && <p style={{fontSize:13,color:'var(--text2)',marginTop:8}}>Guardando...</p>}
        </Modal>
      )}
    </div>
  )
}

export default function Maestros() {
  return (
    <div>
      <SeccionCategorias />
      <SeccionCategoriasGasto />
      <SeccionUnidades />
    </div>
  )
}