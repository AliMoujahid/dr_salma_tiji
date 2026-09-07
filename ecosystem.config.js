module.exports = {
  apps: [
    {
      name: 'cabinet-dr-salma-tijini',
      script: './backend/dist/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './Sauvegardes_Cabinet/logs/pm2-error.log',
      out_file: './Sauvegardes_Cabinet/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
