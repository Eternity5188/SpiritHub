import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP 未配置，请在 .env 中设置 SMTP_HOST / SMTP_USER / SMTP_PASS');
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '465'),
    secure: SMTP_SECURE !== 'false', // 默认 true（SSL）
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
  const transporter = createTransporter();
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `灵创平台 <${process.env.SMTP_USER}>`,
    to,
    subject: '灵创平台 - 密码重置',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="margin-bottom:24px;">
          <span style="background:linear-gradient(135deg,#7c3aed,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:20px;font-weight:800;">灵创平台</span>
        </div>
        <h2 style="color:#1c1917;font-size:22px;margin:0 0 8px;">密码重置申请</h2>
        <p style="color:#57534e;margin:0 0 8px;">你好 <strong>${username}</strong>，</p>
        <p style="color:#57534e;margin:0 0 24px;">我们收到了你的密码重置申请，请点击下方按钮设置新密码：</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
          重置密码
        </a>
        <p style="color:#a8a29e;font-size:13px;margin-top:24px;">链接 <strong>1 小时</strong>内有效，如非本人操作请忽略此邮件。</p>
        <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0;">
        <p style="color:#a8a29e;font-size:12px;margin:0;">灵创平台 · 东南大学"五边形战士"团队</p>
      </div>
    `,
  });
}
