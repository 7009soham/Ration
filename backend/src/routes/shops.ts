import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, authorizeRole, AuthRequest } from "../middleware/authGuard";

const router = Router();

// GET /api/shops → List all shops
router.get("/", async (req, res: Response) => {
  try {
    const [rows]: any = await pool.execute(
      `SELECT id, name, district, address, contact_email AS contactEmail,
              working_hours AS workingHours, created_at AS createdAt
       FROM shops
       ORDER BY name`
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /shops error:", err);
    return res.status(500).json({ error: "Failed to load shops" });
  }
});

// GET /api/shops/:id → Get single shop
router.get("/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.execute(
      `SELECT id, name, district, address, contact_email AS contactEmail,
              working_hours AS workingHours, created_at AS createdAt
       FROM shops WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Shop not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /shops/:id error:", err);
    return res.status(500).json({ error: "Failed to load shop" });
  }
});

// POST /api/shops → Create shop (admin only)
router.post("/", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id, name, district, address, contactEmail, workingHours } = req.body;

    if (!id || !name || !district || !address) {
      return res.status(400).json({ error: "id, name, district, address required" });
    }

    await pool.execute(
      `INSERT INTO shops (id, name, district, address, contact_email, working_hours)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, district, address, contactEmail || null, workingHours || null]
    );

    const [rows]: any = await pool.execute(
      `SELECT id, name, district, address, contact_email AS contactEmail,
              working_hours AS workingHours, created_at AS createdAt
       FROM shops WHERE id = ?`,
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error("POST /shops error:", err);
    return res.status(500).json({ error: "Failed to create shop" });
  }
});

// PATCH /api/shops/:id → Update shop (admin only)
router.patch("/:id", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, district, address, contactEmail, workingHours } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (district !== undefined) { updates.push("district = ?"); values.push(district); }
    if (address !== undefined) { updates.push("address = ?"); values.push(address); }
    if (contactEmail !== undefined) { updates.push("contact_email = ?"); values.push(contactEmail); }
    if (workingHours !== undefined) { updates.push("working_hours = ?"); values.push(workingHours); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = NOW()");
    values.push(id);

    await pool.execute(
      `UPDATE shops SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const [rows]: any = await pool.execute(
      `SELECT id, name, district, address, contact_email AS contactEmail,
              working_hours AS workingHours, updated_at AS updatedAt
       FROM shops WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Shop not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /shops/:id error:", err);
    return res.status(500).json({ error: "Failed to update shop" });
  }
});

// DELETE /api/shops/:id → Delete shop (admin only)
router.delete("/:id", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [result]: any = await pool.execute(`DELETE FROM shops WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Shop not found" });
    }

    return res.json({ success: true, message: "Shop deleted" });
  } catch (err) {
    console.error("DELETE /shops/:id error:", err);
    return res.status(500).json({ error: "Failed to delete shop" });
  }
});

export default router;
