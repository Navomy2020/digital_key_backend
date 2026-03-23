import db from '../db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Define the function to handle the ID + Key scan
export const handleHardwareScan = async (req, res) => {
    // 1. Extract values from the request object (Thonny/MicroPython sends these)
    const { rfid_tag, barcode_id, quantity } = req.body;
    

    try {
        // 2. Query the tag_registry (type table) to see what this RFID is
        const [registry] = await db.query(
            'SELECT type FROM tag_registry WHERE rfid_tag = ?', 
            [rfid_tag]
        );
        

        // Check if the RFID even exists in our lab
        if (registry.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "RFID Tag not recognized in Registry" 
            });
        }

        const {type} = registry[0];
        console.log(registry[0]);

        // 3. Forwarding Logic (The Dispatcher)
        if (type === 'key') {
            
            // Forward to the Key Handler
            return await handleLabKey(barcode_id,rfid_tag, res);
        } 
        else if (type === 'ic') {
            // Forward to the IC Handler with the quantity
            return await handleIC(barcode_id, rfid_tag, quantity, res);
        } 
        else {
            return res.status(400).json({ 
                success: false, 
                message: "Unknown item type in registry" 
            });
        }

    } catch (error) {
        console.error("Hardware Scan Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
export const handleLabKey = async (barcode_id, rfid_tag, res) => {

    try {
        console.log("Reached in the handle lab key part");
        // 1. Verify Student
        const [userRows] = await db.query('SELECT barcode_id FROM users WHERE barcode_id = ?', [barcode_id]);
        if (userRows.length === 0) return res.status(404).json({ message: "Invalid Student ID" });

        const user = userRows[0];

        
        const [keyRows] = await db.query('SELECT rfid_tag, status FROM lab_keys WHERE rfid_tag = ?', [rfid_tag]);
        if (keyRows.length === 0) return res.status(404).json({ message: "Key not recognized" });

        const key = keyRows[0];

        // 3. Logic: Issue or Return?
        if (key.status === 'available') {
            // ISSUE PROCESS
            await db.query('INSERT INTO key_logs (user_id, lab_id, issue_time) VALUES (?, ?, NOW())', [user.barcode_id, key.rfid_tag]);
            await db.query("UPDATE lab_keys SET status = 'issued' WHERE rfid_tag = ?", [key.rfid_tag]);
            
            res.json({ success: true, action: "ISSUE", user: user.name });
        } else {
            // RETURN PROCESS
            // Update the log entry that is currently "open" (return_time is NULL)
            await db.query('UPDATE key_logs SET return_time = NOW() WHERE lab_id = ? AND return_time IS NULL', [key.rfid_tag]);
            await db.query("UPDATE lab_keys SET status = 'available' WHERE rfid_tag = ?", [key.rfid_tag]);

            res.json({ success: true, action: "RETURN", user: user.name });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const handleIC = async (barcode_id, rfid_tag, quantity, res) => {
    try {
        // 1. Verify Student and IC exists in inventory
        const [userRows] = await db.query('SELECT barcode_id FROM users WHERE barcode_id = ?', [barcode_id]);
        const [icRows] = await db.query('SELECT rfid_tag, available_count FROM ic WHERE rfid_tag = ?', [rfid_tag]);

        if (userRows.length === 0) return res.status(404).json({ success: false, message: "Invalid Student ID" });
        if (icRows.length === 0) return res.status(404).json({ success: false, message: "IC not recognized" });

        const user = userRows[0];
        const ic = icRows[0];

        // 2. Determine Action: Check for unreturned logs
        const [activeLog] = await db.query(
            "SELECT user_id, rfid_tag, qty_issued, qty_returned FROM ic_logs WHERE user_id=? AND rfid_tag=? AND status!='completed'",
            [user.barcode_id, ic.rfid_tag]
        );

        if (activeLog.length > 0) {
            /** --- RETURN LOGIC --- **/
            const log = activeLog[0];
            
            if ((log.qty_issued - log.qty_returned) === quantity) {
                // Full Return
                await db.query(
                    "UPDATE ic_logs SET return_time = NOW(), status = 'completed',qty_returned=qty_returned+? WHERE user_id=? AND rfid_tag=? AND status!='completed'",
                    [quantity,barcode_id, rfid_tag]
                );
                await db.query(
                    'UPDATE ic SET issued_count = issued_count - ?, available_count = available_count + ? WHERE rfid_tag = ?',
                    [quantity, quantity, rfid_tag]
                );
                return res.json({ success: true, message: "Full Return Processed." });
            } 
            else if((log.qty_issued-log.qty_returned)<quantity){
                return res.json({ success: false, message: `you took only ${log.qty_issued-log.qty_returned}` });
            }
            else {
                // Partial Return
                await db.query(
                    "UPDATE ic_logs SET status = 'partial',qty_returned=qty_returned+? WHERE user_id=? AND rfid_tag=? AND status!='completed'",
                    [quantity,barcode_id, rfid_tag]
                );
                // Note: You should also increment qty_returned here if you keep that column!
                await db.query(
                    'UPDATE ic SET issued_count = issued_count - ?, available_count = available_count + ? WHERE rfid_tag = ?',
                    [quantity, quantity, rfid_tag]
                );
                return res.json({ success: true, message: "Partial Return Processed." });
            } 
        } else {
            /** --- ISSUE LOGIC (The Lowest Else Block) --- **/
            // 1. Check if lab has enough stock
            if (ic.available_count < quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock. Only ${ic.available_count} available.` 
                });
            }

            // 2. Insert new row into ic_logs
            await db.query(
                "INSERT INTO ic_logs (user_id, rfid_tag, qty_issued, qty_returned, status, issue_time) VALUES (?, ?, ?, 0, 'open', NOW())",
                [barcode_id, rfid_tag, quantity]
            );

            // 3. Update the IC Inventory table
            await db.query(
                'UPDATE ic SET issued_count = issued_count + ?, available_count = available_count - ? WHERE rfid_tag = ?',
                [quantity, quantity, rfid_tag]
            );

            return res.json({ success: true, message: `Successfully issued ${quantity} units.` });
        }
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const loginFaculty = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Query the specific 'faculty_login' table
        const [rows] = await db.query('SELECT * FROM faculty_login WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Faculty not found" });
        }

        const faculty = rows[0];

        // 2. Compare the provided password with the 'password_hash' column
        // If you haven't hashed them yet, use: if (password !== faculty.password_hash)
        const isMatch = await bcrypt.compare(password, faculty.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 3. Generate Token
        const token = jwt.sign(
            { email: faculty.email, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 4. Set Cookie for Render (HTTPS compatible)
        res.cookie('faculty_session', token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'Lax', 
            maxAge: 24 * 60 * 60 * 1000 
        });

        res.json({ success: true, message: "Login successful" });

    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// You could also define a function here to get all logs for Meenakshi's dashboard
export const getKeyLogs = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT u.name, u.department, COALESCE(u.semester, "Faculty") AS semester, DATE_FORMAT(k.issue_time, "%d %b %Y, %h:%i %p") AS issue_time, l.lab_name FROM key_logs k JOIN users u ON k.user_id = u.barcode_id JOIN lab_keys l ON k.lab_id = l.rfid_tag ORDER BY k.issue_time DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const getIcLogs = async (req, res) => {
    try {
        const [rows] = await db.query('  SELECT u.name,u.department,COALESCE(u.semester, "Faculty"),i.ic_name,il.rfid_tag,il.qty_issued,il.qty_returned,(il.qty_issued - il.qty_returned) AS balance_due,DATE_FORMAT(il.issue_time, "%d %b %Y, %h:%i %p") AS issue_time,il.return_time,il.status FROM ic_logs il JOIN users u ON il.user_id = u.barcode_id JOIN ic i ON il.rfid_tag = i.rfid_tag ORDER BY il.issue_time DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const getPendingKeys = async(req,res)=>{
    try{
        const [rows]=await db.query('SELECT u.name, u.department, COALESCE(u.semester, "Faculty") AS semester, k.issue_time, l.lab_name FROM key_logs k JOIN users u ON k.user_id = u.barcode_id JOIN lab_keys l ON k.lab_id = l.rfid_tag WHERE k.return_time IS NULL ORDER BY k.issue_time DESC');
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
export const getPendingIC = async (req, res) => {
    try {
        // SQL Logic: Join users and ic tables to get a clear report
        const query = `
            SELECT 
                u.name,
                u.department,
                COALESCE(u.semester, "Faculty"),
                i.ic_name,
                il.rfid_tag,
                il.qty_issued,
                il.qty_returned,
                (il.qty_issued - il.qty_returned) AS balance_due,
                il.issue_time,
                il.status
            FROM ic_logs il
            JOIN users u ON il.user_id = u.barcode_id
            JOIN ic i ON il.rfid_tag = i.rfid_tag
            WHERE il.status != "completed"
            ORDER BY il.issue_time DESC
        `;

        const [rows] = await db.query(query);

        // If no pending items are found, return a friendly message
        if (rows.length === 0) {
            return res.json({ message: "All ICs have been returned! The lab is clear." });
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
