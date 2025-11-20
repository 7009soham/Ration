import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, AuthRequest } from "../middleware/authGuard";

const router = Router();

// -------------------------------------------------------------
// POST /api/tokens  → Create token for logged-in cardholder
// -------------------------------------------------------------
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const shopId = req.user?.shopId;

    if (!userId || !shopId) {
      return res.status(400).json({ error: "Missing userId or shopId" });
    }

    const today = new Date().toISOString().split("T")[0];
    const timeSlot = "10:00 AM";

    // Count existing bookings
    const [rows]: any = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM tokens
       WHERE shop_id = ? AND token_date = ?`,
      [shopId, today]
    );

    const position = rows[0]?.count + 1;

    const tokenId = `T${Date.now()}`;

    await pool.execute(
      `INSERT INTO tokens (id, shop_id, user_id, token_date, time_slot, queue_position, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [tokenId, shopId, userId, today, timeSlot, position]
    );

    return res.json({
      id: tokenId,
      timeslot: timeSlot,
      createdAt: new Date().toISOString(),
      position,
    });

  } catch (err) {
    console.error("POST /tokens error:", err);
    return res.status(500).json({ error: "Failed to create token" });
  }
});

// -------------------------------------------------------------
// GET /api/tokens/my → Get token of logged-in cardholder
// -------------------------------------------------------------
router.get("/my", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
  
  //Baaprw

    const today = new Date().toISOString().split("T")[0];

    const [rows]: any = await pool.execute(
      `SELECT id, time_slot AS timeslot, token_date AS date, queue_position AS position,
              created_at AS createdAt
       FROM tokens
       WHERE user_id = ? AND token_date = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, today]
    );

    if (!rows.length) {
      return res.json(null);
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("GET /tokens/my error:", err);
    return res.status(500).json({ error: "Failed to load token" });
  }
});

export default router;
