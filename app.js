import express from 'express';
import db from './db.js';
import dotenv from 'dotenv';
import keyRoutes from './Routes/keyRoutes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';


dotenv.config();

const app = express();
app.use(cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"], 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(cookieParser())
app.use('/api', keyRoutes);
app.get('/', (req, res) => {
    res.send('Welcome to digital lab assistant!')
});


app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DATABASE() as name');
        res.json({ message: "Connected to Database!", database: rows[0].name });
    } catch (err) {
        res.status(500).json({ error: "Database Connection Failed", details: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});