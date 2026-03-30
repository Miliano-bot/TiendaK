import React from 'react';

const Dashboard = () => {
  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-center">Mi Dashboard</h1>

      {/* Resumen de ventas */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="p-4 bg-white rounded shadow text-center">
          <p className="text-gray-500 text-sm">Ventas hoy</p>
          <p className="text-xl font-semibold">25</p>
        </div>
        <div className="p-4 bg-white rounded shadow text-center">
          <p className="text-gray-500 text-sm">Ingresos</p>
          <p className="text-xl font-semibold">$1,250</p>
        </div>
        <div className="p-4 bg-white rounded shadow text-center">
          <p className="text-gray-500 text-sm">Clientes</p>
          <p className="text-xl font-semibold">10</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-col gap-2">
        <button className="bg-blue-500 text-white p-3 rounded">Agregar venta</button>
        <button className="bg-green-500 text-white p-3 rounded">Clientes</button>
        <button className="bg-yellow-500 text-white p-3 rounded">Productos</button>
      </div>
    </div>
  );
};

export default Dashboard;