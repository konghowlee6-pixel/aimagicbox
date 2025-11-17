module.exports = {
  apps: [{
    name: 'aimagicbox',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    cwd: '/home/ubuntu/aimagicbox',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://aimagicbox_user:aimagicbox_pass@localhost:5432/aimagicbox',
      SESSION_SECRET: 'development-secret-key-change-in-production',
      RUNWARE_API_KEY: 'nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO',
      GEMINI_API_KEY: 'AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8',
      JWT_SECRET: 'aimagicbox-super-secret-jwt-key-2024',
      SMTP_HOST: 'mail.arriival.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'careteam@arriival.com',
      SMTP_PASS: 'Lin!!8899!@#!@#',
      SMTP_FROM: 'careteam@arriival.com',
      SMTP_FROM_NAME: 'AI MagicBox',
      APP_URL: 'https://5000-ikgm2xsg0rj9mun4a6zsm-7b54f699.manus-asia.computer',
      PRIVATE_OBJECT_DIR: '/home/ubuntu/aimagicbox/uploads'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/aimagicbox/logs/error.log',
    out_file: '/home/ubuntu/aimagicbox/logs/out.log',
    log_file: '/home/ubuntu/aimagicbox/logs/combined.log',
    time: true
  }]
};
