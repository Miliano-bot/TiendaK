import React from 'react';

const Navbar = ({ toggleSidebar, title }) => {
  return (
    <div className="bg-blue-500 text-white flex items-center p-4 justify-between">
      <button onClick={toggleSidebar} className="text-white font-bold text-lg">
        ☰
      </button>
      <span className="font-bold text-lg">{title}</span>
    </div>
  );
};

export default Navbar;