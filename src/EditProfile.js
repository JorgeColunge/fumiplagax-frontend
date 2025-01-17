import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function EditProfile() {
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [profilePic, setProfilePic] = useState('/images/default-profile.png');
  const [profileColor, setProfileColor] = useState('#ffffff');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${id}`);
        const userData = response.data;
        setName(userData.name);
        setLastname(userData.lastname);
        setEmail(userData.email);
        setPhone(userData.phone);
        if (userData.image) {
          setProfilePic(`${userData.image}`);
        }
        if (userData.color) {
          setProfileColor(userData.color);
        }
      } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        setModalTitle('Error');
        setModalContent('No se pudo cargar la información del usuario.');
        setShowModal(true);
      }
    };

    fetchUserInfo();
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result); // Previsualizar la nueva imagen seleccionada
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    console.log('Color enviado:', profileColor);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('lastname', lastname);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('userId', id);
    formData.append('color', profileColor);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/updateProfile`, formData);
      if (response.status === 200) {
        const updatedUserInfo = { ...JSON.parse(localStorage.getItem('user_info')), ...response.data };
        localStorage.setItem('user_info', JSON.stringify(updatedUserInfo));

        setModalTitle('Éxito');
        setModalContent('¡Perfil actualizado exitosamente!');
        setShowModal(true);

        setTimeout(() => {
          setShowModal(false);
          navigate(`/show-profile/${id}`);
        }, 2500);
      } else {
        setModalTitle('Error');
        setModalContent('Error al actualizar el perfil.');
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setModalTitle('Error');
      setModalContent('Error al actualizar el perfil.');
      setShowModal(true);
    }
  };

  return (
    <div className="container mt-3 mb-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <div className="position-relative">
              <div className="img-mask mx-auto">
                <img
                  src={profilePic}
                  alt="Profile"
                  className="rounded-img shadow-sm"
                  width="150"
                  height="150"
                  onClick={() => document.querySelector('#file-input').click()}
                  style={{ cursor: 'pointer' }}
                  title="Haz clic para cambiar la foto"
                />
              </div>
              <input
                id="file-input"
                type="file"
                className="d-none"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <form className="mt-4">
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
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    className="form-control"
                    style={{ width: '100%', height: '40px', padding: '0', border: 'none' }}
                    value={profileColor}
                    onChange={(e) => setProfileColor(e.target.value)}
                  />
                </div>
              </div>
              <br></br>
              <div className="text-center">
                <button type="button" onClick={handleSave} className="btn btn-success me-2">
                  Guardar cambios
                </button>
                <button type="button" onClick={() => navigate(`/users`)} className="btn btn-dark">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal para mostrar mensajes */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalContent}</Modal.Body>
        <br></br>
      </Modal>
    </div>
  );
}

export default EditProfile;
