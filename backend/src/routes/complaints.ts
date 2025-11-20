import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, authorizeRole, AuthRequest } from "../middleware/authGuard";

const router = Router();

// GET /api/complaints → List complaints (user sees own, admin sees all for their shop)
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const shopId = req.user?.shopId;

    let query = `
      SELECT c.id, c.user_id AS userId, c.shop_id AS shopId, c.description,
             c.status, c.created_at AS createdAt, c.updated_at AS updatedAt,
             c.resolved_at AS resolvedAt, u.email, u.name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
    `;
    const params: any[] = [];

    if (userRole === "admin" && shopId) {
      query += ` WHERE c.shop_id = ?`;
      params.push(shopId);
    } else {
      query += ` WHERE c.user_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY c.created_at DESC LIMIT 100`;

    const [rows]: any = await pool.execute(query, params);

    return res.json(rows);
  } catch (err) {
    console.error("GET /complaints error:", err);
    return res.status(500).json({ error: "Failed to load complaints" });
  }
});

// POST /api/complaints → Create complaint
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { shopId, description } = req.body;

    if (!shopId || !description) {
      return res.status(400).json({ error: "shopId and description required" });
    }

    const [result]: any = await pool.execute(
      `INSERT INTO complaints (user_id, shop_id, description, status)
       VALUES (?, ?, ?, 'open')`,
      [userId, shopId, description]
    );

    const [rows]: any = await pool.execute(
      `SELECT id, user_id AS userId, shop_id AS shopId, description, status,
              created_at AS createdAt
       FROM complaints WHERE id = ?`,
      [result.insertId]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error("POST /complaints error:", err);
    return res.status(500).json({ error: "Failed to create complaint" });
  }
});

// PATCH /api/complaints/:id → Update complaint status (admin only)
router.patch("/:id", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status required" });
    }

    const resolvedAt = status === "resolved" ? "NOW()" : "NULL";

    await pool.execute(
      `UPDATE complaints SET status = ?, resolved_at = ${resolvedAt}, updated_at = NOW()
       WHERE id = ?`,
      [status, id]
    );

    const [rows]: any = await pool.execute(
      `SELECT id, user_id AS userId, shop_id AS shopId, description, status,
              created_at AS createdAt, updated_at AS updatedAt, resolved_at AS resolvedAt
       FROM complaints WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /complaints/:id error:", err);
    return res.status(500).json({ error: "Failed to update complaint" });
  }
});

export default router;
