import express from 'express';
import db from './db.js';
import dotenv from 'dotenv';
import keyRoutes from './routes/keyRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', keyRoutes);
app.get('/', (req, res) => {
    res.send('Digital Lab Assistant Backend is Online!')
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