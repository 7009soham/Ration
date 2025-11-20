import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, AuthRequest, authorizeRole } from "../middleware/authGuard";

const router = Router();

// GET /api/users - Get all users (admin only)
// Query params: ?role=shopkeeper&shopId=SHOP001&flagged=true
router.get("/", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { role, shopId, flagged } = req.query;

    let sql = `
      SELECT 
        u.id, u.email, u.role, u.name, u.gender, u.mobile_number, u.address,
        u.ration_card_number, u.card_type, u.card_color, u.family_size,
        u.socio_economic_category, u.occupation, u.annual_income,
        u.shop_id AS shopId, s.name AS shopName,
        u.is_active AS isActive,
        u.is_flagged AS isFlagged, u.flag_reason AS flagReason,
        u.flagged_by AS flaggedBy, 
        DATE_FORMAT(u.flagged_at, '%Y-%m-%d %H:%i:%s') AS flaggedAt,
        DATE_FORMAT(u.last_login, '%Y-%m-%d %H:%i:%s') AS lastLogin,
        DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM users u
      LEFT JOIN shops s ON u.shop_id = s.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by role
    if (role && role !== 'all') {
      sql += ` AND u.role = ?`;
      params.push(role);
    }

    // Filter by shop
    if (shopId && shopId !== 'all') {
      sql += ` AND u.shop_id = ?`;
      params.push(shopId);
    }

    // Filter flagged users
    if (flagged === 'true') {
      sql += ` AND u.is_flagged = TRUE`;
    }

    sql += ` ORDER BY 
      CASE u.role 
        WHEN 'admin' THEN 1 
        WHEN 'shopkeeper' THEN 2 
        WHEN 'cardholder' THEN 3 
      END,
      u.is_flagged DESC,
      u.shop_id,
      u.name`;

    const [rows] = await pool.execute(sql, params);

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// GET /api/users/stats - Get user statistics by shop (admin only)
router.get("/stats", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const [stats]: any = await pool.execute(`
      SELECT 
        u.shop_id AS shopId,
        s.name AS shopName,
        COUNT(CASE WHEN u.role = 'shopkeeper' THEN 1 END) AS shopkeepers,
        COUNT(CASE WHEN u.role = 'cardholder' THEN 1 END) AS cardholders,
        COUNT(CASE WHEN u.is_flagged = TRUE THEN 1 END) AS flaggedUsers,
        COUNT(CASE WHEN u.role = 'shopkeeper' AND u.is_flagged = TRUE THEN 1 END) AS flaggedShopkeepers
      FROM users u
      LEFT JOIN shops s ON u.shop_id = s.id
      WHERE u.role IN ('shopkeeper', 'cardholder')
      GROUP BY u.shop_id, s.name
      ORDER BY s.name
    `);

    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("GET /users/stats error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch statistics" });
  }
});

// GET /api/users/:id - Get single user details (admin only)
router.get("/:id", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.execute(
      `SELECT 
        u.id, u.email, u.role, u.name, u.gender, u.mobile_number, u.address,
        u.ration_card_number, u.card_type, u.card_color, u.family_size,
        u.socio_economic_category, u.occupation, u.annual_income,
        u.shop_id AS shopId, s.name AS shopName,
        u.is_active AS isActive,
        u.is_flagged AS isFlagged, u.flag_reason AS flagReason,
        u.flagged_by AS flaggedBy,
        flagger.name AS flaggedByName,
        DATE_FORMAT(u.flagged_at, '%Y-%m-%d %H:%i:%s') AS flaggedAt,
        DATE_FORMAT(u.last_login, '%Y-%m-%d %H:%i:%s') AS lastLogin,
        DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM users u
       LEFT JOIN shops s ON u.shop_id = s.id
       LEFT JOIN users flagger ON u.flagged_by = flagger.id
       WHERE u.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("GET /users/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// PATCH /api/users/:id/flag - Flag/unflag user (admin only)
router.patch("/:id/flag", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isFlagged, flagReason } = req.body;
    const adminId = req.user?.userId;

    if (isFlagged === undefined) {
      return res.status(400).json({ success: false, error: "isFlagged is required" });
    }

    // Check if user exists and is shopkeeper
    const [existing]: any = await pool.execute(
      `SELECT id, role, name, email FROM users WHERE id = ?`,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = existing[0];

    // Can flag shopkeepers (primarily) but also cardholders if needed
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: "Cannot flag admin users" });
    }

    if (isFlagged) {
      // Flag the user
      await pool.execute(
        `UPDATE users 
         SET is_flagged = TRUE, 
             flag_reason = ?, 
             flagged_by = ?, 
             flagged_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [flagReason || 'Suspicious activity', adminId, id]
      );

      console.log(`🚩 User flagged: ${user.name} (${user.email}) - Reason: ${flagReason}`);
    } else {
      // Unflag the user
      await pool.execute(
        `UPDATE users 
         SET is_flagged = FALSE, 
             flag_reason = NULL, 
             flagged_by = NULL, 
             flagged_at = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      console.log(`✅ User unflagged: ${user.name} (${user.email})`);
    }

    // Return updated user
    const [updated]: any = await pool.execute(
      `SELECT 
        id, email, role, name, is_flagged AS isFlagged, flag_reason AS flagReason,
        DATE_FORMAT(flagged_at, '%Y-%m-%d %H:%i:%s') AS flaggedAt
       FROM users WHERE id = ?`,
      [id]
    );

    return res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error("PATCH /users/:id/flag error:", err);
    res.status(500).json({ success: false, error: "Failed to flag user" });
  }
});

// PATCH /api/users/:id/active - Activate/deactivate user (admin only)
router.patch("/:id/active", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, error: "isActive is required" });
    }

    await pool.execute(
      `UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?`,
      [isActive, id]
    );

    const [updated]: any = await pool.execute(
      `SELECT id, email, name, is_active AS isActive FROM users WHERE id = ?`,
      [id]
    );

    return res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error("PATCH /users/:id/active error:", err);
    res.status(500).json({ success: false, error: "Failed to update user status" });
  }
});

export default router;
