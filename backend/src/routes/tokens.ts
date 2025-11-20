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

// -------------------------------------------------------------
// GET /api/tokens → Get all tokens (admin)
// -------------------------------------------------------------
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = (req.query.shopId as string) || req.user?.shopId || "SHOP001";

    const [rows]: any = await pool.execute(
      `SELECT t.id, t.time_slot AS timeslot, t.token_date AS date, 
              t.queue_position AS position, t.status, t.created_at AS createdAt,
              u.email, u.name
       FROM tokens t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.shop_id = ?
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [shopId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /tokens error:", err);
    return res.status(500).json({ error: "Failed to load tokens" });
  }
});

// -------------------------------------------------------------
// PATCH /api/tokens/:id → Update token status
// -------------------------------------------------------------
router.patch("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status required" });
    }

    await pool.execute(
      `UPDATE tokens SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    const [rows]: any = await pool.execute(
      `SELECT id, time_slot AS timeslot, token_date AS date, 
              queue_position AS position, status, created_at AS createdAt
       FROM tokens WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Token not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /tokens/:id error:", err);
    return res.status(500).json({ error: "Failed to update token" });
  }
});

export default router;
