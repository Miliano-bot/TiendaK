import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [productos, setProductos] = useState([])

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('discontinuado', false) // Solo productos activos

    if (error) {
      console.error('Error cargando productos:', error)
    } else {
      console.log('Productos:', data)
      setProductos(data)
    }
  }

  return (
    <div>
      <h1>Productos de prueba</h1>
      {productos.length === 0 && <p>No hay productos</p>}
      {productos.map(p => (
        <div key={p.idproducto} style={{border:'1px solid gray', margin:'5px', padding:'5px'}}>
          <h2>{p.nombre}</h2>
          <p>Precio: ${p.precio}</p>
          <p>Cantidad: {p.cantidad}</p>
        </div>
      ))}
    </div>
  )
}

export default App