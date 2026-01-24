import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { createServer } from 'http'
import cookieParser from 'cookie-parser'
import path from 'path'
import jwt from 'jsonwebtoken'
import router from './routes/index'
import { initDatabase } from '@/configs/database.config'
import errorHandler from "@/middlewares/errorHandlermiddleware";


dotenv.config()
const app = express()
const server = createServer(app)

const clientBuildPath = path.resolve('/app/public');
app.use(express.static(clientBuildPath));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser()); 

app.use('/upload', express.static(path.join(__dirname, '../upload')));

app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

initDatabase().catch(err => {
    console.error("WRONG PASSWORD: Cannot connect to Database!");
    console.error(err);
    process.exit(1);
});

app.use("/api", router)


app.use(errorHandler.notFound)
app.use(errorHandler.errorHandler)

//for deploy client build
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 8000


server.listen(PORT, () => {
    console.log(`Server run at http://localhost:${PORT}`)
})