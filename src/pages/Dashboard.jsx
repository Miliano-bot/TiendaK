import React from 'react';
import Card from '../components/Card';

const Dashboard = () => (
  <div className="p-4 grid grid-cols-1 gap-4">
    <Card title="Ventas hoy" value="25" color="green" />
    <Card title="Ingresos" value="$1,250" color="blue" />
    <Card title="Clientes" value="10" color="yellow" />
    <Card title="Productos críticos" value="3" color="red" />
  </div>
);

export default Dashboard;