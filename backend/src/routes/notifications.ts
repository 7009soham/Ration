import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, AuthRequest } from "../middleware/authGuard";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rawShopId = req.user?.shopId;

    // Normalize shopId (avoid "null" or "undefined" as strings)
    const shopId =
      rawShopId && rawShopId !== "null" && rawShopId !== "undefined"
        ? rawShopId
        : null;

    // Ensure limit is a clean number (default 20, max 100)
    let limit = parseInt(req.query.limit as string, 10);
    if (isNaN(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    console.log("DEBUG → shopId:", shopId, "limit:", limit);

    //-----------------------------------------------------
    // Build SQL dynamically
    //-----------------------------------------------------
    let sql = `
      SELECT id, shop_id AS shopId, user_id AS userId, type, message,
             is_sent AS isSent,
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
             DATE_FORMAT(acknowledged_at, '%Y-%m-%d %H:%i:%s') AS acknowledgedAt
      FROM notifications
    `;

    const params: any[] = [];

    // If user belongs to a shop → filter by shopId OR global notifications
    if (shopId) {
      sql += ` WHERE (shop_id = ? OR shop_id IS NULL) `;
      params.push(shopId);
    }
    // If user has no shop → only show global notifications
    else {
      sql += ` WHERE shop_id IS NULL `;
    }

    // MySQL does NOT accept LIMIT ? in prepared statements → embed directly
    sql += ` ORDER BY id DESC LIMIT ${limit}`;

    console.log("FINAL SQL:", sql);
    console.log("FINAL PARAMS:", params);

    //-----------------------------------------------------
    // Execute query
    //-----------------------------------------------------
    const [rows] = await pool.execute(sql, params);

    return res.json(rows);
  } catch (err) {
    console.error("GET /notifications error:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, userId, type, message } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: "type and message are required" });
    }

    // Insert into database
    const [result]: any = await pool.execute(
      `
      INSERT INTO notifications (shop_id, user_id, type, message)
      VALUES (?, ?, ?, ?)
      `,
      [
        shopId || null,    // admin may send shopId or leave it null (global notification)
        userId || null,
        type,
        message
      ]
    );

    return res.json({
      success: true,
      id: result.insertId,
      message: "Notification created"
    });

  } catch (err) {
    console.error("POST /notifications error:", err);
    return res.status(500).json({ error: "Failed to create notification" });
  }
});


export default router;
