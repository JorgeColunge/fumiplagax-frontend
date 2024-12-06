import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from './UnsavedChangesContext';
import { List, Person, People, Calendar3, Clipboard, FileText, BarChart, ClipboardCheck, BoxArrowRight, Search, Megaphone, CurrencyDollar, Gear, CalendarDate, CalendarEvent, Eyedropper, PersonFillGear, GraphUp, ChatLeftDots, BoxArrowInUpRight } from 'react-bootstrap-icons';
import axios from 'axios';
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

  const [user, setUser] = useState(null); // Estado para manejar los datos del usuario

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user_info"));
    if (storedUser) {
      setUser(storedUser); // Actualiza el estado con los datos de localStorage
    }
  }, []);

  useEffect(() => {
    if (!userInfo?.id_usuario) return;
  
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/users/${userInfo.id_usuario}`);
        setUser(response.data); // Actualiza el estado del usuario
      } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
      }
    };
  
    fetchUser();
  }, [userInfo?.id_usuario, userInfo]);  

  const handleNavigation = (path) => {
    if (hasUnsavedChanges) {
      setUnsavedRoute(path); // Configura la ruta pendiente
      setShowUnsavedModal(true); // Muestra el modal
      return;
    }
    navigate(path); // Navega directamente si no hay cambios pendientes
    if (isOpen) {
      toggleMenu(); // Colapsa la barra si está abierta
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    onToggle(!isOpen); // Llama a la función pasada como prop
  };
  

  const [profilePic, setProfilePic] = useState('/'); // Imagen predeterminada

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
        <img
          src={`http://localhost:10000${user?.image || '/images/default-profile.png'}`}
          alt="Profile"
          className="logo"
        />
      </div>
        {isOpen && (
          <div className="user-info">
            <h5>{userInfo?.name || 'Usuario'}</h5>
<span>{user?.rol || 'Cargo'}</span>
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
        <button className="nav-link btn btn-link" onClick={() => handleNavigation('/inspections')}>
          <FileText size={20} />
          {isOpen && <span>Inspecciones</span>}
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
