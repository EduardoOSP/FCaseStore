import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";

// Controllers
import { productController } from "../controllers/productController.js";
import { bannerController } from "../controllers/bannerController.js";
import { uploadController } from "../controllers/uploadController.js";
import { authController } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

// Models (para a rota combinada e seed)
import ProductModel from "../models/product.js";
import BannerModel from "../models/banner.js";
import UserModel from "../models/user.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Config Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Conexão
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Conectado");
    } catch (error) {
        console.log("Erro MongoDB:", error);
    }
};
connectDB();

/* ================= ROTAS ================= */

// --- AUTENTICAÇÃO ---
app.post('/api/auth/login', authController.Login);

// --- UPLOAD (Protegido) ---
// Só quem tem token pode enviar arquivos
app.post('/api/upload', authMiddleware, upload.array('files', 10), uploadController.UploadImage);

// --- PRODUTOS ---
app.get('/api/products', productController.Read);          // Público (Loja vê)
app.get('/api/products/:id', productController.ReadOne);   // Público (Loja vê)
app.post('/api/products', authMiddleware, productController.Create);      // PRIVADO
app.put('/api/products/:id', authMiddleware, productController.Update);   // PRIVADO
app.delete('/api/products/:id', authMiddleware, productController.Delete);// PRIVADO

// --- BANNERS ---
app.get('/api/banners', bannerController.Read);            // Público
app.post('/api/banners', authMiddleware, bannerController.Create);        // PRIVADO
app.put('/api/banners/:id', authMiddleware, bannerController.Update);     // PRIVADO
app.delete('/api/banners/:id', authMiddleware, bannerController.Delete);  // PRIVADO

// --- DADOS COMBINADOS (Frontend Loja) ---
app.get('/api/all-data', async (req, res) => {
    try {
        const products = await ProductModel.find({ active: true });
        const banners = await BannerModel.find().sort({ order: 1 });
        res.json({ banners, products });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

/* --- ROTA DE SEED (Criação do Admin Inicial) --- */
// Use essa rota uma vez pelo ThunderClient para criar seu login
// POST http://localhost:3000/api/setup-admin
import bcrypt from "bcryptjs";
app.post('/api/setup-admin', async (req, res) => {
    try {
        const { username, password } = req.body;
        if(!username || !password) return res.status(400).json({msg: "Mande username e password"});
        
        // Verifica se já existe
        const exists = await UserModel.findOne({ username });
        if(exists) return res.status(400).json({msg: "Usuário já existe"});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new UserModel({ username, password: hashedPassword });
        await newUser.save();

        res.json({ msg: "Admin criado com sucesso!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// MUDANÇA PARA VERCEL:
// Só roda o servidor localmente se não estiver em produção
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`O servidor esta rodando na porta ${PORT}`);
    });
}

// Exporta o app para a Vercel tratar como Serverless Function
export default app;