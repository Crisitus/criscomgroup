// Inicialización idempotente del usuario maestro.
// La contraseña solo se recibe por variables de entorno y nunca se imprime.
require("dotenv").config();

const bcrypt = require("bcryptjs");
const { sequelize, connectDB } = require("../config/database");
const { User, Role, seedRoles } = require("../models");

const ADMIN_ROLE_NAME = "Gerente";
const SALT_ROUNDS = 10;

const seedMasterAdmin = async () => {
  const name = process.env.MASTER_ADMIN_NAME;
  const email = process.env.MASTER_ADMIN_EMAIL;
  const password = process.env.MASTER_ADMIN_PASSWORD;

  if (!name && !email && !password) {
    console.log("Usuario maestro no configurado; se omite su inicialización.");
    return null;
  }

  // En instalaciones ya inicializadas, el correo también se usa como lista
  // de acceso maestra sin exigir que la contraseña vuelva a guardarse en .env.
  if (email && !name && !password) {
    const existing = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!existing || existing.id_role !== 1) {
      throw new Error("La cuenta maestra configurada no existe o no tiene rol Gerente.");
    }
    return existing;
  }

  if (!name || !email || !password) {
    throw new Error(
      "MASTER_ADMIN_NAME, MASTER_ADMIN_EMAIL y MASTER_ADMIN_PASSWORD deben configurarse juntos."
    );
  }

  if (password.length < 12) {
    throw new Error("MASTER_ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  }

  if (typeof seedRoles === "function") await seedRoles();

  let role = await Role.findOne({ where: { name: ADMIN_ROLE_NAME } });
  if (!role) role = await Role.create({ id_role: 1, name: ADMIN_ROLE_NAME });

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const passwordMatches = await bcrypt.compare(password, existing.password);
    existing.name = name;
    existing.id_role = role.id_role;
    if (!passwordMatches) existing.password = await bcrypt.hash(password, SALT_ROUNDS);
    await existing.save();
    console.log("Usuario maestro actualizado correctamente.");
    return existing;
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, SALT_ROUNDS),
    id_role: role.id_role,
  });
  console.log(`Usuario maestro creado correctamente (rol: ${ADMIN_ROLE_NAME}).`);
  return user;
};

module.exports = { seedMasterAdmin };

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedMasterAdmin();
      process.exitCode = 0;
    } catch (error) {
      console.error("Error al crear el usuario maestro:", error.message);
      process.exitCode = 1;
    } finally {
      await sequelize.close().catch(() => {});
    }
  })();
}
