import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, AuthRequest } from "../middleware/authGuard";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // FIX: Convert invalid values → null
    let raw = req.query.shopId;
    const shopId =
      raw && raw !== "null" && raw !== "undefined" ? String(raw) : null;

    if (!shopId) {
      return res.status(400).json({ error: "Valid shopId is required" });
    }

    const [rows]: any = await pool.execute(
      `SELECT item_code AS code, item_name AS name, item_name_hindi AS hindiName,
              quantity, unit, updated_at AS updatedAt
       FROM stock_items WHERE shop_id = ?`,
      [shopId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Stocks error:", err);
    res.status(500).json({ error: "Failed to load stocks" });
  }
});

export default router;
