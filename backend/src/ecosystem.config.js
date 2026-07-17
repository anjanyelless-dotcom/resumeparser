module.exports = {
  apps: [
    {
      name: 'resume-parser-backend',
      script: './dist/server.js',
      instances: 1, // Single instance for 2GB RAM constraint
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
      shutdown_with_message: true
    }
  ],
  deploy: {
    production: {
      user: 'root',
      host: 'your-digitalocean-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/Lakshya-LLM-Resume-Parser.git',
      path: '/var/www/resume-parser',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git'
    }
  }
};