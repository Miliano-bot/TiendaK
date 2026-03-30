import React, { useState } from 'react';

// Sidebar
const Sidebar = ({ isOpen, setPage }) => (
  <div className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 p-4 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <h2 className="text-xl font-bold mb-6">Mi Tienda</h2>
    <button onClick={() => setPage('dashboard')} className="mb-4 w-full text-left">🏠 Dashboard</button>
    <button onClick={() => setPage('productos')} className="mb-4 w-full text-left">📦 Productos</button>
    <button onClick={() => setPage('ventas')} className="mb-4 w-full text-left">💰 Ventas</button>
    <button onClick={() => setPage('reportes')} className="mb-4 w-full text-left">📊 Reportes</button>
  </div>
);

// Navbar
const Navbar = ({ toggleSidebar, title }) => (
  <div className="bg-blue-500 text-white flex items-center p-4 justify-between">
    <button onClick={toggleSidebar} className="text-white font-bold text-lg">☰</button>
    <span className="font-bold text-lg">{title}</span>
  </div>
);

// Pages
const Dashboard = () => <div className="p-4">🏠 Bienvenido al Dashboard</div>;
const Productos = () => <div className="p-4">📦 Aquí van los productos</div>;
const Ventas = () => <div className="p-4">💰 Aquí se hacen las ventas</div>;
const Reportes = () => <div className="p-4">📊 Aquí van los reportes</div>;

// App
function App() {
  const [page, setPage] = useState('dashboard'); // Página actual
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch(page){
      case 'dashboard': return <Dashboard />;
      case 'productos': return <Productos />;
      case 'ventas': return <Ventas />;
      case 'reportes': return <Reportes />;
      default: return <Dashboard />;
    }
  };

  const titles = {
    dashboard: 'Dashboard',
    productos: 'Productos',
    ventas: 'Ventas',
    reportes: 'Reportes'
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex">
      <Sidebar isOpen={sidebarOpen} setPage={setPage} />
      <div className="flex-1 min-h-screen bg-gray-50">
        <Navbar toggleSidebar={toggleSidebar} title={titles[page]} />
        <div className="p-4">{renderPage()}</div>
      </div>
    </div>
  );
}

export default App;