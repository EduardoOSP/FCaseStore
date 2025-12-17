/* controllers/bannerController.js */
import BannerModel from "../models/banner.js";

export const bannerController = {
    // Listar Banners (JÁ ORDENADOS)
    Read: async (req, res) => {
        try {
            // .sort({ order: 1 }) -> Ordena do menor para o maior (0, 1, 2...)
            const banners = await BannerModel.find().sort({ order: 1 });
            res.json(banners);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // Criar Banner
    Create: async (req, res) => {
        try {
            const newBanner = new BannerModel(req.body);
            await newBanner.save();
            res.status(201).json(newBanner);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    // NOVO: Atualizar Banner (Para editar link, imagem ou mudar a ORDEM)
    Update: async (req, res) => {
        try {
            const updatedBanner = await BannerModel.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true } // Retorna o banner atualizado
            );
            res.json(updatedBanner);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },
    
    // Deletar Banner
    Delete: async (req, res) => {
        try {
            await BannerModel.findByIdAndDelete(req.params.id);
            res.json({ message: "Banner deletado" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};