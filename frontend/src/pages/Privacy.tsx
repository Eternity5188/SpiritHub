import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

function Section({ titleZh, titleEn, children }: { titleZh: string; titleEn: string; children: React.ReactNode }) {
  const { lang } = useLocale();
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-stone-800 mb-3 border-l-4 border-violet-500 pl-3">{lang === 'en' ? titleEn : titleZh}</h2>
      <div className="text-stone-600 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function Privacy() {
  const { t, lang } = useLocale();

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('返回首页', 'Back to Home')}
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('隐私政策', 'Privacy Policy')}</h1>
      <p className="text-xs text-stone-400 mb-8">{t('最后更新：2026年5月19日 · 生效日期：2026年5月19日', 'Last updated: May 19, 2026 · Effective date: May 19, 2026')}</p>

      <p className="text-sm text-stone-600 mb-8 bg-violet-50 border border-violet-100 rounded-xl p-4">
        {lang === 'en'
          ? 'SpiritHub knows your personal information matters. We protect your information security in accordance with applicable laws and regulations. Please read this policy carefully before use.'
          : '灵创平台（以下简称"本平台"）深知个人信息对您的重要性，我们将依据《个人信息保护法》《网络安全法》等法律法规，保护您的个人信息安全。请在使用前仔细阅读本政策。'}
      </p>

      <Section titleZh="1. 我们收集哪些信息" titleEn="1. What We Collect">
        <p>{lang === 'en' ? <><strong>Information you provide:</strong> username, email, password (stored encrypted), posts, comments, CoLab projects, avatar image, and profile bio.</> : <><strong>您主动提供的信息：</strong>注册时的用户名、邮箱、密码（加密存储）；发布的帖子、评论、CoLab 项目等内容；上传的头像图片；填写的个人简介。</>}</p>
        <p>{lang === 'en' ? <><strong>Automatically collected information:</strong> server access logs (IP address, request time, HTTP status code) for service stability; logs are retained for no more than 30 days.</> : <><strong>自动收集的信息：</strong>服务器访问日志（IP 地址、请求时间、HTTP 状态码），用于维护服务稳定性，日志保留不超过 30 天。</>}</p>
        <p>{lang === 'en' ? 'We do not collect your precise location, contacts, microphone, camera, or other sensitive permission data.' : '本平台<strong>不收集</strong>您的精确地理位置、通讯录、麦克风、摄像头等敏感权限数据。'}</p>
      </Section>

      <Section titleZh="2. 我们如何使用您的信息" titleEn="2. How We Use Your Information">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>{t('提供账号注册、登录、密码重置等基础功能', 'Provide core features such as registration, login, and password reset')}</li>
          <li>{t('展示社区内容、好友推荐（基于平台行为数据）', 'Show community content and friend recommendations based on platform activity')}</li>
          <li>{t('AI 工具服务（内容文案、图像分析）——您的输入会发送至阿里云 DashScope API 处理', 'AI tools such as copy generation and image analysis. Your input is sent to Alibaba Cloud DashScope API for processing')}</li>
          <li>{t('维护平台安全，检测违规内容', 'Maintain platform safety and detect policy violations')}</li>
          <li>{t('向您发送密码重置等服务通知邮件', 'Send service emails such as password reset notices')}</li>
        </ul>
      </Section>

      <Section titleZh="3. 信息共享与第三方" titleEn="3. Sharing and Third Parties">
        <p>{t('本平台不会出售您的个人信息给任何第三方。', 'We do not sell your personal information to third parties.')}</p>
        <p>{t('以下情况会与第三方共享必要数据：', 'We may share necessary data in the following cases:')}</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>{t('阿里云 DashScope：AI 功能（文案、图像检测）会将您的输入内容发送至该服务处理', 'Alibaba Cloud DashScope: AI features such as copy generation and image detection send your input to the service for processing')}</li>
          <li>{t('法律要求：依据法律法规或政府机关要求披露', 'Legal requirements: disclosure required by law or government authorities')}</li>
        </ul>
      </Section>

      <Section titleZh="4. 数据存储与安全" titleEn="4. Data Storage and Security">
        <p>{t('您的数据存储于平台运营方管理的合规环境中。密码使用 bcrypt 算法加密存储，明文密码不存储于任何位置。', 'Your data is stored in a compliant environment managed by the platform operator. Passwords are encrypted with bcrypt; plaintext passwords are not stored anywhere.')}</p>
        <p>{t('我们使用 HTTPS、JWT 令牌验证、速率限制等措施保护数据安全。但请注意，互联网传输存在固有风险，我们无法保证绝对安全。', 'We use HTTPS, JWT verification, and rate limiting to protect your data. However, internet transmission carries inherent risk and absolute security cannot be guaranteed.')}</p>
        <p>{t('您的个人信息保存至账号注销后 30 天内删除。', 'Your personal information is retained and deleted within 30 days after account deletion.')}</p>
      </Section>

      <Section titleZh="5. 您的权利" titleEn="5. Your Rights">
        <p>{t('依据《个人信息保护法》，您享有以下权利：', 'Under applicable personal information laws, you have the following rights:')}</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>{t('查阅权：查看我们持有的您的个人信息', 'Access: view the personal information we hold about you')}</li>
          <li>{t('更正权：在个人主页修改头像、用户名、简介等信息', 'Correction: update your avatar, username, bio, and other profile details')}</li>
          <li>{t('删除权：申请注销账号，注销后 30 天内彻底删除您的数据', 'Deletion: request account deletion, after which your data will be fully removed within 30 days')}</li>
          <li>{t('撤回同意权：停止使用本平台即视为撤回同意', 'Withdraw consent: stopping use of the platform is treated as withdrawing consent')}</li>
        </ul>
        <p>{t('行使上述权利，请联系：', 'To exercise these rights, contact:')} <a href="mailto:privacy@example.com" className="text-violet-600 hover:underline">privacy@example.com</a></p>
      </Section>

      <Section titleZh="6. Cookie 与本地存储" titleEn="6. Cookies and Local Storage">
        <p>{t('本平台不使用 Cookie 追踪。我们在您的浏览器本地存储（localStorage）中保存登录令牌（JWT），用于维持登录状态，清除浏览器数据即可删除。', 'We do not use cookies for tracking. We store login tokens (JWT) in your browser localStorage to keep you signed in; clearing browser data removes them.')}</p>
      </Section>

      <Section titleZh="7. 未成年人保护" titleEn="7. Minors">
        <p>{t('本平台面向 16 周岁及以上用户。如发现未满 16 周岁的未成年人注册账号，我们将删除相关数据。如您是未成年人的监护人，发现问题请联系我们。', 'The platform is intended for users aged 16 and above. If we discover an account belongs to someone under 16, we will delete the related data. If you are a guardian, please contact us if you find an issue.')}</p>
      </Section>

      <Section titleZh="8. 政策更新" titleEn="8. Policy Updates">
        <p>{t('本政策如有重大变更，将通过平台公告、邮件等方式提前 7 天通知您。继续使用视为接受更新后的政策。', 'If this policy changes materially, we will notify you at least 7 days in advance via platform notices, email, or other means. Continued use indicates acceptance of the updated policy.')}</p>
      </Section>

      <Section titleZh="9. 联系我们" titleEn="9. Contact Us">
        <p>{t('个人信息保护负责人：平台运营团队', 'Personal information protection lead: Platform operations team')}</p>
        <p>{t('联系邮箱：', 'Contact email:')} <a href="mailto:privacy@example.com" className="text-violet-600 hover:underline">privacy@example.com</a></p>
      </Section>

      <div className="mt-10 pt-6 border-t border-stone-100 flex gap-4 text-xs text-stone-400">
        <Link to="/terms" className="hover:text-violet-600 transition-colors">{t('用户协议', 'Terms of Service')}</Link>
        <Link to="/" className="hover:text-violet-600 transition-colors">{t('返回首页', 'Back to Home')}</Link>
      </div>
    </div>
  );
}
