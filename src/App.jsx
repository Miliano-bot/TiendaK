import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Reportes from './pages/Reportes';

function App() {
  const [page, setPage] = useState('dashboard');
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
  }

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