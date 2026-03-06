import db from '../db.js';

// Define the function to handle the ID + Key scan
export const handleScan = async (req, res) => {
    const { barcode_id, rfid_tag } = req.body;

    try {
        // 1. Verify Student
        const [userRows] = await db.query('SELECT id, full_name FROM users WHERE barcode_id = ?', [barcode_id]);
        if (userRows.length === 0) return res.status(404).json({ message: "Invalid Student ID" });

        const user = userRows[0];

        // 2. Verify Key & Check Status
        const [keyRows] = await db.query('SELECT key_id, status FROM lab_keys WHERE rfid_tag = ?', [rfid_tag]);
        if (keyRows.length === 0) return res.status(404).json({ message: "Key not recognized" });

        const key = keyRows[0];

        // 3. Logic: Issue or Return?
        if (key.status === 'available') {
            // ISSUE PROCESS
            await db.query('INSERT INTO key_logs (user_id, key_id, issue_time) VALUES (?, ?, NOW())', [user.id, key.key_id]);
            await db.query('UPDATE lab_keys SET status = "issued" WHERE key_id = ?', [key.key_id]);
            
            res.json({ success: true, action: "ISSUE", user: user.full_name });
        } else {
            // RETURN PROCESS
            // Update the log entry that is currently "open" (return_time is NULL)
            await db.query('UPDATE key_logs SET return_time = NOW() WHERE key_id = ? AND return_time IS NULL', [key.key_id]);
            await db.query('UPDATE lab_keys SET status = "available" WHERE key_id = ?', [key.key_id]);

            res.json({ success: true, action: "RETURN", user: user.full_name });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const loginFaculty = async (req, res) => {
    // We use email as the primary identifier since you set it as the Primary Key
    const { email, password } = req.body;

    try {
        // 1. Fetch the faculty record from the Aiven database using the email
        const [rows] = await db.query('SELECT * FROM faculty_accounts WHERE email = ?', [email]);
        
        // 2. Check if the user exists
        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid Email or Password" 
            });
        }

        const faculty = rows[0];

        // 3. Use bcrypt to compare the plain-text password with the stored hash
        const isMatch = await bcrypt.compare(password, faculty.password_hash);

        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid Email or Password" 
            });
        }

        // 4. If authorized, return success and the faculty's username for the dashboard
        res.json({ 
            success: true, 
            message: "Authentication successful"
        });

    } catch (error) {
        // Handle any database or server connection issues
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// You could also define a function here to get all logs for Meenakshi's dashboard
export const getLogs = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM key_logs ORDER BY issue_time DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};