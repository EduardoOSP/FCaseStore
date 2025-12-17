import axios from 'axios';
import FormData from 'form-data';

export const uploadController = {
    UploadImage: async (req, res) => {
        try {
            const files = req.files;
            if (!files || files.length === 0) return res.status(400).json({ message: "Nenhum arquivo enviado." });

            // MUDANÇA AQUI: Lê do arquivo .env
            const IMGBB_API_KEY = process.env.IMGBB_API_KEY; 

            if (!IMGBB_API_KEY) {
                throw new Error("API Key do ImgBB não configurada no .env");
            }

            const uploadPromises = files.map(file => {
                const imageBase64 = file.buffer.toString('base64');
                const formData = new FormData();
                formData.append('image', imageBase64);

                return axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
                    headers: formData.getHeaders()
                });
            });

            const responses = await Promise.all(uploadPromises);
            const urls = responses.map(r => r.data.data.url);

            res.json({ message: "Sucesso", urls: urls });

        } catch (error) {
            console.error("Erro upload:", error.message);
            res.status(500).json({ message: "Erro no upload", error: error.message });
        }
    }
};