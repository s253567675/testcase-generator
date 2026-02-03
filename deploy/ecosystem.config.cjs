/**
 * PM2 配置文件
 * 用于生产环境进程管理
 * 
 * 使用方法：
 * pm2 start deploy/ecosystem.config.cjs
 * pm2 restart testcase-generator
 * pm2 stop testcase-generator
 * pm2 logs testcase-generator
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'testcase-generator',
      
      // 启动脚本
      script: 'dist/index.js',
      
      // 工作目录
      cwd: './',
      
      // 实例数量（cluster模式）
      // 'max' 表示使用所有CPU核心
      // 建议2核服务器设置为2，4核设置为4
      instances: 2,
      
      // 执行模式：cluster（集群）或 fork（单进程）
      exec_mode: 'cluster',
      
      // 自动重启
      autorestart: true,
      
      // 文件变化时自动重启（生产环境建议关闭）
      watch: false,
      
      // 最大内存限制，超过后自动重启
      max_memory_restart: '1G',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 开发环境变量
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      
      // 重启延迟（毫秒）
      restart_delay: 3000,
      
      // 最大重启次数（超过后停止重启）
      max_restarts: 10,
      
      // 优雅关闭超时时间（毫秒）
      kill_timeout: 5000,
      
      // 等待应用就绪的时间（毫秒）
      wait_ready: true,
      listen_timeout: 10000
    }
  ],
  
  // 部署配置（可选，用于远程部署）
  deploy: {
    production: {
      // SSH 用户
      user: 'root',
      
      // 服务器地址（替换为您的腾讯云服务器IP）
      host: ['your-server-ip'],
      
      // SSH 端口
      port: '22',
      
      // Git 仓库地址
      ref: 'origin/main',
      repo: 'git@github.com:your-username/testcase-generator.git',
      
      // 部署路径
      path: '/var/www/testcase-generator',
      
      // 部署后执行的命令
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
      
      // 部署前执行的命令
      'pre-deploy-local': 'echo "准备部署到生产环境"'
    }
  }
};
