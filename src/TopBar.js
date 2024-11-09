// TopBar.js
import React from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { FaSyncAlt, FaBell } from 'react-icons/fa'; // Agrega FaBell para el ícono de notificación
import './TopBar.css';

function TopBar({ userName, onSync, onNotify, isSidebarOpen }) {
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '';

  return (
    <Navbar 
  bg="light" 
  expand="lg" 
  className="top-bar shadow-sm px-3"
  style={{ marginLeft: isSidebarOpen ? '240px' : '60px', width: isSidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 60px)'}}
>
      <Navbar.Brand href="#" className="d-flex align-items-center">
      <img
  src="/images/Logo FumiPlagax.png" // Mismo logo que en Login.js
  alt="Logo"
  width="60"
  className="d-inline-block align-top mr-2"
/>
        <span>Fumiplagax Services</span>
      </Navbar.Brand>
      <Nav className="ml-auto d-flex align-items-center">
        <Button variant="link" onClick={onSync} className="sync-icon">
          <FaSyncAlt size={20} />
        </Button>
        <Button variant="link" onClick={onNotify} className="notify-icon ml-2">
          <FaBell size={20} />
        </Button>
        <div className="user-initial-circle bg-success text-white ml-3 d-flex align-items-center justify-content-center">
          {userInitial}
        </div>
      </Nav>
    </Navbar>
  );
}

export default TopBar;