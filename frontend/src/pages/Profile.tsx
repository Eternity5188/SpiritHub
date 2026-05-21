import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, FileText, Layers, Calendar, Edit2, Check, X, Camera, Copy, Heart, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi, pointsApi } from '../lib/api';
import { PointsRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, refreshUser } = useAuth();
  const { t, lang } = useLocale();
  const [profile, setProfile] = useState<any>(null);
  const [pointsHistory, setPointsHistory] = useState<PointsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const copyFriendCode = (code: string) => {
    const doCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(doCopy).catch(() => legacyCopy(code, doCopy));
    } else {
      legacyCopy(code, doCopy);
    }
  };
  const legacyCopy = (text: string, cb: () => void) => {
    const el = document.createElement('textarea');
    el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
    document.body.appendChild(el); el.select();
    try { document.execCommand('copy'); cb(); } catch {}
    document.body.removeChild(el);
  };

  const isOwner = currentUser?.username === username;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    const promises: Promise<any>[] = [
      usersApi.profile(username)
    ];
    if (isOwner) {
      promises.push(pointsApi.history({ limit: 10 }));
    }
    Promise.all(promises)
      .then(([profileRes, historyRes]) => {
        setProfile(profileRes.data);
        setBio(profileRes.data.user.bio || '');
        if (historyRes) setPointsHistory(historyRes.data.history);
        document.title = `${profileRes.data.user.username} - ${t('灵创平台', 'SpiritHub')}`;
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username, isOwner, t]);

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile({ bio });
      setProfile((p: any) => ({ ...p, user: { ...p.user, bio } }));
      await refreshUser();
      setEditing(false);
      toast.success(t('简介已更新', 'Bio updated'));
    } catch {
      toast.error(t('保存失败', 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t('图片大小不能超过 2MB', 'Image size must not exceed 2 MB')); return; }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        await usersApi.updateProfile({ bio: profile.user.bio || '', avatar: dataUrl });
        setProfile((p: any) => ({ ...p, user: { ...p.user, avatar: dataUrl } }));
        await refreshUser();
        toast.success(t('头像更新成功', 'Avatar updated'));
      } catch {
        toast.error(t('上传失败，请重试', 'Upload failed, please try again'));
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-24 bg-stone-200 rounded mb-4" />
    </div>
  );

  if (!profile) return <div className="text-center py-20 text-stone-400">{t('用户不存在', 'User not found')}</div>;

  const { user: profileUser, stats, recentPosts } = profile;

  const rankColor = (pts: number) => {
    if (pts >= 1000) return 'text-yellow-400';
    if (pts >= 500) return 'text-purple-400';
    if (pts >= 100) return 'text-blue-400';
    return 'text-stone-500';
  };

  const reasonMap: Record<string, string> = {
    '上传科学组研究文件': 'Uploaded a science group research file',
    '充值套餐：Pro 套餐（订单号 LJ1779114120454B63AD0）': 'Recharge package: Pro plan (Order No. LJ1779114120454B63AD0)',
    '发起科学组研究讨论': 'Started a science group discussion',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-slide-up">
      {/* Profile Header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar with upload */}
          <div className="relative flex-shrink-0">
            <Avatar avatar={profileUser.avatar} username={profileUser.username} size="lg" />
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow transition-colors"
                  title={t('更换头像', 'Change avatar')}
                >
                  {uploadingAvatar ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-stone-900">{profileUser.username}</h1>
              {profileUser.role === 'admin' && <span className="badge badge-red">{t('管理员', 'Admin')}</span>}
            </div>
            <div className={`flex items-center gap-1.5 font-bold text-lg mb-2 ${rankColor(profileUser.lingjing_points)}`}>
              <Sparkles className="w-5 h-5" />
              {profileUser.lingjing_points} {t('灵创值', 'credits')}
            </div>

            {/* Bio */}
            {editing ? (
              <div className="flex items-start gap-2">
                <textarea
                  className="input text-sm resize-none flex-1 min-h-[60px]"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder={t('介绍一下自己...', 'Introduce yourself...')}
                  maxLength={200}
                />
                <div className="flex flex-col gap-1">
                  <button onClick={handleSaveBio} disabled={saving} className="p-1.5 bg-green-900/40 text-green-400 rounded hover:bg-green-900/60 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditing(false); setBio(profileUser.bio || ''); }} className="p-1.5 bg-stone-100 text-stone-500 rounded hover:bg-stone-200 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-stone-500 text-sm flex-1">{profileUser.bio || (isOwner ? t('点击编辑，介绍一下自己...', 'Click edit to add your bio...') : t('这个人很懒，什么都没写', 'This user has not written a bio yet'))}</p>
                {isOwner && (
                  <button onClick={() => setEditing(true)} className="p-1.5 text-stone-500 hover:text-stone-600 transition-colors flex-shrink-0">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-stone-400 mt-2">
              <Calendar className="w-3 h-3 inline mr-1" />
              {t('加入于', 'Joined on')} {new Date(profileUser.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
            </p>
            {(profileUser as any).friend_code && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs text-stone-400">{t('好友码', 'Friend Code')}</span>
                <span className="text-xs font-mono text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md tracking-wider">
                  #{(profileUser as any).friend_code}
                </span>
                {isOwner && (
                  <button
                    title={t('复制好友码', 'Copy friend code')}
                    onClick={() => copyFriendCode((profileUser as any).friend_code)}
                    className="p-1 transition-colors text-stone-400 hover:text-primary-600"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-stone-200">
          {[
            { icon: FileText, label: t('发帖数', 'Posts'), value: stats.post_count },
            { icon: Layers, label: t('参与项目', 'Projects'), value: stats.colab_count },
            { icon: Sparkles, label: t('灵创值', 'credits'), value: profileUser.lingjing_points }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="w-4 h-4 text-stone-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-stone-900">{value}</div>
              <div className="text-xs text-stone-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="card">
          <h2 className="font-semibold text-stone-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-400" />
            {t('最近发帖', 'Recent Posts')}
          </h2>
          {recentPosts.length === 0 ? (
            <p className="text-stone-500 text-sm">{t('还没有发过帖子', 'No posts yet')}</p>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((p: any) => (
                <Link key={p.id} to={`/post/${p.id}`} className="block hover:bg-stone-100 rounded-lg p-2 -mx-2 transition-colors">
                  <p className="text-sm text-stone-600 line-clamp-1 hover:text-primary-600">{p.title}</p>
                  <div className="flex gap-3 text-xs text-stone-400 mt-0.5">
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {p.likes_count}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {p.comments_count}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Points History (owner only) */}
        {isOwner && (
          <div className="card">
            <h2 className="font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              {t('灵创值记录', 'Credit History')}
            </h2>
            {pointsHistory.length === 0 ? (
              <p className="text-stone-500 text-sm">{t('还没有积分记录', 'No credit records yet')}</p>
            ) : (
              <div className="space-y-2">
                {pointsHistory.map(r => (
                  <div key={r.id} className="flex justify-between items-center text-sm">
                    <span className="text-stone-500 flex-1 mr-2 truncate">{lang === 'en' ? (reasonMap[r.reason] || r.reason) : r.reason}</span>
                    <span className={`font-bold flex-shrink-0 ${r.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.amount > 0 ? '+' : ''}{r.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


