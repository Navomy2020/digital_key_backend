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
  "https://saintgits-lab-assistant.netlify.app",
  "https://saintgits-lab-tracker-api.onrender.com",
  "https://saintgits-ic-retrieval.netlify.app"
];

app.use(cors({
    origin: function (origin, callback) {
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
    console.log(`Server is running on https://saintgits-lab-tracker-api.onrender.com ${PORT}`);
});