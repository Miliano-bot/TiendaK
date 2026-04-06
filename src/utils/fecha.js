const TZ = 'America/Guayaquil'

// Fecha de hoy en Ecuador YYYY-MM-DD
export function hoyEC() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

// Inicio del día en Ecuador → ISO UTC para Supabase
export function inicioDiaEC(fechaStr) {
  return new Date(fechaStr + 'T00:00:00-05:00').toISOString()
}

// Fin del día en Ecuador → ISO UTC para Supabase
export function finDiaEC(fechaStr) {
  return new Date(fechaStr + 'T23:59:59-05:00').toISOString()
}

// Convierte ISO de Supabase → YYYY-MM-DD en hora Ecuador (para agrupar por día)
export function isoADiaEC(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: TZ })
}

// Mostrar fecha corta: "05 abr 2026"
export function formatFecha(isoString) {
  if (!isoString) return '—'
  // Si viene solo YYYY-MM-DD agregar mediodía Ecuador para no restar días
  const str = isoString.length === 10 ? isoString + 'T12:00:00-05:00' : isoString
  return new Date(str).toLocaleDateString('es-EC', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
  })
}

// Mostrar fecha + hora: "05 abr 2026, 22:47"
export function formatFechaHora(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('es-EC', {
    timeZone: TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Solo hora: "22:47"
export function formatHora(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleTimeString('es-EC', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit',
  })
}

// Rango de fechas para filtros según período
export function getRangoFechas(periodo) {
  const hoy = hoyEC()
  const now  = new Date()

  if (periodo === 'hoy') {
    return { desde: inicioDiaEC(hoy), hasta: finDiaEC(hoy) }
  }

  if (periodo === 'semana') {
    // Lunes de esta semana en hora Ecuador
    const d   = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
    const dow = d.getDay() === 0 ? 7 : d.getDay()
    d.setDate(d.getDate() - (dow - 1))
    const lunes = d.toLocaleDateString('en-CA', { timeZone: TZ })
    return { desde: inicioDiaEC(lunes), hasta: finDiaEC(hoy) }
  }

  if (periodo === 'mes') {
    const [y, m] = hoy.split('-')
    return { desde: inicioDiaEC(`${y}-${m}-01`), hasta: finDiaEC(hoy) }
  }

  if (periodo === 'anio') {
    const y = hoy.split('-')[0]
    return { desde: inicioDiaEC(`${y}-01-01`), hasta: finDiaEC(hoy) }
  }

  return { desde: null, hasta: null } // total = sin filtro
}

// Label corto para ejes de gráficas: "05 abr"
export function labelDia(diaStr) {
  return new Date(diaStr + 'T12:00:00-05:00').toLocaleDateString('es-EC', {
    timeZone: TZ, day: '2-digit', month: 'short',
  })
}