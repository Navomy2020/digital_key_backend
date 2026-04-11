import db from '../db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


export const handleHardwareScan = async (req, res) => {
    const { rfid_tag, barcode_id, quantity,action } = req.body;
    console.log(barcode_id,quantity);
    

    try {
        const [registry] = await db.query(
            'SELECT type FROM tag_registry WHERE rfid_tag = ?', 
            [rfid_tag]
        );
        

        
        if (registry.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "RFID Tag not recognized in Registry" 
            });
        }

        const {type} = registry[0];
        

        
        if (type === 'key') {
            
            
            return await handleLabKey(barcode_id,rfid_tag, res);
        } 
        else if (type === 'ic') {
            
            return await handleIC(barcode_id, rfid_tag, quantity, action,res);
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
        
        
        const [userRows] = await db.query('SELECT barcode_id FROM users WHERE barcode_id = ?', [barcode_id]);
        if (userRows.length === 0) return res.status(404).json({ message: "Invalid Student ID" });

        const user = userRows[0];

        
        const [keyRows] = await db.query('SELECT rfid_tag, status FROM lab_keys WHERE rfid_tag = ?', [rfid_tag]);
        if (keyRows.length === 0) return res.status(404).json({ message: "Key not recognized" });

        const key = keyRows[0];

        
        if (key.status === 'available') {
            
            await db.query('INSERT INTO key_logs (user_id, lab_id, issue_time) VALUES (?, ?, NOW())', [user.barcode_id, key.rfid_tag]);
            await db.query("UPDATE lab_keys SET status = 'issued' WHERE rfid_tag = ?", [key.rfid_tag]);
            
            res.json({ success: true, action: "ISSUE", user: user.name });
        } else {
            
            await db.query('UPDATE key_logs SET return_time = NOW() WHERE lab_id = ? AND return_time IS NULL', [key.rfid_tag]);
            await db.query("UPDATE lab_keys SET status = 'available' WHERE rfid_tag = ?", [key.rfid_tag]);

            res.json({ success: true, action: "RETURN", user: user.name });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const handleIC = async (barcode_id, rfid_tag, quantity,action, res) => {
    try {
        
        const [userRows] = await db.query('SELECT barcode_id FROM users WHERE barcode_id = ?', [barcode_id]);
        const [icRows] = await db.query('SELECT rfid_tag, available_count FROM ic WHERE rfid_tag = ?', [rfid_tag]);

        if (userRows.length === 0) return res.status(404).json({ success: false, message: "Invalid Student ID" });
        if (icRows.length === 0) return res.status(404).json({ success: false, message: "IC not recognized" });

        const user = userRows[0];
        const ic = icRows[0];

        
        const [activeLog] = await db.query(
            "SELECT user_id, rfid_tag, qty_issued, qty_returned FROM ic_logs WHERE user_id=? AND rfid_tag=? AND status!='completed'",
            [user.barcode_id, ic.rfid_tag]
        );
        if(action == "return"){
        if (activeLog.length > 0) {
            
            const log = activeLog[0];
            
            if ((log.qty_issued - log.qty_returned) === quantity) {
            
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
                
                await db.query(
                    "UPDATE ic_logs SET status = 'partial',qty_returned=qty_returned+? WHERE user_id=? AND rfid_tag=? AND status!='completed'",
                    [quantity,barcode_id, rfid_tag]
                );
                
                await db.query(
                    'UPDATE ic SET issued_count = issued_count - ?, available_count = available_count + ? WHERE rfid_tag = ?',
                    [quantity, quantity, rfid_tag]
                );
                return res.json({ success: true, message: "Partial Return Processed." });
            } 
        }
        else{
            return res.json({message:"You did not take any ics"});
        } }
        else if(action=="issue"){
             if (ic.available_count < quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock. Only ${ic.available_count} available.` 
                });
            }
            if(activeLog.length>0){
                const log = activeLog[0];
                await db.query("UPDATE ic_logs SET qty_issued = qty_issued + ?, status = 'Open' WHERE user_id = ? and rfid_tag=? and status!='Completed'",
                    [quantity, log.user_id,log.rfid_tag]);
                    await db.query(
                'UPDATE ic SET issued_count = issued_count + ?, available_count = available_count - ? WHERE rfid_tag = ?',
                [quantity, quantity, rfid_tag]
            );
            return res.json({ success: true, message: `Successfully issued ${quantity} units.` });
            }
            else{
                
            await db.query(
                "INSERT INTO ic_logs (user_id, rfid_tag, qty_issued, qty_returned, status, issue_time) VALUES (?, ?, ?, 0, 'open', NOW())",
                [barcode_id, rfid_tag, quantity]
            );
            await db.query(
                'UPDATE ic SET issued_count = issued_count + ?, available_count = available_count - ? WHERE rfid_tag = ?',
                [quantity, quantity, rfid_tag]);
            

            return res.json({ success: true, message: `Successfully issued ${quantity} units.` });
            }
        }
    
        

            

            
            
        }
 catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const loginFaculty = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM faculty_login WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Faculty not found" });
    }

    const faculty = rows[0];
    const isMatch = await bcrypt.compare(password, faculty.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: faculty.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
export const getKeyLogs = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                u.name, 
                u.department, 
                COALESCE(u.semester, 'Faculty') AS semester, 
                -- Correct IST Conversion Syntax
                DATE_FORMAT(DATE_ADD(k.issue_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS issue_time,
                DATE_FORMAT(DATE_ADD(k.return_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS return_time, 
                l.lab_name 
            FROM key_logs k 
            JOIN users u ON k.user_id = u.barcode_id 
            JOIN lab_keys l ON k.lab_id = l.rfid_tag 
            -- Correct IST Filtering Syntax
            WHERE DATE(DATE_ADD(k.issue_time, INTERVAL '5:30' HOUR_MINUTE)) = DATE(DATE_ADD(NOW(), INTERVAL '5:30' HOUR_MINUTE))
            ORDER BY k.issue_time DESC;
        `);
        
        res.json(rows);
    } catch (error) {
        console.error("Database Fetch Error:", error);
        res.status(500).json({ error: error.message });
    }
};
export const getKeyLogsByDate = async (req, res) => {
    const { date } = req.query;

    try {
        // 1. BASE Query: Cleaned up and using correct 'HOUR_MINUTE' syntax
        let query = `
            SELECT 
                u.name, 
                u.department, 
                COALESCE(u.semester, 'Faculty') AS semester, 
                DATE_FORMAT(DATE_ADD(k.issue_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS issue_time,
                DATE_FORMAT(DATE_ADD(k.return_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS return_time, 
                l.lab_name 
            FROM key_logs k 
            JOIN users u ON k.user_id = u.barcode_id 
            JOIN lab_keys l ON k.lab_id = l.rfid_tag
        `;

        let params = [];

        // 2. IST-Aware Filtering
        if (date) {
            // Match the selected date against the IST-converted issue_time
            query += ` WHERE DATE(DATE_ADD(k.issue_time, INTERVAL '5:30' HOUR_MINUTE)) = ? `;
            params.push(date);
        } else {
            // Default to Today in IST
            query += ` WHERE DATE(DATE_ADD(k.issue_time, INTERVAL '5:30' HOUR_MINUTE)) = DATE(DATE_ADD(NOW(), INTERVAL '5:30' HOUR_MINUTE)) `;
        }

        // 3. Proper placement of ORDER BY
        query += ` ORDER BY k.issue_time DESC `;

        const [rows] = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error("Fetch by Date Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getIcLogs = async (req, res) => {
    try {
        const query = `
            SELECT 
    u.name, 
    u.department, 
    COALESCE(u.semester, 'Faculty') AS semester, 
    i.ic_name, 
    il.rfid_tag, 
    il.qty_issued, 
    il.qty_returned, 
    (il.qty_issued - il.qty_returned) AS balance_due, 
    -- Convert UTC to IST (+5:30)
DATE_FORMAT(DATE_ADD(il.issue_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS issue_time,
DATE_FORMAT(DATE_ADD(il.return_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS return_time 
, 
    il.status 
FROM ic_logs il 
JOIN users u ON il.user_id = u.barcode_id 
JOIN ic i ON il.rfid_tag = i.rfid_tag 
-- Match "Today" in Indian Time
WHERE DATE(DATE_ADD(il.issue_time, INTERVAL '5:30' HOUR_MINUTE)) = DATE(DATE_ADD(NOW(), INTERVAL '5:30' HOUR_MINUTE))
ORDER BY il.issue_time DESC;
        `;

        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error("IC Logs Fetch Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getIcLogsByDate = async (req, res) => {
    const { date } = req.query;

    try {
        // 1. Define the BASE query (No WHERE or ORDER BY yet)
        let query = `
            SELECT 
                u.name, 
                u.department, 
                COALESCE(u.semester, 'Faculty') AS semester, 
                i.ic_name, 
                il.rfid_tag, 
                il.qty_issued, 
                il.qty_returned, 
                (il.qty_issued - il.qty_returned) AS balance_due, 
                DATE_FORMAT(DATE_ADD(il.issue_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS issue_time, 
                DATE_FORMAT(DATE_ADD(il.return_time, INTERVAL '5:30' HOUR_MINUTE), '%d %b %Y, %h:%i %p') AS return_time, 
                il.status 
            FROM ic_logs il 
            JOIN users u ON il.user_id = u.barcode_id 
            JOIN ic i ON il.rfid_tag = i.rfid_tag
        `;

        let params = [];

        // 2. Append the WHERE clause with IST correction
        if (date) {
            // Filter by the date selected in frontend (adjusted to IST)
            query += ` WHERE DATE(DATE_ADD(il.issue_time, INTERVAL '5:30' HOUR_MINUTE)) = ? `;
            params.push(date);
        } else {
            // Default to Today's date in IST
            query += ` WHERE DATE(DATE_ADD(il.issue_time, INTERVAL '5:30' HOUR_MINUTE)) = DATE(DATE_ADD(NOW(), INTERVAL '5:30' HOUR_MINUTE)) `;
        }

        // 3. Finally, add the ORDER BY
        query += ` ORDER BY il.issue_time DESC `;

        const [rows] = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error("IC Date Fetch Error:", error);
        res.status(500).json({ success: false, error: error.message });
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

    
        if (rows.length === 0) {
            return res.json({ message: "All ICs have been returned! The lab is clear." });
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
