import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import UserProfile from './UserProfile';
import EditProfile from './EditProfile';
import EditMyProfile from './EditMyProfile';
import SidebarMenu from './SidebarMenu';
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
import { syncRequests } from './offlineHandler';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Conexión restaurada. Iniciando sincronización...');
      syncRequests();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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
    setUserInfo(updatedUserInfo);
    localStorage.setItem("user_info", JSON.stringify(updatedUserInfo));
  };

  if (loading) return <div className="text-center mt-5">Cargando...</div>;

  return (
    <Router>
      <div className="App d-flex">
        {isLoggedIn && <SidebarMenu onLogout={handleLogout} userInfo={userInfo} />}
        <div className={`main-content flex-grow-1 ${isLoggedIn ? '' : 'w-100'}`}>
          <Routes>
            <Route path="/" element={isLoggedIn ? <Navigate to="/profile" /> : <Navigate to="/login" />} />
            <Route path="/login" element={isLoggedIn ? <Navigate to="/profile" /> : <Login onLogin={handleLogin} />} />
            <Route path="/register" element={isLoggedIn ? <Navigate to="/profile" /> : <Register />} />
            <Route path="/profile" element={isLoggedIn ? <UserProfile userInfo={userInfo} /> : <Navigate to="/login" />} />
            <Route path="/edit-profile/:id" element={isLoggedIn ? <EditProfile userInfo={userInfo} onProfileUpdate={handleProfileUpdate} /> : <Navigate to="/login" />} />
            <Route path="/edit-my-profile/:id" element={isLoggedIn ? <EditMyProfile userInfo={userInfo} onProfileUpdate={handleProfileUpdate} /> : <Navigate to="/login" />} />
            <Route path="/users" element={isLoggedIn ? <UserList /> : <Navigate to="/login" />} />
            <Route path="/inspections" element={isLoggedIn ? <Inspections /> : <Navigate to="/login" />} />
            <Route path="/inspection/:inspectionId" element={isLoggedIn ? <Inspection /> : <Navigate to="/login" />} />
            <Route path="/products" element={isLoggedIn ? <ProductList /> : <Navigate to="/login" />} />
            <Route path="/services-calendar" element={isLoggedIn ? <InspectionCalendar /> : <Navigate to="/login" />} />
            <Route path="/myservices-calendar" element={isLoggedIn ? <MyServicesCalendar /> : <Navigate to="/login" />} />
            <Route path="/clients" element={isLoggedIn ? <ClientList /> : <Navigate to="/login" />} />
            <Route path="/show-profile/:id" element={<ShowProfile />} />
            <Route path="/services" element={isLoggedIn ? <ServiceList /> : <Navigate to="/login" />} /> {/* Nueva ruta para ServiceList */}
            <Route path="/myservices" element={isLoggedIn ? <MyServices /> : <Navigate to="/login" />} /> {/* Nueva ruta para ServiceList */}
            <Route path="/stations/client/:client_id" element={isLoggedIn ? <CompanyStations /> : <Navigate to="/login" />} /> {/* Nueva ruta para ServiceList */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;