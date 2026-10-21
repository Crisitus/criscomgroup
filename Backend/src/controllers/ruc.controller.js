const axios = require('axios');

const getRucData = async (req, res) => {
    const { ruc } = req.params;

    if(!/^\d{11}$/.test(ruc)) {
        return res.status(400).json({ message: "RUC inválido" });
    }

    try{
        const token = process.env.RENIEC_API_KEY;
        const {data} = await axios.get(
            `https://api.apis.net.pe/v2/sunat/ruc/full?numero=${ruc}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        )

        const { razonSocial, direccion, distrito, provincia, departamento } = data;
        const direccionCompleta = `${direccion.trim()} ${distrito} - ${provincia} - ${departamento}`;

        return res.json({
            nombre: razonSocial,
            direccion: direccionCompleta,

        });

    }catch (error) {
        console.error("Error al obtener datos del RUC:", error.message);
        return res.status(500).json({ message: "Error al obtener datos del RUC" });
    }
}

module.exports = {
    getRucData,
};