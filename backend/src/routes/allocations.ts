import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, authorizeRole, AuthRequest } from "../middleware/authGuard";

const router = Router();

// GET /api/allocations → Get monthly allocations for logged-in user
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const [rows]: any = await pool.execute(
      `SELECT id, item_code AS itemCode, eligible_quantity AS eligibleQuantity,
              collected_quantity AS collectedQuantity, month, year,
              created_at AS createdAt, updated_at AS updatedAt
       FROM monthly_allocations
       WHERE user_id = ? AND month = ? AND year = ?
       ORDER BY item_code`,
      [userId, month, year]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /allocations error:", err);
    return res.status(500).json({ error: "Failed to load allocations" });
  }
});

// POST /api/allocations → Create allocation (admin only)
router.post("/", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, itemCode, eligibleQuantity, month, year } = req.body;

    if (!userId || !itemCode || eligibleQuantity === undefined) {
      return res.status(400).json({ error: "userId, itemCode, eligibleQuantity required" });
    }

    const finalMonth = month || new Date().getMonth() + 1;
    const finalYear = year || new Date().getFullYear();

    const [result]: any = await pool.execute(
      `INSERT INTO monthly_allocations (user_id, item_code, eligible_quantity, month, year)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE eligible_quantity = VALUES(eligible_quantity)`,
      [userId, itemCode, Number(eligibleQuantity), finalMonth, finalYear]
    );

    const [rows]: any = await pool.execute(
      `SELECT id, item_code AS itemCode, eligible_quantity AS eligibleQuantity,
              collected_quantity AS collectedQuantity, month, year
       FROM monthly_allocations WHERE id = LAST_INSERT_ID()`,
      []
    );

    return res.json(rows[0] || { success: true, id: result.insertId });
  } catch (err) {
    console.error("POST /allocations error:", err);
    return res.status(500).json({ error: "Failed to create allocation" });
  }
});

// PATCH /api/allocations/:id → Update collected quantity (admin only)
router.patch("/:id", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { collectedQuantity } = req.body;

    if (collectedQuantity === undefined) {
      return res.status(400).json({ error: "collectedQuantity required" });
    }

    await pool.execute(
      `UPDATE monthly_allocations SET collected_quantity = ?, updated_at = NOW() WHERE id = ?`,
      [Number(collectedQuantity), id]
    );

    const [rows]: any = await pool.execute(
      `SELECT id, item_code AS itemCode, eligible_quantity AS eligibleQuantity,
              collected_quantity AS collectedQuantity, month, year
       FROM monthly_allocations WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Allocation not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /allocations/:id error:", err);
    return res.status(500).json({ error: "Failed to update allocation" });
  }
});

export default router;
