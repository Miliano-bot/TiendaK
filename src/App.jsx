import React, { useState } from 'react';

function App() {
  const [mensaje, setMensaje] = useState("Hola, Miliano!");

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      {/* Cuadrito con color */}
      <div className="p-6 bg-blue-100 rounded shadow text-center mb-4 w-60">
        <p className="text-gray-700 font-bold">{mensaje}</p>
      </div>

      {/* Botón que cambia el mensaje */}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={() => setMensaje("¡Has hecho clic!")}
      >
        Cambiar mensaje
      </button>
    </div>
  );
}

export default App;