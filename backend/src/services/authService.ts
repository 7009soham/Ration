import { sign, SignOptions } from "jsonwebtoken";

import { RowDataPacket, ResultSetHeader } from "mysql2";
import db from "../config/database";
import bcrypt from "bcrypt";

import transporter from "../config/email";


interface VerificationCode extends RowDataPacket {
  id: number;
  email: string;
  code: string;
  expires_at: Date;
  attempts: number;
  verified_at: Date | null;
}

interface User extends RowDataPacket {
  id: number;
  email: string;
  role: 'cardholder' | 'shopkeeper' | 'admin';
  name: string | null;
  language: string;
  shop_id: string | null;
  is_active: boolean;
  ration_card_number?: string | null; // New schema field
  card_type?: 'AAY' | 'PHH' | 'BPL' | 'APL' | null; // New schema field
}

export class AuthService {
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationCode(
    email: string,
    role: 'cardholder' | 'shopkeeper' | 'admin'
  ): Promise<boolean> {
    try {
      const code = this.generateCode();
      const expiryMinutes = parseInt(process.env.CODE_EXPIRY_MINUTES || '10');
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      const hashedCode = await bcrypt.hash(code, 10);

      await db.execute(
        'INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)',
        [email, hashedCode, expiresAt]
      );

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your Ration TDS Verification Code',
        html: `
          <div style="font-family: Arial; padding: 20px;">
            <h2 style="color: #FF6600;">राशन वितरण प्रणाली</h2>
            <p>Your verification code:</p>
            <div style="padding: 16px; background: #eee; text-align:center; font-size:32px;">
              ${code}
            </div>
            <p>This code expires in ${expiryMinutes} minutes.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification code sent to ${email} (Code: ${code})`);
      return true;
    } catch (error) {
      console.error('Error sending verification code:', error);
      return false;
    }
  }

  async verifyCode(
    email: string,
    code: string,
    role: 'cardholder' | 'shopkeeper' | 'admin',
    language: string = 'english'
  ): Promise<any> {
    try {
      const [codes] = await db.execute<VerificationCode[]>(
        `SELECT * FROM verification_codes 
         WHERE email = ? AND verified_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 5`,
        [email]
      );

      if (codes.length === 0)
        return { success: false, message: 'Invalid or expired code' };

      let validCode: VerificationCode | null = null;

      for (const record of codes) {
        if (await bcrypt.compare(code, record.code)) {
          validCode = record;
          break;
        }
      }

      if (!validCode) {
        await db.execute(
          `UPDATE verification_codes SET attempts = attempts + 1 
           WHERE email = ? AND verified_at IS NULL`,
          [email]
        );
        return { success: false, message: 'Invalid code' };
      }

      await db.execute(
        'UPDATE verification_codes SET verified_at = NOW() WHERE id = ?',
        [validCode.id]
      );

      const [users] = await db.execute<User[]>(
        'SELECT id, email, role, name, language, shop_id, is_active, ration_card_number, card_type FROM users WHERE email = ?',
        [email]
      );

      let user: User;

      if (users.length === 0) {
        // For new emails we do NOT auto-create complex ration card details.
        // Minimal insertion to satisfy login; admin can enrich later.
        const shopId = 'SHOP001';
        const name = email.split('@')[0];
        const [result] = await db.execute<ResultSetHeader>(
          `INSERT INTO users (email, role, name, language, shop_id, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [email, role, name, language, shopId]
        );
        const [newUser] = await db.execute<User[]>(
          'SELECT id, email, role, name, language, shop_id, is_active FROM users WHERE id = ?',
          [result.insertId]
        );
        user = newUser[0];
      } else {
        user = users[0];

        await db.execute(
          'UPDATE users SET last_login = NOW(), language = ? WHERE id = ?',
          [language, user.id]
        );
      }

      // ⭐ JWT now always contains a valid shopId
      const token = sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          shopId: user.shop_id,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        } as SignOptions
      );


      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          rationCard: user.ration_card_number,
          cardType: user.card_type,
          language: user.language,
          shopId: user.shop_id
        }
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, message: 'Server error' };
    }
  }
}

export default new AuthService();
