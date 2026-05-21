import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium py-2 px-4 shadow-md">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      网络已断开，部分功能暂时不可用，请检查您的网络连接
    </div>
  );
}
