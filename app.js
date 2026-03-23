import express from 'express';
import db from './db.js';
import dotenv from 'dotenv';
import keyRoutes from './Routes/keyRoutes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';


dotenv.config();

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = [
  "https://cheerful-crepe-d8c462.netlify.app",
  "https://saintgits-lab-tracker-api.onrender.com",
  "http://localhost:3000", // dev
];

app.use(cors({
    origin: "https://cheerful-crepe-d8c462.netlify.app", // NO trailing slash
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Explicitly allow OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"]     // Explicitly allow Authorization
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