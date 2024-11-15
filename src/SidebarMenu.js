import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { List, Person, People, Calendar3, Clipboard, FileText, BarChart, ClipboardCheck, BoxArrowRight, Search, Megaphone, CurrencyDollar, Gear, CalendarDate, CalendarEvent, Eyedropper, PersonFillGear, GraphUp, ChatLeftDots, BoxArrowInUpRight } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './SidebarMenu.css';

function SidebarMenu({ onLogout, userInfo, onToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    onToggle(!isOpen); // Llama a la función pasada como prop
  };

  const [profilePic, setProfilePic] = useState('/'); // Imagen predeterminada

  useEffect(() => {
    if (userInfo && userInfo.image) {
      setProfilePic(`http://localhost:10000${userInfo.image}`); // Cambia la URL base según sea necesario
    }
  }, [userInfo]);  

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="menu-toggle" onClick={toggleMenu}>
        <List size={30} />
      </div>
      <div className="logo-container">
      <img src={profilePic} alt="User" className="logo" />
        {isOpen && (
          <div className="user-info">
            <h5>{userInfo?.name || 'Usuario'}</h5>
            <span>{userInfo?.rol || 'Cargo'}</span>
          </div>
        )}
      </div>
      <div className="nav-item">
        <Link to="/profile" className="nav-link" title="Perfil">
            <Person size={20} />
            {isOpen && <span>Perfil</span>}
        </Link>
      </div>
        <div className="nav-item">
          <Link to="/users" className="nav-link" title="Usuarios">
            <PersonFillGear size={20} />
            {isOpen && <span>Usuarios</span>}
          </Link>
        </div>
        <div className="nav-item">
          <Link to="/clients" className="nav-link" title="Clientes">
            <People size={20} />
            {isOpen && <span>Clientes</span>}
          </Link>
        </div>
        <div className="nav-item">
  <Link to="/myservices" className="nav-link" title="Mis Servicios">
    <BoxArrowInUpRight size={20} />
    {isOpen && <span>Mis Servicios</span>}
  </Link>
</div>
        <div className="nav-item">
          <Link to="/services-calendar" className="nav-link" title="Calendario">
            <Calendar3 size={20} />
            {isOpen && <span>Calendario</span>}
          </Link>
        </div>
        <div className="nav-item">
          <Link to="/myservices-calendar" className="nav-link" title="Calendario">
            <CalendarEvent size={20} />
            {isOpen && <span>Mi Calendario</span>}
          </Link>
        </div>
        <div className="nav-item">
          <Link to="/inspections" className="nav-link" title="Inspecciones">
            <FileText size={20} />
            {isOpen && <span>Inspecciones</span>}
          </Link>
        </div>
        <div className="nav-item">
          <Link to="/services" className="nav-link" title="Servicios">
            <ClipboardCheck size={20} />
            {isOpen && <span>Servicios</span>}
          </Link>
        </div>
        <div className="nav-item">
          <Link to="/products" className="nav-link" title="Produtos">
            <Eyedropper size={20} />
            {isOpen && <span>Productos</span>}
          </Link>
        </div>
        <div className="nav-item">
          <Link to="/consumption" className="nav-link" title="Consumo">
            <GraphUp size={20} />
            {isOpen && <span>Consumo</span>}
          </Link>
        </div>
        <div className="nav-item">
          <button className="nav-link btn btn-link" onClick={handleLogout} title="Cerrar Sesión">
            <BoxArrowRight size={20} />
            {isOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
    </div>
  );
}

export default SidebarMenu;