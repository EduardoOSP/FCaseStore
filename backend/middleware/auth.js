import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    // 1. Tenta pegar o token do cabeçalho
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "Acesso negado. Faça login." });
    }

    try {
        // 2. Remove o prefixo "Bearer " se existir e verifica a assinatura
        const tokenClean = token.replace("Bearer ", "");
        const verified = jwt.verify(tokenClean, process.env.JWT_SECRET);
        req.user = verified; // Salva dados do user na requisição
        next(); // Deixa passar
    } catch (err) {
        res.status(400).json({ message: "Token inválido ou expirado." });
    }
};