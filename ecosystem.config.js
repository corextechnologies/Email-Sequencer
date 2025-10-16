module.exports = {
  apps: [
    {
      name: 'email-sequencer-api',
      script: 'dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3007
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3007
      },
      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      
      // Environment variables
      env_file: '.env.production'
    },
    {
      name: 'email-sequencer-worker',
      script: 'dist/workers/sequencer.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Process management
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,
      
      // Logging
      log_file: './logs/worker-combined.log',
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Environment variables
      env_file: '.env.production'
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/Email-Sequencer.git',
      path: '/var/www/email-sequencer',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
