# ============================================
# Dockerfile - 测试用例生成器
# ============================================
# 
# 构建镜像：
# docker build -f deploy/Dockerfile -t testcase-generator .
#
# 运行容器：
# docker run -d -p 3000:3000 --env-file .env --name testcase-generator testcase-generator
#

# ============================================
# 阶段1：构建阶段
# ============================================
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# ============================================
# 阶段2：生产阶段
# ============================================
FROM node:22-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 复制 package.json
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# 创建上传目录
RUN mkdir -p uploads logs

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# 设置目录权限
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/trpc/auth.me || exit 1

# 启动命令
CMD ["node", "dist/index.js"]
