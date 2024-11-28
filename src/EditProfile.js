import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

function EditProfile() {
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [profilePic, setProfilePic] = useState('/images/default-profile.png');
  const [profileColor, setProfileColor] = useState('#ffffff'); // Agregar el estado del color

  const { id } = useParams(); // Agregar esta línea
  const navigate = useNavigate(); // Agregar esta línea


  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/users/${id}`);
        const userData = response.data;
        setName(userData.name);
        setLastname(userData.lastname);
        setEmail(userData.email);
        setPhone(userData.phone);
        if (userData.image) {
          setProfilePic(`http://localhost:10000${userData.image}`);
        }
        if (userData.color) {
          setProfileColor(userData.color); // Cargar el color desde el backend
        }
      } catch (error) {
        console.error("Error al obtener información del usuario:", error);
        alert("No se pudo cargar la información del usuario.");
      }
    };    
    fetchUserInfo();
  }, [id]);

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('lastname', lastname);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('userId', id);
    formData.append('color', profileColor); // Incluir el color
    if (selectedFile) {
      formData.append('image', selectedFile);
    }
  
    try {
      const response = await axios.post('http://localhost:10000/api/updateProfile', formData);
      if (response.status === 200) {
        alert("Perfil actualizado exitosamente!");
        navigate(`/show-profile/${id}`);
      } else {
        alert("Error al actualizar el perfil");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error al actualizar el perfil");
    }
  };  

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Editar Perfil</h2>
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <div className="mb-3 text-center">
              <img
                src={profilePic}
                alt="Profile"
                className="rounded-circle"
                width="100"
                height="100"
              />
            </div>
            <form>
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Apellido</label>
                <input
                  type="text"
                  className="form-control"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Foto de perfil</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                />
              </div>
              <div className="mb-3">
  <label className="form-label">Color</label>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <input
      type="color"
      className="form-control"
      style={{ width: '50px', height: '50px', padding: '0', border: 'none' }}
      value={profileColor}
      onChange={(e) => setProfileColor(e.target.value)}
    />
    <span style={{
      display: 'block',
      width: '50px',
      height: '50px',
      backgroundColor: profileColor,
      border: '1px solid #ccc',
      borderRadius: '5px',
    }}></span>
  </div>
  <small className="text-muted">Color seleccionado: {profileColor}</small>
</div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn btn-success me-2"
                >
                  Guardar cambios
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/show-profile/${id}`)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;