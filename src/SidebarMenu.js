import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from './UnsavedChangesContext';
import { List, Person, People, Calendar3, Clipboard, FileText, BarChart, ClipboardCheck, BoxArrowRight, Search, Megaphone, CurrencyDollar, Gear, CalendarDate, CalendarEvent, Eyedropper, PersonFillGear, GraphUp, ChatLeftDots, BoxArrowInUpRight } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './SidebarMenu.css';

function SidebarMenu({ onLogout, userInfo, isSidebarVisible, onToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const {
    hasUnsavedChanges,
    setUnsavedRoute,
    setShowUnsavedModal,
  } = useUnsavedChanges();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    if (hasUnsavedChanges) {
      setUnsavedRoute(path); // Configura la ruta pendiente
      setShowUnsavedModal(true); // Muestra el modal
      return;
    }
    navigate(path); // Navega directamente si no hay cambios pendientes
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
    <div
  className={`sidebar ${isSidebarVisible ? 'visible' : 'hidden'} ${
    isOpen ? 'open' : 'collapsed'
  }`}
>
      <div className="menu-toggle" onClick={toggleMenu}>
        <List size={30} />
      </div>
      <div className="logo-container">
      <div className="logo-mask">
        <img src={profilePic} alt="User" className="logo" />
      </div>
        {isOpen && (
          <div className="user-info">
            <h5>{userInfo?.name || 'Usuario'}</h5>
            <span>{userInfo?.rol || 'Cargo'}</span>
          </div>
        )}
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/profile')}>
          <Person size={20} />
          {isOpen && <span>Perfil</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/users')}>
          <PersonFillGear size={20} />
          {isOpen && <span>Usuarios</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/clients')}>
          <People size={20} />
          {isOpen && <span>Clientes</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/services-calendar')}>
          <Calendar3 size={20} />
          {isOpen && <span>Calendario</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/myservices-calendar')}>
          <CalendarEvent size={20} />
          {isOpen && <span>Mi Calendario</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/inspections')}>
          <FileText size={20} />
          {isOpen && <span>Inspecciones</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/services')}>
          <ClipboardCheck size={20} />
          {isOpen && <span>Servicios</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/myservices')}>
          <BoxArrowInUpRight size={20} />
          {isOpen && <span>Mis Servicios</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/products')}>
          <Eyedropper size={20} />
          {isOpen && <span>Productos</span>}
        </button>
      </div>
      <div className="nav-item">
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/consumption')}>
          <GraphUp size={20} />
          {isOpen && <span>Consumo</span>}
        </button>
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