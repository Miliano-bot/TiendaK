import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { hoyEC } from '../utils/fecha'

const ID_EMPRESA = 1

// Calcula el período actual según el ciclo
export function getPeriodo(ciclo, fecha = new Date()) {
  const tz = 'America/Guayaquil'
  const y = fecha.toLocaleDateString('en-CA', { timeZone: tz }).split('-')[0]
  const m = fecha.toLocaleDateString('en-CA', { timeZone: tz }).split('-')[1]
  const w = getWeekNumber(fecha)
  if (ciclo === 'semanal')     return `${y}-W${String(w).padStart(2,'0')}`
  if (ciclo === 'mensual')     return `${y}-${m}`
  if (ciclo === 'trimestral')  return `${y}-Q${Math.ceil(parseInt(m)/3)}`
  if (ciclo === 'anual')       return `${y}`
  return `${y}-${m}`
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

// Verifica si un gasto programado tiene pago pendiente hoy
export function estaPendiente(gasto, pagos) {
  const hoy = hoyEC()
  if (!gasto.activo) return false
  if (gasto.fecha_fin && gasto.fecha_fin < hoy) return false
  if (gasto.fecha_inicio > hoy) return false

  const periodo = getPeriodo(gasto.ciclo)
  const pago = pagos.find(p => p.idprogramado === gasto.idprogramado && p.periodo === periodo)
  if (pago && (pago.estado === 'pagado' || pago.estado === 'omitido')) return false

  // Verificar si hoy es el día de pago o ya pasó en este período
  const hoyDate = new Date()
  const tz = 'America/Guayaquil'
  const diaHoy = parseInt(new Date().toLocaleDateString('es-EC', { timeZone: tz, day: 'numeric' }))
  const mesHoy = parseInt(new Date().toLocaleDateString('es-EC', { timeZone: tz, month: 'numeric' }))

  if (gasto.ciclo === 'mensual'    && gasto.dia_pago && diaHoy >= gasto.dia_pago) return true
  if (gasto.ciclo === 'anual'      && gasto.mes_pago && mesHoy >= gasto.mes_pago) return true
  if (gasto.ciclo === 'semanal')   return true
  if (gasto.ciclo === 'trimestral') return true
  return false
}

export function useNotificaciones() {
  const [notifs,   setNotifs]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [totalNum, setTotalNum] = useState(0)

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    const hoy = hoyEC()

    const [
      { data: gastosProg },
      { data: pagosGastos },
      { data: productos },
      { data: ventasHoy },
      { data: cortesHoy },
    ] = await Promise.all([
      supabase.from('gastosprogramados').select('*').eq('idempresa', ID_EMPRESA).eq('activo', true),
      supabase.from('pagos_gastos').select('*'),
      supabase.from('productos').select('idproducto,nombre,cantidad,stock_minimo').eq('idempresa', ID_EMPRESA).eq('discontinuado', false),
      supabase.from('ventas').select('total').eq('idempresa', ID_EMPRESA).gte('fecha', hoy + 'T00:00:00-05:00').lte('fecha', hoy + 'T23:59:59-05:00'),
      supabase.from('cortecaja').select('idcorte').eq('idempresa', ID_EMPRESA).gte('fecha', hoy + 'T00:00:00-05:00'),
    ])

    const lista = []

    // 1. Gastos programados pendientes
    const pendientes = (gastosProg || []).filter(g => estaPendiente(g, pagosGastos || []))
    pendientes.forEach(g => {
      const periodo = getPeriodo(g.ciclo)
      const pago    = (pagosGastos||[]).find(p => p.idprogramado === g.idprogramado && p.periodo === periodo)
      const vencido = pago?.estado === undefined // nunca se registró

      lista.push({
        id:    `gasto-${g.idprogramado}`,
        tipo:  'gasto',
        nivel: 'warn',
        titulo: `Gasto pendiente: ${g.nombre}`,
        subtitulo: `$${parseFloat(g.monto_base).toFixed(2)} · ${g.ciclo}`,
        data:  g,
        periodo,
      })
    })

    // 2. Gastos vencidos (fecha_fin ya pasó y no se pagó el último período)
    const vencidos = (gastosProg || []).filter(g => {
      if (!g.fecha_fin) return false
      if (g.fecha_fin >= hoy) return false
      const periodo = getPeriodo(g.ciclo, new Date(g.fecha_fin + 'T12:00:00'))
      const pago = (pagosGastos||[]).find(p => p.idprogramado === g.idprogramado && p.periodo === periodo)
      return !pago || pago.estado === 'pendiente'
    })
    vencidos.forEach(g => {
      lista.push({
        id:    `vencido-${g.idprogramado}`,
        tipo:  'gasto_vencido',
        nivel: 'danger',
        titulo: `Gasto vencido sin pagar: ${g.nombre}`,
        subtitulo: `Venció el ${g.fecha_fin}`,
        data:  g,
      })
    })

    // 3. Stock sin inventario
    const sinStock = (productos||[]).filter(p => p.cantidad === 0)
    if (sinStock.length > 0) {
      lista.push({
        id:    'sin-stock',
        tipo:  'stock',
        nivel: 'danger',
        titulo: `${sinStock.length} producto${sinStock.length>1?'s':''} sin stock`,
        subtitulo: sinStock.slice(0,3).map(p=>p.nombre).join(', ') + (sinStock.length>3?'...':''),
        data:  sinStock,
      })
    }

    // 4. Stock bajo
    const stockBajo = (productos||[]).filter(p => p.cantidad > 0 && p.stock_minimo > 0 && p.cantidad <= p.stock_minimo)
    if (stockBajo.length > 0) {
      lista.push({
        id:    'stock-bajo',
        tipo:  'stock_bajo',
        nivel: 'warn',
        titulo: `${stockBajo.length} producto${stockBajo.length>1?'s':''} con stock bajo`,
        subtitulo: stockBajo.slice(0,3).map(p=>`${p.nombre} (${p.cantidad})`).join(', '),
        data:  stockBajo,
      })
    }

    // 5. Ventas del día
    const totalVentasHoy = (ventasHoy||[]).reduce((s,v)=>s+parseFloat(v.total),0)
    if (ventasHoy && ventasHoy.length > 0) {
      lista.push({
        id:    'ventas-hoy',
        tipo:  'ventas',
        nivel: 'success',
        titulo: `${ventasHoy.length} venta${ventasHoy.length>1?'s':''} hoy`,
        subtitulo: `Total: $${totalVentasHoy.toFixed(2)}`,
        data:  { count: ventasHoy.length, total: totalVentasHoy },
      })
    }

    // 6. Corte de caja pendiente (si ya son después de las 18:00)
    const horaActual = parseInt(new Date().toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: 'numeric', hour12: false }))
    if (horaActual >= 18 && (!cortesHoy || cortesHoy.length === 0)) {
      lista.push({
        id:    'corte-pendiente',
        tipo:  'corte',
        nivel: 'warn',
        titulo: 'Corte de caja pendiente',
        subtitulo: 'No se ha hecho el corte de hoy',
        data:  null,
      })
    }

    setNotifs(lista)
    setTotalNum(lista.filter(n => n.nivel !== 'success').length)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000) // actualizar cada minuto
    return () => clearInterval(interval)
  }, [fetchNotifs])

  return { notifs, loading, totalNum, refresh: fetchNotifs }
}