import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import Camiseta from "./models/camiseta.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ----------- UPLOADS ----------
const UPLOADS_DIR = "./uploads";
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// ----------- DATABASE ----------
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/camisetas";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB conectado"))
.catch(err => {
  console.error("Error conectando MongoDB:", err);
  process.exit(1);
});

// ----------- ENDPOINTS ----------

// PAGINADO OPCIONAL
app.get("/camisetas", async (req, res) => {
  try {
        let { page, per_page } = req.query;

        // Si NO vienen parámetros → retornar todo el dataset
        if (!page || !per_page) {
            const camisetas = await Camiseta.find();
            return res.json({
                total: camisetas.length,
                paginado: false,
                data: camisetas
            });
        }

        // Si vienen parámetros → convertirlos a número
        page = parseInt(page);
        per_page = parseInt(per_page);

        const skip = (page - 1) * per_page;

        const total = await Camiseta.countDocuments();
        const camisetas = await Camiseta
            .find()
            .skip(skip)
            .limit(per_page);

        res.json({
            total,
            paginado: true,
            page,
            per_page,
            total_pages: Math.ceil(total / per_page),
            data: camisetas
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// GET ONE
app.get("/camisetas/:id", async (req, res) => {
  try {
    const item = await Camiseta.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  } catch {
    res.status(400).json({ error: "ID inválido" });
  }
});

// CREATE
app.post("/camisetas", upload.single("foto"), async (req, res) => {
  try {
    const { marca, talle, precio } = req.body;

    let fotoUrl = "";
    if (req.file) {
      fotoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    const nueva = new Camiseta({
      marca,
      talle,
      precio: Number(precio),
      foto: fotoUrl
    });

    await nueva.save();
    res.status(201).json(nueva);

  } catch (err) {
    res.status(400).json({ error: "Error al crear camiseta" });
  }
});

// UPDATE
app.put("/camisetas/:id", upload.single("foto"), async (req, res) => {
  try {
    const item = await Camiseta.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "No encontrado" });

    const { marca, talle, precio } = req.body;

    if (req.file) {
      // Borrar foto previa (local)
      if (item.foto && item.foto.includes("/uploads/")) {
        const prevName = item.foto.split("/uploads/").pop();
        const prevPath = path.join(UPLOADS_DIR, prevName);
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      }
      item.foto = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    if (marca) item.marca = marca;
    if (talle) item.talle = talle;
    if (precio) item.precio = Number(precio);

    await item.save();
    res.json(item);

  } catch (err) {
    res.status(400).json({ error: "Error al actualizar camiseta" });
  }
});

// DELETE
app.delete("/camisetas/:id", async (req, res) => {
  try {
    const item = await Camiseta.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "No encontrado" });

    if (item.foto && item.foto.includes("/uploads/")) {
      const name = item.foto.split("/uploads/").pop();
      const p = path.join(UPLOADS_DIR, name);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    await Camiseta.deleteOne({ _id: req.params.id });
    res.status(204).send();

  } catch {
    res.status(400).json({ error: "ID inválido" });
  }
});

app.get("/", (_, res) => res.send("Camisetas API funcionando"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
