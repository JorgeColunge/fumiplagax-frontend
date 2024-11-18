// TopBar.js
import React from 'react';
import { Navbar, Nav, Button, Dropdown, Badge } from 'react-bootstrap';
import { FaSyncAlt, FaBell, FaBars } from 'react-icons/fa';
import axios from 'axios';
import './TopBar.css';
import { Arrow90degRight, ArrowLeftSquareFill, ArrowRightSquareFill } from 'react-bootstrap-icons';

function TopBar({ userName, onSync, notifications, setNotifications, isSidebarOpen, isSidebarVisible, toggleSidebar, syncCount }) {
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '';

  // Maneja el clic en una notificación para marcarla como leída
  const handleNotificationClick = async (notificationId) => {
    try {
      await axios.put(`http://localhost:10000/api/notifications/${notificationId}/read`);
      
      // Actualiza el estado local para marcar como leída la notificación
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Contar las notificaciones no leídas
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <Navbar
      bg="light"
      expand="lg"
      className="top-bar shadow-sm px-3"
      style={{
        marginLeft: isSidebarVisible ? (isSidebarOpen ? '240px' : '60px') : '0px',
        width: isSidebarVisible
          ? isSidebarOpen
            ? 'calc(100% - 240px)'
            : 'calc(100% - 60px)'
          : '100%',
      }}
    >

      {/* Contenedor del logo */}
      <div className="d-flex align-items-center">
        <Button
          variant="link"
          className="arrows me-2"
          onClick={toggleSidebar} // Controla la visibilidad del SidebarMenu
        >
        <img
          src="/images/Logo FumiPlagax.png"
          alt="Logo"
          className="d-inline-block align-top topbar-logo"
        />
        </Button>
        <img
          src="/images/Logo FumiPlagax.png"
          alt="Logo"
          className=" align-top topbar-logo"
        />
        <span className='mx-2'>Fumiplagax Services</span>
      </div>

      {/* Contenedor de los íconos */}
      <div className="ml-auto  align-items-center" 
      style={{
        display: isSidebarOpen && window.innerWidth < 600 ? 'none' : 'flex',
      }}>
        {/* Botón de sincronización */}
        <div className="icon-container d-flex align-items-center">
          <Button variant="link" onClick={onSync} className="sync-icon">
            <FaSyncAlt size={20} />
            {syncCount > 0 && (
              <Badge pill variant="danger" className="notification-count">
                {syncCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Dropdown de notificaciones */}
        <div className="icon-container d-flex align-items-center">
          <Dropdown align="end">
            <Dropdown.Toggle as={Button} variant="link" className="notify-icon">
              <FaBell size={20} />
              {unreadCount > 0 && (
                <Badge pill variant="danger" className="notification-count">
                  {unreadCount}
                </Badge>
              )}
            </Dropdown.Toggle>

            <Dropdown.Menu className="notification-dropdown-menu">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <Dropdown.Item
                    key={index}
                    className={`notification-item ${notification.is_read ? '' : 'font-weight-bold'}`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    {notification.notification}
                  </Dropdown.Item>
                ))
              ) : (
                <Dropdown.Item className="text-muted">No hay notificaciones</Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* Iniciales del usuario */}
        <div className="icon-container d-flex align-items-center">
          <div className="user-initial-circle bg-success text-white d-flex align-items-center justify-content-center">
            {userInitial}
          </div>
        </div>
      </div>
</Navbar>
  );
}

export default TopBar;