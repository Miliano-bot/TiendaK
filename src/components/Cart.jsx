import React from 'react';

const Card = ({ title, value, color }) => (
  <div className={`p-4 rounded shadow text-center bg-${color}-100`}>
    <p className="text-gray-700 text-sm">{title}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

export default Card;