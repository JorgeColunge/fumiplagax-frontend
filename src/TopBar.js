// TopBar.js
import React from 'react';
import { Navbar, Nav, Button, Dropdown, Badge } from 'react-bootstrap';
import { FaSyncAlt, FaBell } from 'react-icons/fa';
import axios from 'axios';
import './TopBar.css';

function TopBar({ userName, onSync, notifications, setNotifications, isSidebarOpen }) {
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
      style={{ marginLeft: isSidebarOpen ? '240px' : '60px', width: isSidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 60px)'}}
    >
      <Navbar.Brand href="#" className="d-flex align-items-center">
        <img
          src="/images/Logo FumiPlagax.png"
          alt="Logo"
          width="60"
          className="d-inline-block align-top mr-2"
        />
        <span>Fumiplagax Services</span>
      </Navbar.Brand>

      <Nav className="ml-auto d-flex align-items-center">
        {/* Botón de sincronización */}
        <Button variant="link" onClick={onSync} className="sync-icon">
          <FaSyncAlt size={20} />
        </Button>

        {/* Dropdown para las notificaciones */}
        <Dropdown alignRight>
          <Dropdown.Toggle as={Button} variant="link" className="notify-icon ml-2">
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

        <div className="user-initial-circle bg-success text-white ml-3 d-flex align-items-center justify-content-center">
          {userInitial}
        </div>
      </Nav>
    </Navbar>
  );
}

export default TopBar;