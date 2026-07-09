import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabase";
import { generateOTP, sendSMS, normalizePhone } from "../services/sms";

const router: Router = Router();

// ============================================================
// 内存存储 (开发环境降级)
// ============================================================

interface OtpRecord {
  id: string;
  phone: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

interface MockUser {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

/** 用户资料（含密码哈希） */
interface UserProfile {
  userId: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  password_hash: string | null;
  has_set_password: boolean;
  created_at: string;
  updated_at: string;
}

const memoryOtps: Map<string, OtpRecord> = new Map();
const memoryUsers: Map<string, MockUser> = new Map();
const memoryProfiles: Map<string, UserProfile> = new Map(); // key: normalizedPhone

// 清理过期 OTP
setInterval(() => {
  const now = new Date();
  for (const [key, record] of memoryOtps) {
    if (new Date(record.expires_at) < now) {
      memoryOtps.delete(key);
    }
  }
}, 5 * 60 * 1000);

// 使用内存存储 (开发模式，不依赖 Supabase)
let useSupabaseDB = false;

/**
 * POST /api/auth/send-otp
 * 发送手机验证码
 */
router.post(
  "/send-otp",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ error: "手机号不能为空" });
        return;
      }

      const normalizedPhone = normalizePhone(phone);
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      if (useSupabaseDB) {
        const { error: insertError } = await supabase
          .from("otp_codes")
          .insert({
            phone: normalizedPhone,
            code,
            expires_at: expiresAt,
            used: false,
          });
        if (insertError) {
          console.error("[存储验证码失败]", insertError);
        }
      }

      // 内存备份
      const id = `otp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      memoryOtps.set(id, {
        id,
        phone: normalizedPhone,
        code,
        expires_at: expiresAt,
        used: false,
        created_at: now,
      });

      await sendSMS(normalizedPhone, code);

      res.json({
        success: true,
        message: "验证码已发送",
        ...(process.env.NODE_ENV !== "production" && { devCode: code }),
      });
    } catch (error: any) {
      console.error("[发送验证码异常]", error);
      res.status(500).json({ error: "服务器内部错误" });
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * 验证验证码并登录/注册
 */
router.post(
  "/verify-otp",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        res.status(400).json({ error: "手机号和验证码不能为空" });
        return;
      }

      const normalizedPhone = normalizePhone(phone);

      // 验证 OTP (优先查数据库，降级到内存)
      let otpValid = false;
      let otpRecord: OtpRecord | null = null;

      if (useSupabaseDB) {
        const { data, error } = await supabase
          .from("otp_codes")
          .select("*")
          .eq("phone", normalizedPhone)
          .eq("code", code)
          .eq("used", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          if (new Date(data.expires_at) > new Date()) {
            otpValid = true;
            otpRecord = data;
            await supabase.from("otp_codes").update({ used: true }).eq("id", data.id);
          } else {
            res.status(400).json({ error: "验证码已过期" });
            return;
          }
        }
      }

      // 降级到内存
      if (!otpValid) {
        for (const [, record] of memoryOtps) {
          if (
            record.phone === normalizedPhone &&
            record.code === code &&
            !record.used
          ) {
            if (new Date(record.expires_at) > new Date()) {
              otpValid = true;
              record.used = true;
              break;
            } else {
              res.status(400).json({ error: "验证码已过期" });
              return;
            }
          }
        }
      }

      if (!otpValid) {
        res.status(400).json({ error: "验证码错误" });
        return;
      }

      // 查找或创建用户
      let mockUser = memoryUsers.get(normalizedPhone);
      let isNewUser = false;
      if (!mockUser) {
        isNewUser = true;
        const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        mockUser = {
          id,
          phone: normalizedPhone,
          display_name: normalizedPhone.slice(-4),
          avatar_url: null,
          created_at: new Date().toISOString(),
        };
        memoryUsers.set(normalizedPhone, mockUser);
      }

      // 也尝试在 Supabase 创建
      try {
        const { supabaseAdmin } = await import("../lib/supabase");
        await supabaseAdmin.auth.admin.createUser({
          phone: normalizedPhone,
          phone_confirm: true,
          user_metadata: { phone: normalizedPhone },
        });
      } catch {
        // 忽略 Supabase 创建失败
      }

      // 检查是否已设置密码
      const profile = memoryProfiles.get(normalizedPhone);
      const hasPassword = profile?.has_set_password ?? false;

      res.json({
        success: true,
        message: "验证成功",
        user: mockUser,
        hasPassword,
        isNewUser,
      });
    } catch (error: any) {
      console.error("[验证码校验异常]", error);
      res.status(500).json({ error: "服务器内部错误" });
    }
  }
);

/**
 * POST /api/auth/set-password
 * 首次注册后设置密码和个人信息
 */
router.post(
  "/set-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, password, display_name } = req.body;
      if (!phone || !password) {
        res.status(400).json({ error: "手机号和密码不能为空" });
        return;
      }

      const normalizedPhone = normalizePhone(phone);

      // 验证用户是否存在（必须先通过 OTP 验证，即内存中有该用户）
      const existingUser = memoryUsers.get(normalizedPhone);
      if (!existingUser) {
        res.status(400).json({ error: "请先通过验证码验证手机号" });
        return;
      }

      // 检查是否已经设置过密码
      const existingProfile = memoryProfiles.get(normalizedPhone);
      if (existingProfile?.has_set_password) {
        res.status(400).json({ error: "密码已设置，请直接登录" });
        return;
      }

      // 密码强度校验
      if (password.length < 6) {
        res.status(400).json({ error: "密码长度至少6位" });
        return;
      }

      // 哈希密码
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const now = new Date().toISOString();
      const profile: UserProfile = {
        userId: existingUser.id,
        phone: normalizedPhone,
        display_name: display_name || existingUser.display_name,
        avatar_url: existingUser.avatar_url,
        password_hash,
        has_set_password: true,
        created_at: now,
        updated_at: now,
      };

      // 存储到内存
      memoryProfiles.set(normalizedPhone, profile);

      // 更新内存用户的显示名
      if (display_name) {
        existingUser.display_name = display_name;
        memoryUsers.set(normalizedPhone, existingUser);
      }

      // 同步到 Supabase profiles 表
      try {
        await supabase.from("profiles").upsert(
          {
            phone: normalizedPhone,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            password_hash,
            has_set_password: true,
            updated_at: now,
          },
          { onConflict: "phone" }
        );
      } catch (err) {
        console.error("[同步 profiles 到 Supabase 失败]", err);
      }

      res.json({
        success: true,
        message: "密码设置成功",
        user: {
          ...existingUser,
          display_name: profile.display_name,
        },
      });
    } catch (error: any) {
      console.error("[设置密码异常]", error);
      res.status(500).json({ error: "服务器内部错误" });
    }
  }
);

/**
 * POST /api/auth/login-password
 * 手机号 + 密码登录
 */
router.post(
  "/login-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        res.status(400).json({ error: "手机号和密码不能为空" });
        return;
      }

      const normalizedPhone = normalizePhone(phone);

      // 检查用户是否存在
      const mockUser = memoryUsers.get(normalizedPhone);
      if (!mockUser) {
        res.status(400).json({ error: "该手机号未注册，请先验证码注册" });
        return;
      }

      // 获取密码哈希
      let password_hash: string | null = null;

      // 先查 Supabase profiles
      try {
        const { data } = await supabase
          .from("profiles")
          .select("password_hash")
          .eq("phone", normalizedPhone)
          .single();
        if (data?.password_hash) {
          password_hash = data.password_hash;
        }
      } catch {
        // 忽略
      }

      // 降级到内存
      if (!password_hash) {
        const profile = memoryProfiles.get(normalizedPhone);
        password_hash = profile?.password_hash ?? null;
      }

      if (!password_hash) {
        res.status(400).json({ error: "未设置密码，请使用验证码登录" });
        return;
      }

      // 验证密码
      const isValid = await bcrypt.compare(password, password_hash);
      if (!isValid) {
        res.status(400).json({ error: "密码错误" });
        return;
      }

      res.json({
        success: true,
        message: "登录成功",
        user: mockUser,
      });
    } catch (error: any) {
      console.error("[密码登录异常]", error);
      res.status(500).json({ error: "服务器内部错误" });
    }
  }
);

export default router;
