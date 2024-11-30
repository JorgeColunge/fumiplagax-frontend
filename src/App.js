import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import UserProfile from './UserProfile';
import EditProfile from './EditProfile';
import EditMyProfile from './EditMyProfile';
import SidebarMenu from './SidebarMenu';
import TopBar from './TopBar'; // Importa el componente TopBar
import axios from 'axios';
import UserList from './UserList';
import ClientList from './ClientList';
import ProductList from './ProductList';
import ShowProfile from './ShowProfile';
import InspectionCalendar from './InspectionCalendar';
import MyServicesCalendar from './myServicesCalendar';
import Inspections from './Inspections';
import ServiceList from './ServiceList';
import Inspection from './Inspection';
import MyServices from './MyServices';
import CompanyStations from './CompanyStations';
import UnsavedChangesModal from './UnsavedChangesModal';
import { UnsavedChangesProvider } from './UnsavedChangesContext';
import { syncRequests } from './offlineHandler';
import { saveUsers, getUsers, syncUsers } from './indexedDBHandler';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [syncCount, setSyncCount] = useState(parseInt(localStorage.getItem('sync') || '0', 10));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleSyncUpdate = (event) => {
      setSyncCount(event.detail); // Actualiza el estado con el nuevo valor
    };
  
    window.addEventListener('syncUpdate', handleSyncUpdate);
  
    return () => {
      window.removeEventListener('syncUpdate', handleSyncUpdate);
    };
  }, []);

  useEffect(() => {
    // Inicializar el contador de sincronización en 0 al montar la aplicación
    console.log('🔄 Inicializando contador de sincronización...');
    localStorage.setItem('sync', '0');
  
    // Emitir evento manual para reflejar el cambio
    const syncEvent = new CustomEvent('syncUpdate', { detail: 0 });
    window.dispatchEvent(syncEvent);
  }, []);

    // Manejar el cambio de tamaño de ventana
    useEffect(() => {
      const handleResize = () => {
        setIsSidebarVisible(window.innerWidth > 768); // Cambia la visibilidad del Sidebar según el tamaño
      };
  
      window.addEventListener('resize', handleResize); // Detecta cambios en el tamaño de la ventana
      return () => {
        window.removeEventListener('resize', handleResize); // Limpia el evento al desmontar
      };
    }, []);

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  const handleSync = () => {
    console.log('Sincronizando...');
  };

  const handleNotify = () => {
    console.log('Notificación');
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log('Conexión restaurada. Iniciando sincronización...');
      syncRequests();
      syncUsers();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Obtener userId del usuario almacenado en localStorage
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/notifications/${userId}`);
        setNotifications(response.data.notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
  
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem("user_info");
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUserInfo(userData);
    localStorage.setItem("user_info", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    localStorage.removeItem("user_info");
  };

  const handleProfileUpdate = (updatedUserInfo) => {
    setUserInfo(updatedUserInfo); // Actualiza el estado global
    localStorage.setItem('user_info', JSON.stringify(updatedUserInfo)); // Opcional: actualiza localStorage
  };  

  if (loading) return <div className="text-center mt-5">Cargando...</div>;

  return (
    <UnsavedChangesProvider>
    <Router>
      <div className="App d-flex">
        <UnsavedChangesModal />
        {isLoggedIn && (
          <>
            <SidebarMenu 
              userInfo={userInfo} 
              onLogout={handleLogout} 
              onToggle={handleSidebarToggle}
              isSidebarVisible={isSidebarVisible}
            />
            <TopBar 
              userName={userInfo?.name || "User"} 
              onSync={handleSync} 
              notifications={notifications} 
              setNotifications={setNotifications}
              isSidebarOpen={isSidebarOpen}
              isSidebarVisible={isSidebarVisible}
              toggleSidebar={() => setIsSidebarVisible((prev) => !prev)} 
              syncCount={syncCount}
            />
            </>
        )}
        <div 
          className={`main-content flex-grow-1 ${isLoggedIn ? '' : 'w-100'}`} 
          style={{ 
          marginTop: '60px',
          marginLeft: isSidebarVisible ? (isSidebarOpen ? '200px' : '60px') : '0px' // Ajusta el margen izquierdo según el estado del Sidebar
          }}
        >
        <Routes>
          <Route path="/" element={isLoggedIn ? <Navigate to="/profile" /> : <Navigate to="/login" />} />
          <Route path="/login" element={isLoggedIn ? <Navigate to="/profile" /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={isLoggedIn ? <Navigate to="/profile" /> : <Register />} />
          <Route path="/profile" element={isLoggedIn ? <UserProfile userInfo={userInfo} /> : <Navigate to="/login" />} />
          <Route path="/edit-profile/:id" element={isLoggedIn ? <EditProfile userInfo={userInfo} onProfileUpdate={handleProfileUpdate} /> : <Navigate to="/login" />} />
          <Route
  path="/edit-my-profile/:id"
  element={
    isLoggedIn ? (
      <EditMyProfile
        userInfo={userInfo}
        onProfileUpdate={handleProfileUpdate} // Pasa la función
      />
    ) : (
      <Navigate to="/login" />
    )
  }
/>
          <Route path="/users" element={isLoggedIn ? <UserList /> : <Navigate to="/login" />} />
          <Route path="/inspections" element={isLoggedIn ? <Inspections /> : <Navigate to="/login" />} />
          <Route path="/inspection/:inspectionId" element={isLoggedIn ? <Inspection /> : <Navigate to="/login" />} />
          <Route path="/products" element={isLoggedIn ? <ProductList /> : <Navigate to="/login" />} />
          <Route path="/services-calendar" element={isLoggedIn ? <InspectionCalendar /> : <Navigate to="/login" />} />
          <Route path="/myservices-calendar" element={isLoggedIn ? <MyServicesCalendar /> : <Navigate to="/login" />} />
          <Route path="/clients" element={isLoggedIn ? <ClientList /> : <Navigate to="/login" />} />
          <Route path="/show-profile/:id" element={<ShowProfile />} />
          <Route path="/services" element={isLoggedIn ? <ServiceList /> : <Navigate to="/login" />} />
          <Route path="/myservices" element={isLoggedIn ? <MyServices /> : <Navigate to="/login" />} />
          <Route path="/stations/client/:client_id" element={isLoggedIn ? <CompanyStations /> : <Navigate to="/login" />} />
        </Routes>       
        </div>
      </div>
    </Router>
    </UnsavedChangesProvider>
  );
}


export default App;