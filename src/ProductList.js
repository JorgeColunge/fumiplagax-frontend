import React, { useEffect, useState } from 'react';
import './ProductList.css';
import axios from 'axios';
import { Button, Card, Modal, Form } from 'react-bootstrap';
import { BsPencilSquare, BsTrash, BsEye, BsGrid, BsClockHistory, BsDropletHalf, BsBookHalf, BsBodyText, BsCalendar } from 'react-icons/bs';
import { saveProducts, getProducts } from './indexedDBHandler';
import 'bootstrap/dist/css/bootstrap.min.css';

/* ───────────────── RBAC ───────────────── */
const ALLOWED_ROLES = ["Supervisor Técnico", "Administrador", "Superadministrador"];
const userRole = (() => {
  try {
    return JSON.parse(localStorage.getItem("user_info"))?.rol ?? "";
  } catch { return ""; }
})();
const CAN_MANAGE = ALLOWED_ROLES.includes(userRole);
/* ──────────────────────────────────────── */

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description_type: '',
    dose: '',
    unity: '',
    residual_duration: '',
    batch: '',
    expiration_date: '',
    safety_data_sheet: '',
    technical_sheet: '',
    health_registration: '',
    emergency_card: '',
    health_record: '',
    active_ingredient: '',
    category: [],
    toxicological_category: '',
    target_species: '',
    antidote: ''
  });

  const categoryOptions = [
    "Desinsectación", "Desratización", "Desinfección", "Roceria",
    "Limpieza y aseo de archivos", "Lavado shut basura", "Encarpado",
    "Lavado de tanque", "Inspección", "Diagnostico"
  ];

  const [expandedCardId, setExpandedCardId] = useState(null);
  const toggleActions = (id) => setExpandedCardId(prevId => (prevId === id ? null : id));

  const [showCategoryOptions, setShowCategoryOptions] = useState(false); // (no usado, mantengo por compatibilidad)
  const [safetyDataSheetFile, setSafetyDataSheetFile] = useState(null);
  const [technicalSheetFile, setTechnicalSheetFile] = useState(null);
  const [healthRegistrationFile, setHealthRegistrationFile] = useState(null);
  const [emergencyCardFile, setEmergencyCardFile] = useState(null);
  const [pendingAlert, setPendingAlert] = useState(false);

  const matchesFilter = (p, q) => {
    if (!q?.trim()) return true;
    const s = q.toLowerCase();

    const inName = (p.name || '').toLowerCase().includes(s);

    const cats = Array.isArray(p.category)
      ? p.category
      : typeof p.category === 'string'
        ? p.category.split(',').map(c => c.trim())
        : [];

    const inCat = cats.some(c => (c || '').toLowerCase().includes(s));
    return inName || inCat;
  };

  const filteredProducts = products.filter((product) =>
    (product.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (product.category || []).some(cat => (cat || '').toLowerCase().includes(searchText.toLowerCase()))
  );

  const prefirmarArchivo = async (fileUrl) => {
    try {
      if (!fileUrl) return null;
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/PrefirmarArchivos`, { url: fileUrl });
      return response.data?.signedUrl ?? null;
    } catch (error) {
      console.error('Error al prefirmar archivo:', error.message, error.response?.data || error);
      alert('No se pudo generar la URL prefirmada. Por favor, verifica el archivo.');
      return null;
    }
  };

  const uploadFileToS3 = async (file, preSignedUrl) => {
    if (!file || !preSignedUrl) return false;
    try {
      const response = await axios.put(preSignedUrl, file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      return response.status === 200;
    } catch (error) {
      console.error(`Error al cargar el archivo ${file?.name} a S3:`, error.message, error.response?.data || error);
      return false;
    }
  };

  const verArchivoPrefirmado = async (fileUrl) => {
    try {
      const signedUrl = await prefirmarArchivo(fileUrl);
      if (signedUrl) window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error al abrir archivo prefirmado:', error.message);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (navigator.onLine) {
          const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/products`);
          const normalized = data.map(p => ({
            ...p,
            category: Array.isArray(p.category)
              ? p.category
              : typeof p.category === 'string'
                ? p.category.split(',').map(c => c.trim())
                : []
          }));
          setProducts(normalized);
          await saveProducts(normalized);
        } else {
          const offlineProducts = await getProducts();
          setProducts(offlineProducts);
        }
      } catch (err) {
        console.error('❌ Error fetchProducts:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleCategoryChange = (e) => {
    const { value, checked } = e.target;
    setNewProduct(prev => {
      const current = prev.category || [];
      const updated = checked ? [...current, value] : current.filter(cat => cat !== value);
      return { ...prev, category: updated };
    });
  };

  const handleShowModal = (product = null) => {
    /* ───── guard de permisos ───── */
    if (!CAN_MANAGE) {
      alert("No tienes permisos para crear o editar productos.");
      return;
    }
    /* ───────────────────────────── */
    if (product) {
      setEditingProduct(product);
      setNewProduct({
        name: product.name || '',
        description_type: product.description_type || '',
        dose: product.dose || '',
        unity: product.unity || '',
        residual_duration: product.residual_duration || '',
        batch: product.batch || '',
        expiration_date: product.expiration_date ? product.expiration_date.split('T')[0] : '',
        safety_data_sheet: product.safety_data_sheet || '',
        technical_sheet: product.technical_sheet || '',
        health_registration: product.health_registration || '',
        emergency_card: product.emergency_card || '',
        health_record: product.health_record || '',
        active_ingredient: product.active_ingredient || '',
        category: Array.isArray(product.category)
          ? product.category
          : typeof product.category === 'string'
            ? JSON.parse(product.category.replace(/\\/g, ''))
            : [],
        toxicological_category: product.toxicological_category || '',
        target_species: product.target_species || '',
        antidote: product.antidote || ''
      });
    } else {
      setEditingProduct(null);
      setNewProduct({
        name: '',
        description_type: '',
        dose: '',
        unity: '',
        residual_duration: '',
        batch: '',
        expiration_date: '',
        safety_data_sheet: '',
        technical_sheet: '',
        health_registration: '',
        emergency_card: '',
        health_record: '',
        active_ingredient: '',
        category: [],
        toxicological_category: '',
        target_species: '',
        antidote: ''
      });
    }
    setShowModal(true);
  };

  const handleShowDetailModal = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingProduct(null); };
  const handleCloseDetailModal = () => { setShowDetailModal(false); setSelectedProduct(null); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrEditProduct = async () => {
    /* ───── guard de permisos ───── */
    if (!CAN_MANAGE) {
      alert("No tienes permisos para realizar esta acción.");
      return;
    }
    /* ───────────────────────────── */

    if (!newProduct.name?.trim()) {
      alert('El campo "Nombre" es obligatorio.');
      return;
    }
    if (!newProduct.category?.length) {
      alert('Debes seleccionar al menos una categoría.');
      return;
    }

    if (!newProduct.toxicological_category?.trim()) {
      alert('El campo "Categoría toxicológica" es obligatorio.');
      return;
    }
    if (!newProduct.target_species?.trim()) {
      alert('El campo "Especie a controlar" es obligatorio.');
      return;
    }
    if (!newProduct.antidote?.trim()) {
      alert('El campo "Antídoto" es obligatorio.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('description_type', newProduct.description_type);
      formData.append('dose', newProduct.dose);
      formData.append('residual_duration', newProduct.residual_duration);
      formData.append('batch', newProduct.batch);
      formData.append('expiration_date', newProduct.expiration_date);
      formData.append('unity', newProduct.unity);
      formData.append('active_ingredient', newProduct.active_ingredient);
      formData.append('category', JSON.stringify(newProduct.category));
      formData.append('toxicological_category', newProduct.toxicological_category);
      formData.append('target_species', newProduct.target_species);
      formData.append('antidote', newProduct.antidote);

      if (safetyDataSheetFile) formData.append('safety_data_sheet', safetyDataSheetFile);
      if (technicalSheetFile) formData.append('technical_sheet', technicalSheetFile);
      if (healthRegistrationFile) formData.append('health_registration', healthRegistrationFile);
      if (emergencyCardFile) formData.append('emergency_card', emergencyCardFile);

      const response = editingProduct
        ? await axios.put(`${process.env.REACT_APP_API_URL}/api/products/${editingProduct.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await axios.post(`${process.env.REACT_APP_API_URL}/api/products`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (editingProduct) {
        setProducts(prev =>
          prev.map(product =>
            product.id === editingProduct.id
              ? {
                ...response.data.product,
                category: Array.isArray(response.data.product.category)
                  ? response.data.product.category
                  : typeof response.data.product.category === 'string'
                    ? JSON.parse(response.data.product.category)
                    : [],
                toxicological_category: response.data.product.toxicological_category || '',
                target_species: response.data.product.target_species || '',
                antidote: response.data.product.antidote || ''
              }
              : product
          )
        );
      } else {
        // Normaliza usando lo que TE devuelve tu backend
        const created = {
          ...response.data.product,
          category: Array.isArray(response.data.product.category)
            ? response.data.product.category
            : typeof response.data.product.category === 'string'
              ? JSON.parse(response.data.product.category)
              : [],
          dose: response.data.product.dose || 'No especificada',
          residual_duration: response.data.product.residual_duration || 'No especificada',
          toxicological_category: response.data.product.toxicological_category || '',
          target_species: response.data.product.target_species || '',
          antidote: response.data.product.antidote || ''
        };

        // Inserta ARRIBA para que sea visible inmediatamente
        setProducts(prev => [created, ...prev]);

        // Si el filtro actual lo ocultaría, lo limpiamos (solo entonces)
        if (!matchesFilter(created, searchText)) {
          setSearchText('');
        }
      }

      alert('Producto registrado correctamente.');
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert('Error al registrar el producto.');
    }
  };

  const deleteProduct = async (id) => {
    /* ───── guard de permisos ───── */
    if (!CAN_MANAGE) {
      alert("No tienes permisos para eliminar productos.");
      return;
    }
    /* ───────────────────────────── */
    if (!window.confirm("¿Estás seguro de que deseas eliminar este producto?")) return;

    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/api/products/${id}`);
      if (response.data.success) {
        setProducts(prev => prev.filter(product => product.id !== id));
        alert("Producto eliminado exitosamente.");
      } else {
        alert("No se pudo eliminar el producto.");
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert("Hubo un error al eliminar el producto.");
    }
  };

  if (loading) return <div>Cargando productos...</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Form.Group controlId="searchProducts" className="mb-0 flex-grow-1 me-3">
          <Form.Control
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Form.Group>

        {/* ───── Botón Crear condicionado por permisos ───── */}
        {CAN_MANAGE && (
          <Button variant="success" onClick={() => handleShowModal()}>
            Agregar Producto
          </Button>
        )}
      </div>

      {pendingAlert && (
        <div className="alert alert-info">El registro del producto estará listo en breve</div>
      )}

      <div className="row">
        {filteredProducts.map((product) => (
          <div key={product.id} className="col-sm-6 col-md-4 col-lg-3 mb-4">
            <Card
              className="border"
              style={{ cursor: "pointer", minHeight: "280px", height: "280px" }}
              onClick={() => handleShowDetailModal(product)}
            >
              <Card.Body>
                <div className="d-flex justify-content-center align-items-center mb-3">
                  <h5 className="fw-bold text-center">{product.name}</h5>
                </div>
                <hr />
                <div className="mt-2">
                  <BsGrid className="text-warning me-2" />
                  <span>
                    <strong>Categoría: </strong>
                    {Array.isArray(product.category) && product.category.length > 0
                      ? product.category.map((cat) => (cat || "").replace(/[\[\]"]/g, "")).join(", ")
                      : typeof product.category === "string"
                        ? product.category.replace(/[\[\]"]/g, "")
                        : "Sin categoría"}
                  </span>
                </div>
                <div className="mt-2">
                  <BsDropletHalf className="text-info me-2" />
                  <span><strong>Conc:</strong> {product.dose || "No especificada"}</span>
                </div>
                <div className="mt-2">
                  <BsClockHistory className="text-success me-2" />
                  <span><strong>Reingreso en horas:</strong> {product.residual_duration || "No especificada"}</span>
                </div>
              </Card.Body>

              {/* ───── Footer de Acciones solo si hay permisos ───── */}
              {CAN_MANAGE && (
                <Card.Footer
                  className="text-center position-relative"
                  style={{ background: "#f9f9f9", cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); toggleActions(product.id); }}
                >
                  <small className="text-success">
                    {expandedCardId === product.id ? "Cerrar Acciones" : "Acciones"}
                  </small>
                  {expandedCardId === product.id && (
                    <div className={`menu-actions ${expandedCardId === product.id ? "expand" : "collapse"}`}>
                      <button
                        className="btn d-block"
                        onClick={(e) => { e.stopPropagation(); handleShowModal(product); }}
                      >
                        <BsPencilSquare size={18} className="me-2" />
                        Editar
                      </button>
                      <button
                        className="btn d-block"
                        onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                      >
                        <BsTrash size={18} className="me-2" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </Card.Footer>
              )}
            </Card>
          </div>
        ))}
      </div>

      {/* Modal agregar/editar producto (solo se abre si CAN_MANAGE) */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingProduct ? "Editar Producto" : "Agregar Producto"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formName" className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" name="name" value={newProduct.name} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formDescriptionType" className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control type="text" name="description_type" value={newProduct.description_type} onChange={handleInputChange} />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Categoría</Form.Label>
              <div className="d-flex flex-wrap">
                {categoryOptions.map((option, index) => (
                  <div key={index} className="col-4 mb-2">
                    <Form.Check
                      type="checkbox"
                      label={<span style={{ fontSize: "0.8rem" }}>{option}</span>}
                      value={option}
                      checked={newProduct.category.includes(option)}
                      onChange={handleCategoryChange}
                    />
                  </div>
                ))}
              </div>
            </Form.Group>

            <Form.Group controlId="formActiveIngredient" className="mb-3">
              <Form.Label>Ingrediente Activo</Form.Label>
              <Form.Control type="text" name="active_ingredient" value={newProduct.active_ingredient} onChange={handleInputChange} />
            </Form.Group>

            <Form.Group controlId="formHealthRecord" className="mb-3">
              <Form.Label>Registro Sanitario</Form.Label>
              <Form.Control type="text" name="health_record" value={newProduct.health_record} onChange={handleInputChange} />
            </Form.Group>

            <Form.Group controlId="formDose" className="mb-3">
              <Form.Label>Concentración</Form.Label>
              <div className="d-flex">
                <Form.Control type="text" name="dose" value={newProduct.dose} onChange={handleInputChange} className="me-3" />
              </div>

              <Form.Group controlId="formUnity" className="mt-2">
                <Form.Label>Unidad del producto</Form.Label>
                <Form.Select name="unity" value={newProduct.unity} onChange={handleInputChange}>
                  <option value="">Seleccionar unidad</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="unidad">unidad</option>
                </Form.Select>
              </Form.Group>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tiempo de reingreso en horas</Form.Label>
              <Form.Control type="text" name="residual_duration" value={newProduct.residual_duration} onChange={handleInputChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lote</Form.Label>
              <Form.Control type="text" name="batch" value={newProduct.batch} onChange={handleInputChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fecha de Vencimiento</Form.Label>
              <Form.Control type="date" name="expiration_date" value={newProduct.expiration_date} onChange={handleInputChange} />
            </Form.Group>

            <Form.Group controlId="formToxicologicalCategory" className="mb-3">
              <Form.Label>Categoría toxicológica <span className="text-danger">*</span></Form.Label>
              <Form.Select
                name="toxicological_category"
                value={newProduct.toxicological_category}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccionar</option>
                <option value="I">I (Extremadamente peligroso)</option>
                <option value="II">II (Altamente peligroso)</option>
                <option value="III">III (Moderadamente peligroso)</option>
                <option value="IV">IV (Ligeramente peligroso)</option>
              </Form.Select>
            </Form.Group>
            <Form.Group controlId="formTargetSpecies" className="mb-3">
              <Form.Label>Especie a controlar <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="target_species"
                placeholder="Ej: cucarachas, roedores, mosquitos"
                value={newProduct.target_species}
                onChange={handleInputChange}
                required
              />
              <Form.Text className="text-muted">
                Puedes separar múltiples especies con comas.
              </Form.Text>
            </Form.Group>
            <Form.Group controlId="formAntidote" className="mb-3">
              <Form.Label>Antídoto <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="antidote"
                placeholder="Ej: Sulfato de atropina 1 mg/mL, etc."
                value={newProduct.antidote}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            {/* Archivos */}
            <Form.Group controlId="formSafetyDataSheet" className="mb-3 d-flex align-items-center flex-column">
              <div className="d-flex w-100 align-items-center">
                <Form.Label className="me-2">Hoja de Datos de Seguridad</Form.Label>
                <div className="ms-auto d-flex justify-content-end">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      setSafetyDataSheetFile(e.target.files[0]);
                      setNewProduct(prev => ({ ...prev, safety_data_sheet: e.target.files[0]?.name || '' }));
                    }}
                    style={{ display: 'none' }}
                    id="safetyDataSheetFileInput"
                  />
                  <Button variant="link" size="sm" onClick={() => document.getElementById('safetyDataSheetFileInput').click()}>
                    <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      if (newProduct.safety_data_sheet) window.open(newProduct.safety_data_sheet, '_blank');
                      else alert("No hay Hoja de Datos de Seguridad disponible.");
                    }}
                  >
                    <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSafetyDataSheetFile(null);
                      setNewProduct(prev => ({ ...prev, safety_data_sheet: '' }));
                      alert("Hoja de Datos de Seguridad eliminada.");
                    }}
                  >
                    <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
                  </Button>
                </div>
              </div>
              <small className="text-muted mt-1">
                {newProduct.safety_data_sheet || 'Sin archivo seleccionado'}
              </small>
            </Form.Group>

            <Form.Group controlId="formTechnicalSheet" className="mb-3 d-flex align-items-center flex-column">
              <div className="d-flex w-100 align-items-center">
                <Form.Label className="me-2">Ficha Técnica</Form.Label>
                <div className="ms-auto d-flex justify-content-end">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      setTechnicalSheetFile(e.target.files[0]);
                      setNewProduct(prev => ({ ...prev, technical_sheet: e.target.files[0]?.name || '' }));
                    }}
                    style={{ display: 'none' }}
                    id="technicalSheetFileInput"
                  />
                  <Button variant="link" size="sm" onClick={() => document.getElementById('technicalSheetFileInput').click()}>
                    <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
                  </Button>
                  <Button variant="link" size="sm" onClick={() => newProduct.technical_sheet && window.open(newProduct.technical_sheet, '_blank')}>
                    <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
                  </Button>
                  <Button variant="link" size="sm" onClick={() => { setTechnicalSheetFile(null); setNewProduct(prev => ({ ...prev, technical_sheet: '' })); }}>
                    <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
                  </Button>
                </div>
              </div>
              <small className="text-muted mt-1">{newProduct.technical_sheet || 'Sin archivo seleccionado'}</small>
            </Form.Group>

            <Form.Group controlId="formHealthRegistration" className="mb-3 d-flex align-items-center flex-column">
              <div className="d-flex w-100 align-items-center">
                <Form.Label className="me-2">Registro Sanitario</Form.Label>
                <div className="ms-auto d-flex justify-content-end">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      setHealthRegistrationFile(e.target.files[0]);
                      setNewProduct(prev => ({ ...prev, health_registration: e.target.files[0]?.name || '' }));
                    }}
                    style={{ display: 'none' }}
                    id="healthRegistrationFileInput"
                  />
                  <Button variant="link" size="sm" onClick={() => document.getElementById('healthRegistrationFileInput').click()}>
                    <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
                  </Button>
                  <Button variant="link" size="sm" onClick={() => newProduct.health_registration && window.open(newProduct.health_registration, '_blank')}>
                    <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
                  </Button>
                  <Button variant="link" size="sm" onClick={() => { setHealthRegistrationFile(null); setNewProduct(prev => ({ ...prev, health_registration: '' })); }}>
                    <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
                  </Button>
                </div>
              </div>
              <small className="text-muted mt-1">{newProduct.health_registration || 'Sin archivo seleccionado'}</small>
            </Form.Group>

            <Form.Group controlId="formEmergencyCard" className="mb-3 d-flex align-items-center flex-column">
              <div className="d-flex w-100 align-items-center">
                <Form.Label className="me-2">Tarjeta de Emergencia</Form.Label>
                <div className="ms-auto d-flex justify-content-end">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      setEmergencyCardFile(e.target.files[0]);
                      setNewProduct(prev => ({ ...prev, emergency_card: e.target.files[0]?.name || '' }));
                    }}
                    style={{ display: 'none' }}
                    id="emergencyCardFileInput"
                  />
                  <Button variant="link" size="sm" onClick={() => document.getElementById('emergencyCardFileInput').click()}>
                    <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
                  </Button>
                  <Button variant="link" size="sm" onClick={() => newProduct.emergency_card && window.open(newProduct.emergency_card, '_blank')}>
                    <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
                  </Button>
                  <Button variant="link" size="sm" onClick={() => { setEmergencyCardFile(null); setNewProduct(prev => ({ ...prev, emergency_card: '' })); }}>
                    <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
                  </Button>
                </div>
              </div>
              <small className="text-muted mt-1">{newProduct.emergency_card || 'Sin archivo seleccionado'}</small>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="success" onClick={() => setShowConfirmationModal(true)}>
            {editingProduct ? "Guardar Cambios" : "Registrar Producto"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Detalles (todos los roles pueden verlo) */}
      <Modal show={showDetailModal} onHide={handleCloseDetailModal}>
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <>
              <p><strong><i className="text-success"><BsBodyText className="text-center me-2" /></i>Nombre:</strong> {selectedProduct.name}</p>
              <p><strong><BsGrid className="text-warning me-2" />Categoría:</strong> {Array.isArray(selectedProduct.category) && selectedProduct.category.length > 0 ? selectedProduct.category.join(", ") : "Sin categoría"}</p>
              <p><strong><BsDropletHalf className="text-info me-2" />Concentración:</strong> {selectedProduct.dose}</p>
              <p><BsClockHistory className="me-2" /> <strong>Tiempo de reingreso:</strong> {selectedProduct.residual_duration}</p>
              <p><BsGrid className="me-2" /> <strong>Lote:</strong> {selectedProduct.batch || 'No especificado'}</p>
              <p><BsCalendar className="me-2" /> <strong>Fecha de Vencimiento:</strong> {selectedProduct.expiration_date || 'No especificada'}</p>
              <p><strong>Ingrediente Activo:</strong> {selectedProduct.active_ingredient || 'No especificado'}</p>
              <p><strong>Categoría toxicológica:</strong> {selectedProduct.toxicological_category || 'No especificada'}</p>
              <p><strong>Especie a controlar:</strong> {selectedProduct.target_species || 'No especificada'}</p>
              <p><strong>Antídoto:</strong> {selectedProduct.antidote || 'No especificado'}</p>

              <div className="d-flex justify-content-between align-items-center">
                <p><strong><BsBookHalf className="text-secondary me-2" />Hoja de Datos de Seguridad:</strong></p>
                {selectedProduct.safety_data_sheet && (
                  <Button variant="link" size="sm" onClick={() => verArchivoPrefirmado(selectedProduct.safety_data_sheet)}>
                    <BsEye style={{ color: "orange", fontSize: "1.2em" }} />
                  </Button>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <p><strong><BsBookHalf className="text-secondary me-2" />Ficha Técnica:</strong></p>
                {selectedProduct.technical_sheet && (
                  <Button variant="link" size="sm" onClick={() => verArchivoPrefirmado(selectedProduct.technical_sheet)}>
                    <BsEye style={{ color: "orange", fontSize: "1.2em" }} />
                  </Button>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <p><strong><BsBookHalf className="text-secondary me-2" />Registro Sanitario:</strong></p>
                {selectedProduct.health_registration && (
                  <Button variant="link" size="sm" onClick={() => verArchivoPrefirmado(selectedProduct.health_registration)}>
                    <BsEye style={{ color: "orange", fontSize: "1.2em" }} />
                  </Button>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <p><strong><BsBookHalf className="text-secondary me-2" />Tarjeta de Emergencia:</strong></p>
                {selectedProduct.emergency_card && (
                  <Button variant="link" size="sm" onClick={() => verArchivoPrefirmado(selectedProduct.emergency_card)}>
                    <BsEye style={{ color: "orange", fontSize: "1.2em" }} />
                  </Button>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDetailModal}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmación (solo se alcanza si CAN_MANAGE) */}
      <Modal show={showConfirmationModal} onHide={() => setShowConfirmationModal(false)}>
        <Modal.Header closeButton><Modal.Title>Confirmación</Modal.Title></Modal.Header>
        <Modal.Body>¿Estás seguro de que quieres registrar este producto?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmationModal(false)}>Cancelar</Button>
          <Button
            variant="success"
            onClick={() => {
              handleAddOrEditProduct();
              setShowConfirmationModal(false);
              handleCloseModal();
            }}
          >
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ProductList;
