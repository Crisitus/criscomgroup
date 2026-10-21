// Middleware para verificar que el usuario sea gerente (rol 1) o administrador (rol 2).
// El rol se relee de la BD (no se confia en el del JWT) y se respeta baja logica y version de sesion.
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
require("dotenv").config();

const requireAdminAccess = async (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({
            success: false,
            msg: "Acceso denegado. Token no encontrado"
        });
    }

    let decoded;
    try {
        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
        decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ success: false, msg: "Token no válido" });
    }

    try {
        const current = await User.findByPk(decoded.id, { attributes: ['id_user', 'email', 'id_role', 'activo', 'token_version'] });
        if (!current) return res.status(401).json({ success: false, msg: "La cuenta ya no existe" });
        if (current.activo === false) return res.status(403).json({ success: false, msg: "La cuenta está desactivada" });
        if (Number(decoded.tv || 0) !== Number(current.token_version || 0)) {
            return res.status(401).json({ success: false, msg: "La sesión ya no es válida" });
        }
        if (current.id_role !== 1 && current.id_role !== 2) {
            return res.status(403).json({
                success: false,
                msg: "Acceso denegado. Solo gerentes y administradores tienen acceso a este recurso"
            });
        }
        req.user = { ...decoded, id: current.id_user, id_user: current.id_user, id_role: current.id_role, email: current.email };
        return next();
    } catch (error) {
        console.error("Error en requireAdminAccess:", error);
        return res.status(500).json({ success: false, msg: "No se pudo verificar el acceso" });
    }
};

module.exports = {
    requireAdminAccess
};
