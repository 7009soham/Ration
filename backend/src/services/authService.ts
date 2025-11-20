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
  role: 'cardholder' | 'admin';
  name: string | null;
  ration_card: string | null;
  category: 'BPL' | 'APL' | null;
  language: string;
  shop_id: string | null;
  is_active: boolean;
}

export class AuthService {
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationCode(
    email: string,
    role: 'cardholder' | 'admin'
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
    role: 'cardholder' | 'admin',
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
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      let user: User;

      if (users.length === 0) {
        // ⭐ FIX: assign valid shop to ALL roles
        const shopId = 'SHOP001';

        const category = email.includes('bpl') ? 'BPL' : 'APL';
        const rationCard =
          category + Math.floor(100000 + Math.random() * 900000);

        const name = 'राम कुमार / Ram Kumar';

        const [result] = await db.execute<ResultSetHeader>(
          `INSERT INTO users (email, role, name, ration_card, category, language, shop_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [email, role, name, rationCard, category, language, shopId]
        );

        const [newUser] = await db.execute<User[]>(
          'SELECT * FROM users WHERE id = ?',
          [result.insertId]
        );

        user = newUser[0];

        if (role === 'cardholder') {
          const month = new Date().getMonth() + 1;
          const year = new Date().getFullYear();
          const items = [
            { code: 'rice', quantity: 5 },
            { code: 'wheat', quantity: 5 },
            { code: 'sugar', quantity: 1 },
            { code: 'kerosene', quantity: 2 }
          ];

          for (const item of items) {
            await db.execute(
              `INSERT INTO monthly_allocations 
               (user_id, item_code, eligible_quantity, month, year)
               VALUES (?, ?, ?, ?, ?)`,
              [user.id, item.code, item.quantity, month, year]
            );
          }
        }
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
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
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
          rationCard: user.ration_card,
          category: user.category,
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
