import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

// Create a connection pool
// This allows the backend to handle multiple scans from ESP32 simultaneously
const pool = mysql.createPool({
  host: process.env.DB_HOST,      // Must use process.env.
  port: process.env.DB_PORT,      // Match your .env name
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('./ca.pem'),
    rejectUnauthorized: true 
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000
});

// Export the pool so app.js can use it
export default pool;