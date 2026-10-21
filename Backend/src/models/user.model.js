const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");

//Modelo usuario

const User = sequelize.define("User",{
    id_user:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement:true,
    },
    name:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:false,
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true,
    },
    password:{
        type: DataTypes.STRING,
        allowNull:false,
    },
    id_role:{
        type: DataTypes.INTEGER,
        allowNull:true,
        defaultValue:3,
        references:{
            model:'roles',
            key:'id_role'
        },
        onDelete:'CASCADE',

    },
    tipo_vendedor: {
        type: DataTypes.ENUM('fisico', 'virtual', 'afiliado'),
        allowNull: true,
    },
    telefono: {
        type: DataTypes.STRING(30),
        allowNull: true,
    },
    comision_servicio_porcentaje: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 8,
    },
    acceso_expira_en: { type: DataTypes.DATE, allowNull: true },
    acceso_otorgado_por: { type: DataTypes.INTEGER, allowNull: true },
    superusuario_temporal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    superusuario_expira_en: { type: DataTypes.DATE, allowNull: true },
    affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    password_changed_at: { type: DataTypes.DATE, allowNull: true },

});

module.exports = User;
