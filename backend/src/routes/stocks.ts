import { Router, Response } from "express";
import pool from "../config/database";
import { authenticateToken, AuthRequest, authorizeRole } from "../middleware/authGuard";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // FIX: Convert invalid values → null
    let raw = req.query.shopId;
    const shopId =
      raw && raw !== "null" && raw !== "undefined" ? String(raw) : null;

    if (!shopId) {
      return res.status(400).json({ success: false, error: "Valid shopId is required" });
    }

    const [rows]: any = await pool.execute(
      `SELECT item_code AS code, item_name AS name, item_name_hindi AS hindiName,
              government_allocated AS governmentAllocated,
              quantity, unit, DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
       FROM stock_items WHERE shop_id = ?`,
      [shopId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Stocks error:", err);
    res.status(500).json({ success: false, error: "Failed to load stocks" });
  }
});

// POST /api/stocks/update → update stock by delta
router.post("/update", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { itemCode, deltaQuantity, shopId } = req.body;

    if (!itemCode || deltaQuantity === undefined) {
      return res.status(400).json({ error: "itemCode and deltaQuantity required" });
    }

    const finalShopId = shopId || req.user?.shopId || "SHOP001";

    // Update quantity by delta
    await pool.execute(
      `UPDATE stock_items 
       SET quantity = quantity + ?, updated_at = NOW()
       WHERE shop_id = ? AND item_code = ?`,
      [Number(deltaQuantity), finalShopId, itemCode]
    );

    // Fetch updated item
    const [rows]: any = await pool.execute(
      `SELECT item_code AS code, item_name AS name, item_name_hindi AS hindiName,
              quantity, unit, updated_at AS updatedAt
       FROM stock_items WHERE shop_id = ? AND item_code = ?`,
      [finalShopId, itemCode]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("POST /stocks/update error:", err);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// PATCH /api/stocks/:code → direct quantity update with audit logging
router.patch("/:code", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const { quantity, shopId } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, error: "quantity required" });
    }

    const finalShopId = shopId || req.user?.shopId || "SHOP001";
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Get current stock for audit trail
    const [current]: any = await pool.execute(
      `SELECT id, quantity FROM stock_items WHERE shop_id = ? AND item_code = ?`,
      [finalShopId, code]
    );

    if (!current.length) {
      return res.status(404).json({ success: false, error: "Stock item not found" });
    }

    const stockItemId = current[0].id;
    const oldQuantity = current[0].quantity;
    const newQuantity = Number(quantity);
    const quantityDiff = newQuantity - oldQuantity;

    // Update stock quantity
    await pool.execute(
      `UPDATE stock_items 
       SET quantity = ?, updated_at = NOW()
       WHERE shop_id = ? AND item_code = ?`,
      [newQuantity, finalShopId, code]
    );

    // Log to audit trail
    let changeType = 'shopkeeper_update';
    if (userRole === 'admin') {
      changeType = 'admin_correction';
    }

    await pool.execute(
      `INSERT INTO stock_audit_log 
       (stock_item_id, shop_id, item_code, changed_by_user_id, changed_by_role, 
        change_type, old_quantity, new_quantity, quantity_difference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [stockItemId, finalShopId, code, userId, userRole, changeType, oldQuantity, newQuantity, quantityDiff]
    );

    const [rows]: any = await pool.execute(
      `SELECT item_code AS code, item_name AS name, item_name_hindi AS hindiName,
              government_allocated AS governmentAllocated,
              quantity, unit, DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
       FROM stock_items WHERE shop_id = ? AND item_code = ?`,
      [finalShopId, code]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Stock item not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("PATCH /stocks/:code error:", err);
    res.status(500).json({ error: "Failed to patch stock" });
  }
});

// GET /api/stocks/audit/:shopId → Get audit trail for stock changes (Admin only)
router.get("/audit/:shopId", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { shopId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const [rows]: any = await pool.execute(
      `SELECT 
        sal.id, sal.item_code AS itemCode, sal.shop_id AS shopId,
        sal.changed_by_role AS changedByRole,
        u.name AS changedByName, u.email AS changedByEmail,
        sal.change_type AS changeType,
        sal.old_quantity AS oldQuantity,
        sal.new_quantity AS newQuantity,
        sal.quantity_difference AS quantityDifference,
        sal.reason, sal.notes,
        DATE_FORMAT(sal.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM stock_audit_log sal
       LEFT JOIN users u ON sal.changed_by_user_id = u.id
       WHERE sal.shop_id = ?
       ORDER BY sal.created_at DESC
       LIMIT ?`,
      [shopId, limit]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET /stocks/audit error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

// POST /api/stocks/allocate → Admin allocates government stock to shop
router.post("/allocate", authenticateToken, authorizeRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, itemCode, quantity, reason } = req.body;
    const userId = req.user?.userId;

    if (!shopId || !itemCode || quantity === undefined) {
      return res.status(400).json({ success: false, error: "shopId, itemCode, and quantity required" });
    }

    // Check if stock item exists
    const [existing]: any = await pool.execute(
      `SELECT id, government_allocated, quantity FROM stock_items 
       WHERE shop_id = ? AND item_code = ?`,
      [shopId, itemCode]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Stock item not found" });
    }

    const stockItemId = existing[0].id;
    const oldAllocated = existing[0].government_allocated;
    const oldQuantity = existing[0].quantity;
    const newAllocated = Number(quantity);
    const newQuantity = oldQuantity + (newAllocated - oldAllocated); // Adjust current stock

    // Update both government_allocated and quantity
    await pool.execute(
      `UPDATE stock_items 
       SET government_allocated = ?, quantity = ?, allocated_by = ?, updated_at = NOW(), last_restocked = NOW()
       WHERE shop_id = ? AND item_code = ?`,
      [newAllocated, newQuantity, userId, shopId, itemCode]
    );

    // Log allocation
    await pool.execute(
      `INSERT INTO stock_audit_log 
       (stock_item_id, shop_id, item_code, changed_by_user_id, changed_by_role, 
        change_type, old_quantity, new_quantity, quantity_difference, reason)
       VALUES (?, ?, ?, ?, 'admin', 'government_allocation', ?, ?, ?, ?)`,
      [stockItemId, shopId, itemCode, userId, oldAllocated, newAllocated, newAllocated - oldAllocated, reason || 'Stock allocation']
    );

    return res.json({ 
      success: true, 
      message: "Stock allocated successfully",
      allocated: newAllocated,
      currentStock: newQuantity
    });
  } catch (err) {
    console.error("POST /stocks/allocate error:", err);
    res.status(500).json({ success: false, error: "Failed to allocate stock" });
  }
});

export default router;
