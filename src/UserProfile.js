import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

function UserProfile({ userInfo }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/users/${userInfo.id_usuario}`);
        setUser(response.data);
      } catch (error) {
        console.error("Error al obtener la información del usuario:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userInfo.id_usuario]);

  const handleEditProfile = () => {
    navigate(`/edit-my-profile/${userInfo.id_usuario}`);
  };

  if (loading) return <div className="text-center mt-5">Cargando...</div>;

  return (
    <div className="container mt-5">
      <div className="text-center">
        <img
          src={`http://localhost:10000${user?.image || '/images/default-profile.png'}`}
          alt="Profile"
          className="rounded-circle"
          width="150"
          height="150"
        />
      </div>
      <div className="mt-5 text-center">
        <h2>Información del Usuario</h2>
        {user ? (
          <ul className="list-group mt-3">
            <li className="list-group-item"><strong>Nombre:</strong> {user.name}</li>
            <li className="list-group-item"><strong>Apellido:</strong> {user.lastname}</li>
            <li className="list-group-item"><strong>Rol:</strong> {user.rol}</li>
            <li className="list-group-item"><strong>Email:</strong> {user.email}</li>
            <li className="list-group-item"><strong>Teléfono:</strong> {user.phone}</li>
          </ul>
        ) : (
          <p>No se pudo cargar la información del usuario.</p>
        )}
        <button onClick={handleEditProfile} className="btn btn-success mt-3">Editar</button>
      </div>
    </div>
  );
}

export default UserProfile;
