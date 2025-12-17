import UserModel from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authController = {
    Login: async (req, res) => {
        try {
            const { username, password } = req.body;

            // 1. Busca usuário
            const user = await UserModel.findOne({ username });
            if (!user) return res.status(400).json({ message: "Credenciais inválidas." });

            // 2. Compara senha (texto puro vs hash no banco)
            const validPass = await bcrypt.compare(password, user.password);
            if (!validPass) return res.status(400).json({ message: "Credenciais inválidas." });

            // 3. Gera Token (Crachá) - Vale por 24 horas
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

            res.json({ token: token });

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};