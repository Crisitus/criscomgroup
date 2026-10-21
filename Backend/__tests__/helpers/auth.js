'use strict';
const jwt = require('jsonwebtoken');

/**
 * Genera un JWT firmado directamente sin llamar al endpoint de login.
 * Usa JWT_SECRET del entorno de test.
 */
const getAuthToken = (user) => {
  return jwt.sign(
    { id: user.id_user, id_role: user.id_role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

module.exports = { getAuthToken };
