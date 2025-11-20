import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/authService';

const router = Router();

/**
 * Utility: Return validation errors (if any)
 */
function handleValidation(req: Request, res: Response): Response | false {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  return false;
}

/**
 * POST /api/auth/request-code
 */
router.post(
  '/request-code',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('role')
      .isIn(['cardholder', 'shopkeeper', 'admin'])
      .withMessage('Role must be cardholder, shopkeeper, or admin'),
  ],
  async (req: Request, res: Response) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { email, role } = req.body;

    try {
      const sent = await authService.sendVerificationCode(email, role);

      if (!sent) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to send verification code' });
      }

      return res.json({
        success: true,
        message: 'Verification code sent to your email',
        email,
      });
    } catch (error) {
      console.error('❌ Error in request-code:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * POST /api/auth/verify-code
 */
router.post(
  '/verify-code',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('Code must be 6 digits'),
    body('role')
      .isIn(['cardholder', 'shopkeeper', 'admin'])
      .withMessage('Role must be cardholder, shopkeeper, or admin'),
    body('language').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { email, code, role, language = 'english' } = req.body;

    try {
      const result = await authService.verifyCode(email, code, role, language);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error('❌ Error in verify-code:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

export default router;
