// PM2 进程管理配置 — 示例平台
// 用法:
//   pm2 start ecosystem.config.js       # 启动全部
//   pm2 restart ecosystem.config.js     # 重启全部
//   pm2 stop ecosystem.config.js        # 停止全部
//   pm2 delete ecosystem.config.js      # 删除全部进程
//   pm2 logs                            # 查看日志
//   pm2 monit                           # 进程监控面板

module.exports = {
  apps: [
    {
      // ── 后端 API 服务 ─────────────────────────────
      name: 'app-backend',
      script: './backend/dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
      log_file: './backend/logs/app.log',
      error_file: './backend/logs/error.log',
      out_file: './backend/logs/out.log',
      time: true,
    },
  ],
};
