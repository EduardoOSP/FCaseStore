import ProductModel from "../models/product.js";

export const productController = {
    Create: async (req, res) => {
        try {
            const newProduct = new ProductModel(req.body);
            await newProduct.save();
            res.status(201).json(newProduct);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    Read: async (req, res) => {
        try {
            const products = await ProductModel.find({ active: true });
            res.json({ products: products }); // Mantém estrutura { products: [] }
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    ReadOne: async (req, res) => {
        try {
            // Tenta buscar pelo ID do Mongo OU pelo ID customizado (p001)
            const { id } = req.params;
            let product;
            
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                // Se parece ID do mongo
                product = await ProductModel.findById(id);
            } else {
                // Se parece ID customizado
                product = await ProductModel.findOne({ id: id });
            }

            if (!product) return res.status(404).json({ message: "Produto não encontrado" });
            res.json(product);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    Update: async (req, res) => {
        try {
            // Atualiza buscando por ID customizado ou Mongo
            const filter = req.params.id.match(/^[0-9a-fA-F]{24}$/) 
                ? { _id: req.params.id } 
                : { id: req.params.id };

            const updatedProduct = await ProductModel.findOneAndUpdate(
                filter,
                req.body,
                { new: true }
            );
            res.json(updatedProduct);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    Delete: async (req, res) => {
        try {
            const filter = req.params.id.match(/^[0-9a-fA-F]{24}$/) 
                ? { _id: req.params.id } 
                : { id: req.params.id };

            await ProductModel.findOneAndDelete(filter);
            res.json({ message: "Produto deletado" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};