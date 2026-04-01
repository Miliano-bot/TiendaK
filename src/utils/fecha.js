// Zona horaria de Ecuador: America/Guayaquil (UTC-5)
const TZ = 'America/Guayaquil'

// Fecha y hora actual en Ecuador como string ISO para guardar en Supabase
export function ahoraEC() {
  return new Date().toISOString()  // Supabase siempre guarda UTC, está bien
}

// Formatear fecha de Supabase para mostrar en Ecuador
export function formatFecha(isoString, opciones = {}) {
  if (!isoString) return '—'
  const defaults = { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }
  return new Date(isoString).toLocaleDateString('es-EC', { ...defaults, ...opciones })
}

export function formatFechaHora(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('es-EC', {
    timeZone: TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatHora(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleTimeString('es-EC', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit',
  })
}

// Inicio y fin del día en Ecuador convertido a UTC para filtrar en Supabase
export function inicioDiaEC(fechaStr) {
  // fechaStr: 'YYYY-MM-DD'
  return new Date(fechaStr + 'T00:00:00-05:00').toISOString()
}

export function finDiaEC(fechaStr) {
  return new Date(fechaStr + 'T23:59:59-05:00').toISOString()
}

// Fecha de hoy en Ecuador como 'YYYY-MM-DD'
export function hoyEC() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }) // en-CA da formato YYYY-MM-DD
}