const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
      const user = req.user; // Asegúrate de que `req.user` contenga el rol del usuario (puedes extraerlo desde el token o la sesión).
      if (!user || !allowedRoles.includes(user.rol)) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para acceder a esta ruta.' });
      }
      next();
    };
  };
  
  module.exports = roleCheck;  