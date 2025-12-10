import mongoose from "mongoose";

const CamisetaSchema = new mongoose.Schema({
  marca: { type: String, required: true },
  talle: { type: String, required: true },
  precio: { type: Number, required: true },
  foto: { type: String, default: "" }
}, { timestamps: false });

export default mongoose.model("Camiseta", CamisetaSchema);