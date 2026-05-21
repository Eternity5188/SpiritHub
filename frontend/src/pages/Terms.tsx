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

export default function Terms() {
  const { t, lang } = useLocale();

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('返回首页', 'Back to Home')}
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('用户协议', 'Terms of Service')}</h1>
      <p className="text-xs text-stone-400 mb-8">{t('最后更新：2026年5月19日 · 生效日期：2026年5月19日', 'Last updated: May 19, 2026 · Effective date: May 19, 2026')}</p>

      <Section titleZh="1. 总则" titleEn="1. General Terms">
        <p>{t('欢迎使用灵创平台（以下简称"本平台"）。本平台由平台运营团队开发运营。您在注册账号或使用本平台任何服务前，请仔细阅读本协议。', 'Welcome to SpiritHub (the "Platform"). The Platform is developed and operated by the platform operations team. Please read these terms carefully before registering or using any service.')}</p>
        <p>{t('注册或使用本平台即表示您已充分阅读、理解并同意本协议的全部条款。如不同意，请停止使用。', 'By registering or using the Platform, you confirm that you have read, understood, and agreed to all terms. If you disagree, please stop using the Platform.')}</p>
      </Section>

      <Section titleZh="2. 账号注册" titleEn="2. Account Registration">
        <p>{t('您注册时需提供真实、有效的用户名、邮箱和密码。请勿冒充他人身份或使用虚假信息注册。', 'You must provide a true and valid username, email, and password when registering. Do not impersonate others or use false information.')}</p>
        <p>{t('您须妥善保管账号和密码，因您的疏忽导致的账号被盗用，本平台不承担责任。发现异常请立即联系我们修改密码。', 'You are responsible for safeguarding your account and password. We are not liable for unauthorized use caused by your negligence. Contact us immediately if you notice suspicious activity.')}</p>
        <p>{t('每位用户限注册一个账号。发现重复注册行为，本平台有权注销多余账号。', 'Each user may register only one account. If duplicate registrations are found, we may deactivate the extra accounts.')}</p>
      </Section>

      <Section titleZh="3. 用户行为规范" titleEn="3. User Conduct">
        <p>{t('您在本平台发布的内容须遵守中华人民共和国法律法规，不得包含：', 'Content posted on the Platform must comply with applicable laws and must not include:')}</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>{t('违法、暴力、色情、赌博等违禁内容', 'Illegal, violent, sexual, gambling, or other prohibited content')}</li>
          <li>{t('侵犯他人知识产权、隐私权的内容', 'Content that infringes on intellectual property or privacy rights')}</li>
          <li>{t('虚假信息、诈骗或恶意营销内容', 'False information, fraud, or malicious marketing')}</li>
          <li>{t('扰乱平台秩序的刷量、恶意举报等行为', 'Activities that disrupt platform order, such as fake engagement or malicious reports')}</li>
        </ul>
        <p>{t('违规内容将被删除，情节严重者账号将被永久封禁，并保留追究法律责任的权利。', 'Violating content may be removed, and serious violations may result in permanent account suspension and legal action.')}</p>
      </Section>

      <Section titleZh="4. 灵创值（积分）" titleEn="4. Credits">
        <p>{t('灵创值为本平台虚拟权益积分，可通过参与社区互动、完成任务等方式获得，也可付费购买充值套餐兑换。', 'Credits are virtual points on the Platform. They can be earned through participation or purchased via recharge plans.')}</p>
        <p>{t('灵创值不可提现，不可转让，账号注销后灵创值清零，本平台不予退款。', 'Credits are non-withdrawable and non-transferable. They are reset to zero after account deletion, and no refunds are provided.')}</p>
        <p>{t('本平台保留调整灵创值规则的权利，调整前将提前公告。', 'We reserve the right to adjust the credit rules and will announce any changes in advance.')}</p>
      </Section>

      <Section titleZh="5. 知识产权" titleEn="5. Intellectual Property">
        <p>{t('您在本平台发布的原创内容，著作权归您所有。您授权本平台在平台范围内展示、传播该内容，此授权为非独占性授权。', 'You retain copyright to original content you publish on the Platform. You grant the Platform a non-exclusive license to display and distribute that content within the Platform.')}</p>
        <p>{t('本平台的产品名称、Logo、界面设计、代码等知识产权归本平台所有，未经授权不得复制或商业使用。', 'The Platform name, logo, interface design, code, and related intellectual property belong to the Platform and may not be copied or used commercially without authorization.')}</p>
      </Section>

      <Section titleZh="6. 免责声明" titleEn="6. Disclaimer">
        <p>{t('本平台为用户提供信息交流和工具服务，不对用户发布内容的真实性、合法性负责。AI 工具生成的内容仅供参考，请自行判断其准确性。', 'The Platform provides information exchange and tools, but is not responsible for the truthfulness or legality of user content. AI-generated content is for reference only; please verify it yourself.')}</p>
        <p>{t('因不可抗力（网络故障、自然灾害、政策调整等）导致服务中断，本平台不承担赔偿责任。', 'We are not liable for service interruptions caused by force majeure, including network failures, natural disasters, or policy changes.')}</p>
      </Section>

      <Section titleZh="7. 协议修改" titleEn="7. Changes to Terms">
        <p>{t('本平台有权根据法律法规变化或业务需要修改本协议，修改后将在平台公告，继续使用即视为接受新协议。', 'We may revise these terms based on legal, regulatory, or business needs. Updates will be posted on the Platform, and continued use indicates acceptance of the new terms.')}</p>
      </Section>

      <Section titleZh="8. 争议解决" titleEn="8. Dispute Resolution">
        <p>{t('本协议的解释与争议，适用平台实际运营地的相关法律法规。如发生争议，双方应先协商解决；协商不成，提交平台运营主体所在地有管辖权的机构处理。', 'These terms are governed by the laws and regulations applicable in the platform’s operating jurisdiction. Disputes should first be resolved through negotiation; if unresolved, they will be submitted to the competent authority in the operator’s jurisdiction.')}</p>
      </Section>

      <Section titleZh="9. 联系我们" titleEn="9. Contact Us">
        <p>{t('如对本协议有任何疑问，请联系：', 'If you have questions about these terms, contact:')} <a href="mailto:legal@example.com" className="text-violet-600 hover:underline">legal@example.com</a></p>
      </Section>

      <div className="mt-10 pt-6 border-t border-stone-100 flex gap-4 text-xs text-stone-400">
        <Link to="/privacy" className="hover:text-violet-600 transition-colors">{t('隐私政策', 'Privacy Policy')}</Link>
        <Link to="/" className="hover:text-violet-600 transition-colors">{t('返回首页', 'Back to Home')}</Link>
      </div>
    </div>
  );
}
