#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  灵创社区平台 — Ubuntu 一键部署脚本
#  支持系统：Ubuntu 20.04 / 22.04 / 24.04
#  用法：chmod +x deploy.sh && sudo ./deploy.sh
# ═══════════════════════════════════════════════════════════════
set -e

# ── 颜色输出 ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET} $1"; }
success() { echo -e "${GREEN}[OK]${RESET}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $1"; }
error()   { echo -e "${RED}[ERR]${RESET}  $1"; exit 1; }

echo -e "\n${BOLD}════════════════════════════════════════${RESET}"
echo -e "${BOLD}   灵创社区平台 · Ubuntu 部署向导${RESET}"
echo -e "${BOLD}════════════════════════════════════════${RESET}\n"

# ── 必须 root 或 sudo ─────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "请使用 sudo 运行：sudo ./deploy.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
GNN_DIR="$SCRIPT_DIR/gnn"

# ══════════════════════════════════════════════════════════════
# 1. 收集配置参数
# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}【第一步】配置参数${RESET}"

read -rp "$(echo -e ${CYAN}"DASHSCOPE_API_KEY (阿里云灵积 API Key): "${RESET})" DASHSCOPE_KEY
[[ -z "$DASHSCOPE_KEY" ]] && error "DASHSCOPE_API_KEY 不能为空"

read -rp "$(echo -e ${CYAN}"服务端口 [默认 3001]: "${RESET})" PORT_INPUT
PORT="${PORT_INPUT:-3001}"

read -rp "$(echo -e ${CYAN}"你的服务器域名或 IP（例如 example.com 或 123.45.67.89）: "${RESET})" SERVER_HOST

read -rp "$(echo -e ${CYAN}"是否安装 nginx 并配置反向代理？(y/n) [默认 y]: "${RESET})" NGINX_INPUT
INSTALL_NGINX="${NGINX_INPUT:-y}"

read -rp "$(echo -e ${CYAN}"是否安装 GNN 训练依赖（PyTorch，约 1.5 GB，可跳过）？(y/n) [默认 n]: "${RESET})" GNN_INPUT
INSTALL_GNN="${GNN_INPUT:-n}"

# 自动生成强 JWT Secret
JWT_SECRET=$(openssl rand -hex 32)
success "JWT_SECRET 已自动生成（64 位随机字符串）"

echo ""

# ══════════════════════════════════════════════════════════════
# 2. 安装系统依赖
# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}【第二步】安装系统依赖${RESET}"

apt-get update -qq
apt-get install -y -qq curl git build-essential python3 python3-pip openssl
success "系统基础依赖安装完成"

# ── Node.js 20 ────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v | sed 's/v//;s/\..*//') -lt 18 ]]; then
  info "安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
  success "Node.js $(node -v) 安装完成"
else
  success "Node.js 已存在：$(node -v)"
fi

# ── PM2 ──────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "安装 PM2..."
  npm install -g pm2 --silent
  success "PM2 安装完成"
else
  success "PM2 已存在：$(pm2 -v)"
fi

# ── nginx（可选）─────────────────────────────────────────────
if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" ]]; then
  apt-get install -y -qq nginx
  success "nginx 安装完成"
fi

# ── Python GNN 依赖（可选）───────────────────────────────────
if [[ "$INSTALL_GNN" == "y" || "$INSTALL_GNN" == "Y" ]]; then
  info "安装 PyTorch（CPU 版）和 torch-geometric，请稍候..."
  python3 -m venv "$GNN_DIR/.venv"
  "$GNN_DIR/.venv/bin/pip" install --quiet --upgrade pip
  "$GNN_DIR/.venv/bin/pip" install --quiet torch --index-url https://download.pytorch.org/whl/cpu
  "$GNN_DIR/.venv/bin/pip" install --quiet torch-geometric
  "$GNN_DIR/.venv/bin/pip" install --quiet -r "$GNN_DIR/requirements.txt"
  success "GNN Python 依赖安装完成（venv: $GNN_DIR/.venv）"
else
  warn "已跳过 GNN 依赖。管理员「训练推荐」功能将不可用，其余功能正常。"
fi

echo ""

# ══════════════════════════════════════════════════════════════
# 3. 写入后端 .env
# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}【第三步】生成后端 .env${RESET}"

cat > "$BACKEND_DIR/.env" <<EOF
PORT=$PORT
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
DB_PATH=./data/lingjing.db
DASHSCOPE_API_KEY=$DASHSCOPE_KEY
FRONTEND_URL=http://$SERVER_HOST
EOF

success ".env 已写入 $BACKEND_DIR/.env"
echo ""

# ══════════════════════════════════════════════════════════════
# 4. 安装依赖 & 构建
# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}【第四步】安装 npm 依赖并构建${RESET}"

info "安装前端依赖..."
cd "$FRONTEND_DIR" && npm install --silent
info "构建前端..."
npm run build
success "前端构建完成 → frontend/dist/"

info "安装后端依赖..."
cd "$BACKEND_DIR" && npm install --silent
info "编译后端 TypeScript..."
npm run build
success "后端编译完成 → backend/dist/"

echo ""

# ══════════════════════════════════════════════════════════════
# 5. 创建数据库目录并初始化
# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}【第五步】初始化数据库${RESET}"
mkdir -p "$BACKEND_DIR/data"
success "数据库目录已就绪：$BACKEND_DIR/data/"
echo ""

# ══════════════════════════════════════════════════════════════
# 6. 用 PM2 启动后端
# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}【第六步】启动服务${RESET}"

cd "$SCRIPT_DIR"
mkdir -p "$BACKEND_DIR/logs"
pm2 delete ecosystem.config.js 2>/dev/null || true
pm2 start ecosystem.config.js

pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash  # 开机自启
success "PM2 服务已启动，进程名：app-backend"
pm2 list
echo ""

# ══════════════════════════════════════════════════════════════
# 7. nginx 反向代理（可选）
# ══════════════════════════════════════════════════════════════
if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" ]]; then
  echo -e "${BOLD}【第七步】配置 nginx 反向代理${RESET}"

  NGINX_CONF="/etc/nginx/sites-available/app-template"
  cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name $SERVER_HOST;

    # 上传大小限制（头像等）
    client_max_body_size 10m;

    # 反向代理 Node.js 后端（包含 WebSocket）
    location / {
        proxy_pass         http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;   # SSE 流式响应不超时
        proxy_send_timeout 300s;
    }
}
NGINX

  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/app-template
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  success "nginx 配置完成，监听 http://$SERVER_HOST"
fi

# ══════════════════════════════════════════════════════════════
# 完成
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}   部署成功！${RESET}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo ""
if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" ]]; then
  echo -e "  访问地址：${BOLD}http://$SERVER_HOST${RESET}"
else
  echo -e "  访问地址：${BOLD}http://$SERVER_HOST:$PORT${RESET}"
fi
echo ""
echo -e "  常用命令："
echo -e "    pm2 logs app-backend      # 查看运行日志"
echo -e "    pm2 restart app-backend   # 重启服务"
echo -e "    pm2 stop app-backend      # 停止服务"
echo ""
warn "请妥善保管 .env 文件，其中包含 API Key 和 JWT 密钥，不要提交到 Git！"
echo ""
