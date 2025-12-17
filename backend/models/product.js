import mongoose from "mongoose";

const ColorOptionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hex: { type: String, required: true },
    cardImage: { type: String }
});

const VariantSchema = new mongoose.Schema({
    id: { type: String }, 
    sku: { type: String },
    model: { type: String },
    color: { type: String },
    price: { type: Number },
    stock: { type: Number, default: 0 },
    gallery: [{ type: String }]
});

const ProductSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    active: { type: Boolean, default: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true, index: true },
    description: { type: String },
    basePrice: { type: Number, required: true },
    promotionalPrice: { type: Number },
    
    flags: {
        isFeatured: { type: Boolean, default: false },
        isBestSeller: { type: Boolean, default: false },
        isNew: { type: Boolean, default: false }
    },

    tags: [{ type: String }],
    images: [{ type: String }],

    optionsSummary: {
        hasModelSelection: { type: Boolean, default: false },
        hasColorSelection: { type: Boolean, default: false },
        models: [{ type: String }],
        colors: [ColorOptionSchema]
    },

    variants: [VariantSchema]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Product = mongoose.model("Product", ProductSchema);
export default Product;