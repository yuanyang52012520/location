/**
 * 短信服务 (精简版, 用于验证码发送)
 * 开发环境在控制台输出验证码
 */

// 生成6位随机验证码
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 手机号格式化
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("86") && cleaned.length > 11) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  }
  return `+86 ${cleaned}`;
}

// 发送短信 (开发环境打印到控制台)
export async function sendSMS(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const normalizedPhone = normalizePhone(phone);
  console.log("========================================");
  console.log(`  [短信验证码] 发送到 ${normalizedPhone}`);
  console.log(`  验证码: ${code}`);
  console.log("========================================");

  // TODO: 生产环境接入阿里云短信
  // const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  // const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;

  return {
    success: true,
    message: "验证码已发送 (开发模式)",
  };
}
