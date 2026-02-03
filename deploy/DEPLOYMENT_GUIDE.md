# 测试用例生成器 - 腾讯云部署完全指南

本文档提供了将测试用例生成器系统部署到腾讯云服务器的完整步骤。即使您是初学者，按照本指南也能顺利完成部署。

---

## 目录

1. [准备工作](#1-准备工作)
2. [购买腾讯云服务器](#2-购买腾讯云服务器)
3. [购买腾讯云数据库](#3-购买腾讯云数据库)
4. [连接服务器](#4-连接服务器)
5. [安装运行环境](#5-安装运行环境)
6. [上传项目代码](#6-上传项目代码)
7. [配置环境变量](#7-配置环境变量)
8. [构建和启动应用](#8-构建和启动应用)
9. [配置Nginx反向代理](#9-配置nginx反向代理)
10. [配置SSL证书](#10-配置ssl证书)
11. [配置域名解析](#11-配置域名解析)
12. [日常维护命令](#12-日常维护命令)
13. [常见问题排查](#13-常见问题排查)

---

## 1. 准备工作

在开始部署之前，请确保您已准备好以下内容：

| 准备项 | 说明 | 是否必须 |
|--------|------|----------|
| 腾讯云账号 | 用于购买服务器和数据库 | 是 |
| 域名 | 用于访问网站（可使用IP直接访问） | 否 |
| SSH客户端 | Windows推荐使用 [MobaXterm](https://mobaxterm.mobatek.net/) 或 [Xshell](https://www.xshell.com/) | 是 |
| 项目代码 | 从当前项目下载的完整代码包 | 是 |

---

## 2. 购买腾讯云服务器

### 2.1 登录腾讯云控制台

打开浏览器访问 [腾讯云官网](https://cloud.tencent.com/)，使用您的账号登录。

### 2.2 购买云服务器

**第一步：进入云服务器页面**

登录后，点击顶部导航栏的「产品」→「计算」→「云服务器 CVM」，然后点击「立即选购」。

**第二步：选择配置**

推荐配置如下表所示：

| 配置项 | 推荐选择 | 说明 |
|--------|----------|------|
| 计费模式 | 包年包月 | 长期使用更划算 |
| 地域 | 广州/上海/北京 | 选择离用户最近的地域 |
| 实例类型 | 标准型 S5 | 性价比高 |
| CPU | 2核 | 最低要求 |
| 内存 | 4GB | 最低要求 |
| 操作系统 | Ubuntu 22.04 LTS 64位 | 本教程基于此系统 |
| 系统盘 | 高性能云硬盘 50GB | 存储代码和日志 |
| 公网带宽 | 按带宽计费 5Mbps | 根据访问量调整 |

**第三步：设置安全组**

在「安全组」配置中，选择「新建安全组」，并开放以下端口：

| 端口 | 协议 | 用途 |
|------|------|------|
| 22 | TCP | SSH远程连接 |
| 80 | TCP | HTTP访问 |
| 443 | TCP | HTTPS访问 |
| 3306 | TCP | MySQL数据库（如果使用本地数据库） |

**第四步：设置登录密码**

在「登录方式」中选择「设置密码」，设置一个强密码（包含大小写字母、数字和特殊字符）。请务必记住此密码，后续连接服务器时需要使用。

**第五步：完成购买**

确认配置无误后，点击「立即购买」完成支付。

### 2.3 获取服务器信息

购买完成后，进入「云服务器」→「实例」页面，记录以下信息：

- **公网IP地址**：例如 `119.29.xxx.xxx`
- **内网IP地址**：例如 `10.0.xxx.xxx`

---

## 3. 购买腾讯云数据库

您可以选择以下两种方式之一：

### 方式一：购买腾讯云MySQL（推荐）

**优点**：免运维、自动备份、高可用

**第一步：进入数据库页面**

在腾讯云控制台，点击「产品」→「数据库」→「云数据库 MySQL」→「立即选购」。

**第二步：选择配置**

| 配置项 | 推荐选择 |
|--------|----------|
| 数据库版本 | MySQL 8.0 |
| 实例规格 | 1核2GB（入门配置） |
| 硬盘 | 50GB |
| 地域 | 与云服务器相同 |
| 网络 | 与云服务器相同的VPC |

**第三步：设置数据库账号**

- 设置 root 密码
- 记录数据库内网地址（例如：`cdb-xxxxxx.cd.tencentcdb.com`）

**第四步：创建数据库**

购买完成后，进入数据库管理页面：
1. 点击「数据库管理」→「新建数据库」
2. 数据库名称填写：`testcase_generator`
3. 字符集选择：`utf8mb4`

### 方式二：在云服务器上自建MySQL

如果您想节省成本，可以在云服务器上自行安装MySQL。安装步骤将在后续章节中说明。

---

## 4. 连接服务器

### 4.1 Windows用户

**使用MobaXterm连接（推荐）**

1. 下载并安装 [MobaXterm](https://mobaxterm.mobatek.net/download.html)
2. 打开MobaXterm，点击「Session」→「SSH」
3. 填写连接信息：
   - Remote host：填写您的服务器公网IP
   - Username：`root`
   - Port：`22`
4. 点击「OK」，输入密码后即可连接

**使用Windows Terminal连接**

打开Windows Terminal或PowerShell，执行：

```bash
ssh root@您的服务器IP
```

输入密码后即可连接。

### 4.2 Mac/Linux用户

打开终端，执行：

```bash
ssh root@您的服务器IP
```

首次连接会提示确认指纹，输入 `yes` 后输入密码即可。

### 4.3 验证连接成功

连接成功后，您会看到类似以下的提示：

```
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)
root@VM-0-1-ubuntu:~#
```

---

## 5. 安装运行环境

连接服务器后，按照以下步骤安装必要的软件。

### 5.1 更新系统

```bash
# 更新软件包列表
apt update

# 升级已安装的软件包
apt upgrade -y
```

### 5.2 安装基础工具

```bash
apt install -y curl wget git build-essential unzip
```

### 5.3 安装Node.js 22.x

```bash
# 添加NodeSource仓库
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

# 安装Node.js
apt install -y nodejs

# 验证安装
node -v  # 应显示 v22.x.x
npm -v   # 应显示 10.x.x
```

### 5.4 安装pnpm包管理器

```bash
# 安装pnpm
npm install -g pnpm

# 验证安装
pnpm -v  # 应显示 9.x.x 或更高
```

### 5.5 安装PM2进程管理器

```bash
# 安装PM2
npm install -g pm2

# 验证安装
pm2 -v  # 应显示 5.x.x

# 设置PM2开机自启
pm2 startup systemd -u root --hp /root
```

### 5.6 安装Nginx

```bash
# 安装Nginx
apt install -y nginx

# 启动Nginx
systemctl start nginx

# 设置开机自启
systemctl enable nginx

# 验证Nginx运行状态
systemctl status nginx
```

此时在浏览器中访问 `http://您的服务器IP`，应该能看到Nginx的欢迎页面。

### 5.7 安装MySQL（可选）

如果您选择在服务器上自建MySQL而不是使用腾讯云数据库：

```bash
# 安装MySQL 8.0
apt install -y mysql-server

# 启动MySQL
systemctl start mysql
systemctl enable mysql

# 运行安全配置向导
mysql_secure_installation
```

安全配置向导会询问以下问题：

| 问题 | 推荐回答 |
|------|----------|
| 设置root密码 | 输入一个强密码 |
| 移除匿名用户 | Y |
| 禁止root远程登录 | N（如果需要远程连接选N） |
| 移除测试数据库 | Y |
| 重新加载权限表 | Y |

**创建数据库：**

```bash
# 登录MySQL
mysql -u root -p

# 在MySQL命令行中执行：
CREATE DATABASE testcase_generator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 如果需要远程访问，创建允许远程连接的用户
CREATE USER 'testcase'@'%' IDENTIFIED BY '您的密码';
GRANT ALL PRIVILEGES ON testcase_generator.* TO 'testcase'@'%';
FLUSH PRIVILEGES;

# 退出MySQL
EXIT;
```

---

## 6. 上传项目代码

### 6.1 创建应用目录

```bash
# 创建应用目录
mkdir -p /var/www/testcase-generator

# 进入目录
cd /var/www/testcase-generator
```

### 6.2 上传代码

**方式一：使用Git克隆（推荐）**

如果您的代码托管在GitHub或其他Git仓库：

```bash
git clone https://github.com/您的用户名/testcase-generator.git .
```

**方式二：使用SFTP上传**

1. 在MobaXterm中，连接服务器后左侧会显示文件浏览器
2. 导航到 `/var/www/testcase-generator`
3. 将本地项目文件拖拽到此目录

**方式三：使用scp命令上传**

在本地终端执行：

```bash
# 先将项目打包
cd 项目目录
zip -r testcase-generator.zip .

# 上传到服务器
scp testcase-generator.zip root@服务器IP:/var/www/

# 在服务器上解压
ssh root@服务器IP
cd /var/www
unzip testcase-generator.zip -d testcase-generator
```

### 6.3 验证代码上传

```bash
cd /var/www/testcase-generator
ls -la
```

应该能看到 `package.json`、`server`、`client` 等目录和文件。

---

## 7. 配置环境变量

### 7.1 复制环境变量模板

```bash
cd /var/www/testcase-generator
cp deploy/env.template .env
```

### 7.2 编辑环境变量

```bash
nano .env
```

按照以下说明修改配置：

```bash
# ============================================
# 数据库配置（必须修改）
# ============================================
# 如果使用腾讯云MySQL：
DATABASE_URL=mysql://root:您的密码@cdb-xxxxxx.cd.tencentcdb.com:3306/testcase_generator

# 如果使用本地MySQL：
DATABASE_URL=mysql://root:您的密码@localhost:3306/testcase_generator

# ============================================
# JWT配置（必须修改）
# ============================================
# 生成随机密钥的命令：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=粘贴生成的随机字符串

# ============================================
# 其他配置保持默认即可
# ============================================
PORT=3000
NODE_ENV=production
ENABLE_OAUTH=false
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
VITE_APP_TITLE=测试用例生成器
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**生成JWT密钥：**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的字符串，粘贴到 `.env` 文件的 `JWT_SECRET=` 后面。

**保存并退出：**
- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

### 7.3 设置文件权限

```bash
# 确保.env文件只有root可读
chmod 600 .env
```

---

## 8. 构建和启动应用

### 8.1 安装项目依赖

```bash
cd /var/www/testcase-generator

# 安装依赖
pnpm install
```

等待安装完成，可能需要几分钟时间。

### 8.2 构建生产版本

```bash
pnpm build
```

构建成功后会生成 `dist` 目录。

### 8.3 初始化数据库

```bash
# 推送数据库结构
pnpm db:push
```

如果提示需要确认，输入 `y` 确认。

### 8.4 创建必要目录

```bash
# 创建上传目录
mkdir -p uploads

# 创建日志目录
mkdir -p logs

# 设置权限
chmod 755 uploads logs
```

### 8.5 使用PM2启动应用

```bash
# 启动应用
pm2 start deploy/ecosystem.config.cjs

# 保存PM2配置（确保重启后自动恢复）
pm2 save
```

### 8.6 验证应用运行

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs testcase-generator
```

此时在浏览器中访问 `http://您的服务器IP:3000`，应该能看到登录页面。

---

## 9. 配置Nginx反向代理

### 9.1 创建Nginx配置文件

```bash
# 复制配置文件
cp /var/www/testcase-generator/deploy/nginx.conf /etc/nginx/sites-available/testcase-generator
```

### 9.2 编辑配置文件

```bash
nano /etc/nginx/sites-available/testcase-generator
```

**如果暂时没有域名和SSL证书**，将文件内容替换为以下简化配置：

```nginx
upstream testcase_generator {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    
    # 如果有域名，替换为您的域名；没有则使用下划线
    server_name _;
    
    access_log /var/log/nginx/testcase-generator.access.log;
    error_log /var/log/nginx/testcase-generator.error.log;
    
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://testcase_generator;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

保存并退出。

### 9.3 启用配置

```bash
# 创建软链接启用配置
ln -s /etc/nginx/sites-available/testcase-generator /etc/nginx/sites-enabled/

# 删除默认配置（可选）
rm /etc/nginx/sites-enabled/default

# 测试配置是否正确
nginx -t

# 重新加载Nginx
systemctl reload nginx
```

### 9.4 验证配置

在浏览器中访问 `http://您的服务器IP`（不带端口号），应该能看到登录页面。

---

## 10. 配置SSL证书

### 10.1 申请免费SSL证书

**方式一：腾讯云免费证书**

1. 登录腾讯云控制台
2. 进入「SSL证书」→「我的证书」→「申请免费证书」
3. 填写域名信息，完成域名验证
4. 下载证书（选择Nginx格式）

**方式二：使用Let's Encrypt（推荐）**

```bash
# 安装Certbot
apt install -y certbot python3-certbot-nginx

# 申请证书（替换为您的域名）
certbot --nginx -d your-domain.com -d www.your-domain.com

# 按提示操作，输入邮箱等信息
```

Certbot会自动修改Nginx配置并配置证书自动续期。

### 10.2 手动配置SSL证书

如果使用腾讯云下载的证书：

```bash
# 创建证书目录
mkdir -p /etc/nginx/ssl

# 上传证书文件到 /etc/nginx/ssl/
# your-domain.com.pem（证书文件）
# your-domain.com.key（私钥文件）

# 修改Nginx配置
nano /etc/nginx/sites-available/testcase-generator
```

将配置文件替换为 `deploy/nginx.conf` 中的完整HTTPS配置，并修改：
- `server_name` 为您的域名
- `ssl_certificate` 和 `ssl_certificate_key` 为证书路径

```bash
# 测试并重载配置
nginx -t
systemctl reload nginx
```

---

## 11. 配置域名解析

### 11.1 添加DNS解析记录

1. 登录您的域名管理平台（如腾讯云DNSPod）
2. 添加以下解析记录：

| 主机记录 | 记录类型 | 记录值 |
|----------|----------|--------|
| @ | A | 您的服务器IP |
| www | A | 您的服务器IP |

### 11.2 等待解析生效

DNS解析通常需要几分钟到几小时生效。可以使用以下命令检查：

```bash
ping your-domain.com
```

当返回您的服务器IP时，说明解析已生效。

---

## 12. 日常维护命令

### 12.1 应用管理

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs testcase-generator

# 重启应用
pm2 restart testcase-generator

# 停止应用
pm2 stop testcase-generator

# 启动应用
pm2 start testcase-generator

# 重载应用（零停机重启）
pm2 reload testcase-generator
```

### 12.2 更新代码

```bash
cd /var/www/testcase-generator

# 如果使用Git
git pull origin main

# 重新安装依赖（如果package.json有变化）
pnpm install

# 重新构建
pnpm build

# 重载应用
pm2 reload testcase-generator
```

### 12.3 查看日志

```bash
# 查看应用日志
pm2 logs testcase-generator

# 查看Nginx访问日志
tail -f /var/log/nginx/testcase-generator.access.log

# 查看Nginx错误日志
tail -f /var/log/nginx/testcase-generator.error.log
```

### 12.4 数据库备份

```bash
# 备份数据库
mysqldump -u root -p testcase_generator > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p testcase_generator < backup_20240101.sql
```

---

## 13. 常见问题排查

### 问题1：无法连接数据库

**错误信息**：`Error: connect ECONNREFUSED`

**解决方案**：

1. 检查数据库是否运行：
   ```bash
   systemctl status mysql
   ```

2. 检查数据库连接字符串是否正确：
   ```bash
   cat /var/www/testcase-generator/.env | grep DATABASE_URL
   ```

3. 如果使用腾讯云数据库，检查安全组是否开放3306端口

### 问题2：应用启动失败

**错误信息**：`Error: Cannot find module`

**解决方案**：

```bash
cd /var/www/testcase-generator
rm -rf node_modules
pnpm install
pnpm build
pm2 restart testcase-generator
```

### 问题3：Nginx返回502错误

**解决方案**：

1. 检查应用是否运行：
   ```bash
   pm2 status
   ```

2. 检查应用端口是否正确：
   ```bash
   netstat -tlnp | grep 3000
   ```

3. 查看应用日志：
   ```bash
   pm2 logs testcase-generator --lines 50
   ```

### 问题4：上传文件失败

**解决方案**：

1. 检查上传目录权限：
   ```bash
   ls -la /var/www/testcase-generator/uploads
   chmod 755 /var/www/testcase-generator/uploads
   ```

2. 检查Nginx上传大小限制：
   确保 `client_max_body_size` 设置足够大

### 问题5：AI功能无法使用

**解决方案**：

由于腾讯云部署不包含Manus内置AI服务，您需要：

1. 登录系统后进入「AI模型管理」页面
2. 添加自定义AI模型（如DeepSeek、OpenAI等）
3. 填写API地址和API Key
4. 设置为默认模型

---

## 附录：快速部署命令汇总

以下是完整部署流程的命令汇总，可以直接复制执行：

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装依赖
apt install -y curl wget git build-essential unzip nginx

# 3. 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 4. 安装pnpm和PM2
npm install -g pnpm pm2
pm2 startup systemd -u root --hp /root

# 5. 创建应用目录
mkdir -p /var/www/testcase-generator
cd /var/www/testcase-generator

# 6. 上传代码后执行
pnpm install
cp deploy/env.template .env
nano .env  # 编辑配置
pnpm build
pnpm db:push
mkdir -p uploads logs

# 7. 启动应用
pm2 start deploy/ecosystem.config.cjs
pm2 save

# 8. 配置Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/testcase-generator
ln -s /etc/nginx/sites-available/testcase-generator /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

**部署完成后，使用以下账号登录系统：**

- **用户名**：admin
- **密码**：admin123

建议首次登录后立即修改管理员密码。

---

*本文档由 Manus AI 生成，如有问题请联系技术支持。*
