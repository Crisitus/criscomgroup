const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BlogPost = sequelize.define('BlogPost', {
  id_post: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  resumen: { type: DataTypes.STRING(320), allowNull: false },
  contenido: { type: DataTypes.TEXT('long'), allowNull: false },
  imagen_url: { type: DataTypes.STRING(500), allowNull: true },
  categoria: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'Tecnología' },
  palabras_clave: { type: DataTypes.TEXT, allowNull: true },
  estado: { type: DataTypes.ENUM('borrador', 'publicado'), allowNull: false, defaultValue: 'borrador' },
  autor_id: { type: DataTypes.INTEGER, allowNull: true },
  publicado_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'blog_posts',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = BlogPost;
