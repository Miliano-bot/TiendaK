import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient' // asegúrate de que el path sea correcto

function App() {
  const [productos, setProductos] = useState([])

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('Productos')           // mayúscula inicial
      .select('*')
      .eq('discontinuo', false)    // solo productos activos

    if (error) {
      console.error('Error cargando productos:', error)
    } else {
      setProductos(data)
    }
  }

  return (
    <div style={{padding:'20px'}}>
      <h1>Productos de prueba</h1>

      {productos.length === 0 ? (
        <p>No hay productos</p>
      ) : (
        productos.map(p => (
          <div 
            key={p.IdProducto} 
            style={{border:'1px solid gray', margin:'5px', padding:'10px', borderRadius:'5px'}}
          >
            <h2>{p.nombre}</h2>
            <p>Precio: ${p.precio}</p>
            <p>Cantidad: {p.cantidad}</p>
          </div>
        ))
      )}
    </div>
  )
}

export default App