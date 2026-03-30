import React from 'react';

const Sidebar = ({ isOpen, setPage }) => {
  return (
    <div className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 p-4 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <h2 className="text-xl font-bold mb-6">Mi Tienda</h2>
      <button className="mb-4 text-left w-full" onClick={() => setPage('dashboard')}>🏠 Dashboard</button>
      <button className="mb-4 text-left w-full" onClick={() => setPage('productos')}>📦 Productos</button>
      <button className="mb-4 text-left w-full" onClick={() => setPage('ventas')}>💰 Ventas</button>
      <button className="mb-4 text-left w-full" onClick={() => setPage('reportes')}>📊 Reportes</button>
    </div>
  );
};

export default Sidebar;