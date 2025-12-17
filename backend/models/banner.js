import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema({
    image: { type: String, required: true },
    link: { type: String },
    order: { type: Number, default: 0 } // Para ordenação
}, {
    timestamps: true
});

const Banner = mongoose.model("Banner", BannerSchema);
export default Banner;