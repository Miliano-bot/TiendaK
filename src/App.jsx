import React from 'react';

const Menu = ({ setPage }) => {
  return (
    <div className="flex justify-around bg-gray-200 p-2 fixed bottom-0 w-full">
      <button onClick={() => setPage('dashboard')} className="flex-1 text-center p-2">🏠 Inicio</button>
      <button onClick={() => setPage('productos')} className="flex-1 text-center p-2">📦 Productos</button>
      <button onClick={() => setPage('ventas')} className="flex-1 text-center p-2">💰 Ventas</button>
      <button onClick={() => setPage('reportes')} className="flex-1 text-center p-2">📊 Reportes</button>
    </div>
  );
};

export default Menu;