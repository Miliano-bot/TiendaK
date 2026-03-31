import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1

export default function Empresa() {
  const [form,    setForm]    = useState({ nombre: '', direccion: '', telefono: '', correo: '', logo: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [ok,      setOk]      = useState(false)

  useEffect(() => { fetchEmpresa() }, [])

  async function fetchEmpresa() {
    const { data } = await supabase.from('empresa').select('*').eq('idempresa', ID_EMPRESA).single()
    if (data) setForm({ nombre: data.nombre || '', direccion: data.direccion || '', telefono: data.telefono || '', correo: data.correo || '', logo: data.logo || '' })
    setLoading(false)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true); setOk(false)
    const { error } = await supabase.from('empresa').update({
      nombre:    form.nombre.trim(),
      direccion: form.direccion.trim(),
      telefono:  form.telefono.trim(),
      correo:    form.correo.trim(),
      logo:      form.logo.trim(),
    }).eq('idempresa', ID_EMPRESA)
    if (error) alert('Error: ' + error.message)
    else setOk(true)
    setSaving(false)
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); setOk(false) }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="panel">
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🏢 Información de la empresa</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 20 }}>Este nombre aparece en el menú lateral</p>

        {/* Preview logo */}
        {form.logo && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img
              src={form.logo}
              alt="Logo"
              style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }}
              onError={e => e.target.style.display = 'none'}
            />
          </div>
        )}

        <div className="form-group">
          <label>Nombre de la empresa *</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Mi Tienda" />
        </div>
        <div className="form-group">
          <label>Dirección</label>
          <input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Dirección completa" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Teléfono</label>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+593..." />
          </div>
          <div className="form-group">
            <label>Correo</label>
            <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="correo@tienda.com" />
          </div>
        </div>
        <div className="form-group">
          <label>URL del logo</label>
          <input value={form.logo} onChange={e => set('logo', e.target.value)} placeholder="https://..." />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {ok && <span style={{ fontSize: 13, color: 'var(--success)' }}>✅ Guardado correctamente</span>}
        </div>
      </div>
    </div>
  )
}