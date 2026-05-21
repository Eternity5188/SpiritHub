import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-8xl font-black text-slate-100 select-none mb-2">404</div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">页面不存在</h1>
      <p className="text-slate-500 text-sm mb-8 max-w-xs">
        您访问的页面已被移动或删除，请检查链接是否正确。
      </p>
      <div className="flex gap-3">
        <button onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回上页
        </button>
        <Link to="/"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
          <Home className="w-4 h-4" /> 回到首页
        </Link>
      </div>
    </div>
  );
}
