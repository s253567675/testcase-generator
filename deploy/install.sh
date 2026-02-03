#!/bin/bash

# ============================================
# 测试用例生成器 - 腾讯云一键部署脚本
# ============================================
#
# 使用方法：
# chmod +x deploy/install.sh
# sudo ./deploy/install.sh
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 用户运行此脚本"
        print_info "使用命令: sudo ./deploy/install.sh"
        exit 1
    fi
}

# 检查操作系统
check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "无法检测操作系统版本"
        exit 1
    fi
    
    print_info "检测到操作系统: $OS $VER"
}

# 更新系统
update_system() {
    print_info "正在更新系统包..."
    apt-get update -y
    apt-get upgrade -y
    print_success "系统更新完成"
}

# 安装基础依赖
install_dependencies() {
    print_info "正在安装基础依赖..."
    apt-get install -y curl wget git build-essential
    print_success "基础依赖安装完成"
}

# 安装 Node.js
install_nodejs() {
    print_info "正在安装 Node.js 22.x..."
    
    # 检查是否已安装
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        print_warning "Node.js 已安装: $NODE_VER"
        read -p "是否重新安装? (y/n): " reinstall
        if [ "$reinstall" != "y" ]; then
            return
        fi
    fi
    
    # 使用 NodeSource 安装
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    
    # 验证安装
    NODE_VER=$(node -v)
    NPM_VER=$(npm -v)
    print_success "Node.js 安装完成: $NODE_VER, npm: $NPM_VER"
}

# 安装 pnpm
install_pnpm() {
    print_info "正在安装 pnpm..."
    npm install -g pnpm
    PNPM_VER=$(pnpm -v)
    print_success "pnpm 安装完成: $PNPM_VER"
}

# 安装 PM2
install_pm2() {
    print_info "正在安装 PM2..."
    npm install -g pm2
    PM2_VER=$(pm2 -v)
    print_success "PM2 安装完成: $PM2_VER"
    
    # 设置 PM2 开机自启
    pm2 startup systemd -u root --hp /root
}

# 安装 Nginx
install_nginx() {
    print_info "正在安装 Nginx..."
    apt-get install -y nginx
    
    # 启动 Nginx
    systemctl start nginx
    systemctl enable nginx
    
    NGINX_VER=$(nginx -v 2>&1)
    print_success "Nginx 安装完成: $NGINX_VER"
}

# 安装 MySQL（可选）
install_mysql() {
    read -p "是否安装本地 MySQL 数据库? (y/n，如果使用腾讯云数据库请选 n): " install_db
    
    if [ "$install_db" = "y" ]; then
        print_info "正在安装 MySQL 8.0..."
        apt-get install -y mysql-server
        
        # 启动 MySQL
        systemctl start mysql
        systemctl enable mysql
        
        print_success "MySQL 安装完成"
        print_warning "请运行 'sudo mysql_secure_installation' 进行安全配置"
    else
        print_info "跳过 MySQL 安装"
    fi
}

# 创建应用目录
create_app_directory() {
    print_info "正在创建应用目录..."
    
    APP_DIR="/var/www/testcase-generator"
    
    if [ -d "$APP_DIR" ]; then
        print_warning "应用目录已存在: $APP_DIR"
        read -p "是否删除并重新创建? (y/n): " recreate
        if [ "$recreate" = "y" ]; then
            rm -rf "$APP_DIR"
        fi
    fi
    
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/uploads"
    mkdir -p "$APP_DIR/logs"
    
    print_success "应用目录创建完成: $APP_DIR"
}

# 配置防火墙
configure_firewall() {
    print_info "正在配置防火墙..."
    
    # 检查 ufw 是否安装
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 3000/tcp  # Node.js（可选，如果直接访问）
        
        # 如果防火墙未启用，提示用户
        if ! ufw status | grep -q "active"; then
            print_warning "防火墙未启用，建议运行: sudo ufw enable"
        fi
        
        print_success "防火墙配置完成"
    else
        print_warning "未检测到 ufw，跳过防火墙配置"
    fi
}

# 生成 JWT Secret
generate_jwt_secret() {
    JWT_SECRET=$(openssl rand -hex 32)
    echo "$JWT_SECRET"
}

# 创建环境变量文件
create_env_file() {
    print_info "正在创建环境变量配置..."
    
    APP_DIR="/var/www/testcase-generator"
    ENV_FILE="$APP_DIR/.env"
    
    if [ -f "$ENV_FILE" ]; then
        print_warning "环境变量文件已存在"
        read -p "是否覆盖? (y/n): " overwrite
        if [ "$overwrite" != "y" ]; then
            return
        fi
    fi
    
    # 收集配置信息
    echo ""
    print_info "请输入以下配置信息："
    echo ""
    
    # 数据库配置
    read -p "数据库主机地址 [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "数据库端口 [3306]: " DB_PORT
    DB_PORT=${DB_PORT:-3306}
    
    read -p "数据库用户名 [root]: " DB_USER
    DB_USER=${DB_USER:-root}
    
    read -sp "数据库密码: " DB_PASS
    echo ""
    
    read -p "数据库名称 [testcase_generator]: " DB_NAME
    DB_NAME=${DB_NAME:-testcase_generator}
    
    # 生成 JWT Secret
    JWT_SECRET=$(generate_jwt_secret)
    
    # 管理员账号
    read -p "管理员用户名 [admin]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    
    read -sp "管理员密码 [admin123]: " ADMIN_PASS
    ADMIN_PASS=${ADMIN_PASS:-admin123}
    echo ""
    
    # 写入环境变量文件
    cat > "$ENV_FILE" << EOF
# 数据库配置
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# JWT 配置
JWT_SECRET=${JWT_SECRET}

# 服务器配置
PORT=3000
NODE_ENV=production

# OAuth 配置（禁用）
ENABLE_OAUTH=false

# AI 服务配置（使用自定义模型）
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

# 文件存储配置
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads

# 应用信息
VITE_APP_TITLE=测试用例生成器
VITE_APP_LOGO=

# 管理员账号
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASS}

# 其他配置
OWNER_NAME=管理员
OWNER_OPEN_ID=
EOF
    
    chmod 600 "$ENV_FILE"
    print_success "环境变量文件创建完成: $ENV_FILE"
}

# 打印部署完成信息
print_completion() {
    echo ""
    echo "============================================"
    print_success "环境安装完成！"
    echo "============================================"
    echo ""
    print_info "已安装的组件："
    echo "  - Node.js $(node -v)"
    echo "  - pnpm $(pnpm -v)"
    echo "  - PM2 $(pm2 -v)"
    echo "  - Nginx"
    echo ""
    print_info "下一步操作："
    echo "  1. 将项目代码上传到 /var/www/testcase-generator"
    echo "  2. 进入项目目录: cd /var/www/testcase-generator"
    echo "  3. 安装依赖: pnpm install"
    echo "  4. 构建项目: pnpm build"
    echo "  5. 初始化数据库: pnpm db:push"
    echo "  6. 启动应用: pm2 start deploy/ecosystem.config.cjs"
    echo "  7. 配置 Nginx: sudo cp deploy/nginx.conf /etc/nginx/sites-available/testcase-generator"
    echo ""
    print_info "详细教程请查看: deploy/DEPLOYMENT_GUIDE.md"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "============================================"
    echo "  测试用例生成器 - 腾讯云部署脚本"
    echo "============================================"
    echo ""
    
    check_root
    check_os
    
    echo ""
    read -p "是否开始安装? (y/n): " start_install
    if [ "$start_install" != "y" ]; then
        print_info "安装已取消"
        exit 0
    fi
    
    update_system
    install_dependencies
    install_nodejs
    install_pnpm
    install_pm2
    install_nginx
    install_mysql
    create_app_directory
    configure_firewall
    create_env_file
    
    print_completion
}

# 运行主函数
main "$@"
