import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/login`, { email, password });
  
      if (response.data.success) {
        const userData = response.data.user;
        localStorage.setItem("user_info", JSON.stringify(userData));
        console.log('user info: ', userData);
        onLogin(userData);
        if(userData.rol=='Cliente'){
          navigate('/client-profile');
        }else{
          navigate('/profile');
        }
      } else {
        setError(response.data.message || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Problema de red o error en el servidor");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="row w-100">
        <div className="col-md-6 bg-light p-5 rounded-start shadow-lg">
          <div className="text-center mb-4">
            <img src="/images/Logo FumiPlagax.png" alt="Logo" className="login-logo img-fluid" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="email"
                className="form-control"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="rememberMe" />
                <label className="form-check-label" htmlFor="rememberMe">Recuérdame</label>
              </div>
              <a href="#" className="text-decoration-none text-success">¿Olvidaste tu contraseña?</a>
            </div>
            <button type="submit" className="btn btn-success w-100 mb-3">Iniciar Sesión</button>
            {error && <p className="text-danger text-center">{error}</p>}
          </form>
        </div>
        <div
          className="col-12 col-md-6 rounded-end"
          style={{
            backgroundImage: `url("/Fondo 1.jpg")`,
            backgroundSize: window.innerWidth < 768 ? 'cover' : '230%',
            backgroundPosition: 'center',
            minHeight: window.innerWidth < 768 ? '200px' : '100%',
            borderRadius: window.innerWidth < 768 ? '0 0 8px 8px' : '0 8px 8px 0',
          }}
        ></div>

      </div>
    </div>
  );
}

export default Login;
