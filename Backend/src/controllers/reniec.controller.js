const axios = require('axios');

const getDniData = async (req, res) => {
    const { dni } = req.params;

    if(!/^\d{8}$/.test(dni)) {
        return res.status(400).json({ message: "DNI inválido" });
    }

    try{
        const token = process.env.RENIEC_API_KEY;
        const {data} = await axios.get(
            `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        )

        const { nombres, apellidos, fechaNacimiento } = data;

        return res.json({
            nombreCompleto : data.nombreCompleto
        });

    }catch (error) {
        console.error('Error obteniendo datos de RENIEC:', err.message);
        const status = err.response?.status || 500;
        return res.status(status).json({
          error: 'No se pudo obtener información para ese DNI'
        });
    }
}

module.exports = {
    getDniData,
};