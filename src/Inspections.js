import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Inspections = () => {
  const [inspections, setInspections] = useState([]);
  const [form, setForm] = useState({ date: '', time: '', duration: '', observations: '', service_id: '', exit_time: '' });
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
        const response = await axios.post('http://localhost:10000/api/inspections', form);
      setInspections(response.data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Verificación de datos antes de enviar
    console.log("Datos enviados:", form); // Muestra los datos en la consola
  
    // Validación en el frontend
    if (!form.date || !form.time) {
      alert("La fecha y la hora son campos obligatorios.");
      return;
    }
  
    try {
      if (editing) {
        await axios.put(`/api/inspections/${selectedId}`, form);
      } else {
        const response = await axios.post('http://localhost:10000/api/inspections', form);
        setInspections([...inspections, response.data.inspection]);
      }
  
      setForm({ date: '', time: '', duration: '', observations: '', service_id: '', exit_time: '' });
      setEditing(false);
      fetchInspections();
    } catch (error) {
      console.error('Error saving inspection:', error);
    }
  };  
  

  const handleEdit = (inspection) => {
    setForm(inspection);
    setEditing(true);
    setSelectedId(inspection.id);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/inspections/${id}`);
      fetchInspections();
    } catch (error) {
      console.error('Error deleting inspection:', error);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">{editing ? 'Editar Inspección' : 'Agregar Inspección'}</h2>
      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-2">
          <label htmlFor="date" className="form-label">Fecha</label>
          <input name="date" type="date" className="form-control" value={form.date} onChange={handleChange} required />
        </div>
        <div className="col-md-2">
          <label htmlFor="time" className="form-label">Hora</label>
          <input name="time" type="time" className="form-control" value={form.time} onChange={handleChange} required />
        </div>
        <div className="col-md-2">
          <label htmlFor="duration" className="form-label">Duración</label>
          <input name="duration" type="text" className="form-control" value={form.duration} onChange={handleChange} placeholder="Ej: 3 horas" />
        </div>
        <div className="col-md-3">
          <label htmlFor="observations" className="form-label">Observaciones</label>
          <textarea name="observations" className="form-control" value={form.observations} onChange={handleChange} placeholder="Observaciones" />
        </div>
        <div className="col-md-1">
          <label htmlFor="service_id" className="form-label">ID Servicio</label>
          <input name="service_id" type="number" className="form-control" value={form.service_id} onChange={handleChange} placeholder="ID" />
        </div>
        <div className="col-md-2">
          <label htmlFor="exit_time" className="form-label">Hora de Salida</label>
          <input name="exit_time" type="time" className="form-control" value={form.exit_time} onChange={handleChange} />
        </div>
        <div className="col-12 text-center">
          <button type="submit" className="btn btn-primary">{editing ? 'Actualizar Inspección' : 'Agregar Inspección'}</button>
        </div>
      </form>

      <h3 className="text-center mt-5">Lista de Inspecciones</h3>
      <ul className="list-group mt-3">
        {inspections.map((inspection) => (
          <li key={inspection.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{inspection.date} - {inspection.time}</span>
            <div>
              <button className="btn btn-secondary btn-sm me-2" onClick={() => handleEdit(inspection)}>Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inspection.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Inspections;
