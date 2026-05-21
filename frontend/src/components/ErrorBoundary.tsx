import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 生产环境不打印完整堆栈到控制台
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    } else {
      console.error('[ErrorBoundary]', error.message);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-800 mb-2">页面出现异常</h2>
          <p className="text-stone-500 text-sm mb-6">
            抱歉，页面遇到了一个意外错误。您可以尝试刷新页面或返回首页。
          </p>
          {this.state.error && import.meta.env.DEV && (
            <pre className="text-xs text-left bg-stone-100 rounded-lg p-3 mb-6 overflow-auto max-h-32 text-stone-600">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700"
            >
              <RefreshCw className="w-4 h-4" />刷新页面
            </button>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="px-4 py-2 border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }
}
