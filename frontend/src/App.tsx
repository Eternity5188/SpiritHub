import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { SocketProvider } from './contexts/SocketContext';
import Nav from './components/Nav';
import Footer from './components/Footer';
import AiChat from './components/AiChat';
import Breadcrumb from './components/Breadcrumb';
import { ErrorBoundary } from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { Toaster } from 'sonner';

const Home          = lazy(() => import('./pages/Home'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));
const Community     = lazy(() => import('./pages/Community'));
const PostDetail    = lazy(() => import('./pages/PostDetail'));
const CoLab         = lazy(() => import('./pages/CoLab'));
const ColabDetail   = lazy(() => import('./pages/ColabDetail'));
const Profile       = lazy(() => import('./pages/Profile'));
const Leaderboard   = lazy(() => import('./pages/Leaderboard'));
const Friends       = lazy(() => import('./pages/Friends'));
const Chat          = lazy(() => import('./pages/Chat'));
const Admin         = lazy(() => import('./pages/Admin'));
const Ledger        = lazy(() => import('./pages/Ledger'));
const Recharge      = lazy(() => import('./pages/Recharge'));
const Tools         = lazy(() => import('./pages/Tools'));
const ToolCopywriter = lazy(() => import('./pages/ToolCopywriter'));
const ToolProfit    = lazy(() => import('./pages/ToolProfit'));
const ToolLogistics = lazy(() => import('./pages/ToolLogistics'));
const Service       = lazy(() => import('./pages/Service'));
const ColabScience   = lazy(() => import('./pages/ColabScience'));
const ScienceDetail  = lazy(() => import('./pages/ScienceDetail'));
const NotFound       = lazy(() => import('./pages/NotFound'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const Terms          = lazy(() => import('./pages/Terms'));
const Privacy        = lazy(() => import('./pages/Privacy'));

/** 拦截浏览器/WebView 原生返回手势：非首页 → 回首页；首页 → 自然退出 */
function SwipeBack() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // 每个页面都推哨兵，让浏览器有地方可以返回，从而触发 popstate
    window.history.pushState(null, '');

    const tryClose = () => {
      try { (window as any).WeixinJSBridge?.call('closeWindow'); } catch {}
      try { window.close(); } catch {}
      // 关闭失败时重推哨兵，确保用户留在首页而不是退到上一个非首页
      window.history.pushState(null, '');
    };

    const onPopState = () => {
      window.dispatchEvent(new Event('close-menu'));
      if (pathname === '/') {
        tryClose();
      } else {
        navigate('/');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [pathname, navigate]);

  return null;
}

function AiChatConditional() {
  const { pathname } = useLocation();
  if (pathname !== '/') return null;
  return <AiChat />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <LocaleProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen bg-stone-50">
              <OfflineBanner />
              <SwipeBack />
              <Nav />
              <main className="flex-1 pt-12 md:pt-16 md:pl-52">
                <Breadcrumb />
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                  </div>
                }>
                <Routes>
                  <Route path="/"               element={<Home />} />
                  <Route path="/login"          element={<Login />} />
                  <Route path="/register"       element={<Register />} />
                  <Route path="/community"      element={<Community />} />
                  <Route path="/post/:id"       element={<PostDetail />} />
                  <Route path="/colab"          element={<CoLab />} />
                  <Route path="/colab/:id"      element={<ColabDetail />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/leaderboard"    element={<Leaderboard />} />
                  <Route path="/friends"        element={<Friends />} />
                  <Route path="/chat"           element={<Chat />} />
                  <Route path="/admin"          element={<Admin />} />
                  <Route path="/ledger"         element={<Ledger />} />
                  <Route path="/recharge"       element={<Recharge />} />
                  <Route path="/tools"          element={<Tools />} />
                  <Route path="/tools/copywriter" element={<ToolCopywriter />} />
                  <Route path="/tools/profit"     element={<ToolProfit />} />
                  <Route path="/tools/logistics"  element={<ToolLogistics />} />
                  <Route path="/service"          element={<Service />} />
                  <Route path="/colab-science"    element={<ColabScience />} />
                  <Route path="/science/:id"        element={<ScienceDetail />} />
                  <Route path="/forgot-password"    element={<ForgotPassword />} />
                  <Route path="/reset-password"     element={<ResetPassword />} />
                  <Route path="/terms"              element={<Terms />} />
                  <Route path="/privacy"            element={<Privacy />} />
                  <Route path="*"                   element={<NotFound />} />
                </Routes>
                </Suspense>
              </main>
              <AiChatConditional />
              <Footer />
              <Toaster richColors position="top-center" closeButton />
            </div>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </LocaleProvider>
    </ErrorBoundary>
  );
}

