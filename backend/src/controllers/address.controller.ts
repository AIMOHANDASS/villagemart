import { Request, Response } from "express";
import db from "../db";

// Endpoint A: Fetch all saved addresses for the logged-in customer
export const getUserAddresses = async (req: any, res: Response) => {
  const userId = req.user?.id;
  
  try {
    const [rows]: any = await db.promise().query(
      "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_selected DESC, id DESC",
      [userId]
    );

    // If they have addresses, return them immediately
    if (rows && rows.length > 0) {
      return res.status(200).json({ success: true, addresses: rows });
    }

    // Otherwise, check if they have a legacy address in the main users table
    const [userRows]: any = await db.promise().query("SELECT address, latitude, longitude FROM users WHERE id = ?", [userId]);
    const legacyUser = userRows?.[0];

    if (legacyUser && legacyUser.address && legacyUser.address.trim() !== "") {
      // Migrate legacy address into the new relational table as the default Home address
      const insertSql = `
        INSERT INTO user_addresses (user_id, address_label, full_address, latitude, longitude, is_selected)
        VALUES (?, 'Home', ?, ?, ?, 1)
      `;
      const [insertResult]: any = await db.promise().query(insertSql, [
        userId, 
        legacyUser.address, 
        legacyUser.latitude || null, 
        legacyUser.longitude || null
      ]);

      // Re-fetch the newly inserted address so it maps cleanly to the UI
      const [newRows]: any = await db.promise().query(
        "SELECT * FROM user_addresses WHERE id = ?",
        [insertResult.insertId]
      );
      
      return res.status(200).json({ success: true, addresses: newRows });
    }

    // If completely empty, just return an empty array
    return res.status(200).json({ success: true, addresses: [] });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Endpoint B: Update or edit an existing address directly from the UI
export const editUserAddress = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const addressId = req.params.id;
  const { address_label, full_address, landmark, latitude, longitude } = req.body;

  const updateSql = `
    UPDATE user_addresses 
    SET address_label = ?, full_address = ?, landmark = ?, latitude = ?, longitude = ?
    WHERE id = ? AND user_id = ?
  `;

  db.query(updateSql, [address_label, full_address, landmark, latitude, longitude, addressId, userId], (err, result: any) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    return res.status(200).json({ success: true, message: "📍 Address updated successfully!" });
  });
};

// Endpoint C: Switch the active/selected location flag on the navbar tray
export const selectActiveNavbarAddress = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { addressId } = req.body;

  try {
    // Transaction step 1: Set all addresses for this user to unselected
    await db.promise().query("UPDATE user_addresses SET is_selected = 0 WHERE user_id = ?", [userId]);
    
    // Transaction step 2: Mark the newly selected address as active
    await db.promise().query("UPDATE user_addresses SET is_selected = 1 WHERE id = ? AND user_id = ?", [addressId, userId]);

    return res.status(200).json({ success: true, message: "Active location updated on navbar!" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Endpoint D: Add a new address
export const addUserAddress = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { address_label, full_address, landmark, latitude, longitude } = req.body;

  try {
    // If it's the first address, we might want to make it active, but for now just insert
    const insertSql = `
      INSERT INTO user_addresses (user_id, address_label, full_address, landmark, latitude, longitude, is_selected)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `;

    const [result]: any = await db.promise().query(insertSql, [userId, address_label || "Home", full_address, landmark || null, latitude || null, longitude || null]);
    
    // Automatically make it active if it's the only one
    const [rows]: any = await db.promise().query("SELECT COUNT(*) as count FROM user_addresses WHERE user_id = ?", [userId]);
    if (rows[0].count === 1) {
      await db.promise().query("UPDATE user_addresses SET is_selected = 1 WHERE id = ?", [result.insertId]);
    }

    return res.status(201).json({ success: true, message: "📍 Address added successfully!", addressId: result.insertId });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
