import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { List, Person, People, Calendar3, Clipboard, FileText, BarChart, ClipboardCheck, BoxArrowRight, Search, Megaphone, CurrencyDollar, Gear } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './SidebarMenu.css';

function SidebarMenu({ onLogout, userInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="menu-toggle" onClick={toggleMenu}>
        <List size={30} />
      </div>
      <div className="logo-container">
        <img src={userInfo?.photo || "/default-avatar.png"} alt="User" className="logo" />
        {isOpen && (
          <div className="user-info">
            <h5>{userInfo?.name || 'Usuario'}</h5>
            <span>{userInfo?.rol || 'Cargo'}</span>
          </div>
        )}
      </div>
      <ul className="nav flex-column icon-list">
        <li className="nav-item">
          <Link to="/profile" className="nav-link" title="Perfil">
            <Person size={20} />
            {isOpen && <span>Perfil</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/users" className="nav-link" title="Usuarios">
            <People size={20} />
            {isOpen && <span>Usuarios</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/clients" className="nav-link" title="Clientes">
            <Clipboard size={20} />
            {isOpen && <span>Clientes</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/services-calendar" className="nav-link" title="Calendario">
            <Calendar3 size={20} />
            {isOpen && <span>Calendario</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/myservices-calendar" className="nav-link" title="Calendario">
            <Calendar3 size={20} />
            {isOpen && <span>Mi Calendario</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/inspections" className="nav-link" title="Inspecciones">
            <FileText size={20} />
            {isOpen && <span>Inspecciones</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/services" className="nav-link" title="Servicios">
            <ClipboardCheck size={20} />
            {isOpen && <span>Servicios</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/products" className="nav-link" title="Produtos">
            <CurrencyDollar size={20} />
            {isOpen && <span>Productos</span>}
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/consumption" className="nav-link" title="Consumo">
            <CurrencyDollar size={20} />
            {isOpen && <span>Consumo</span>}
          </Link>
        </li>
        <li className="nav-item logout-item">
          <button className="nav-link btn btn-link" onClick={handleLogout} title="Cerrar Sesión">
            <BoxArrowRight size={20} />
            {isOpen && <span>Cerrar Sesión</span>}
          </button>
        </li>
      </ul>
    </div>
  );
}

export default SidebarMenu;