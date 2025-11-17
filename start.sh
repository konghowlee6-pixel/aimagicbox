#!/bin/bash
# AI MagicBox Startup Script

# Load environment variables
export DATABASE_URL="postgresql://aimagicbox_user:aimagicbox_pass@localhost:5432/aimagicbox"
export SESSION_SECRET="aimagicbox-production-secret-$(date +%s)"
export RUNWARE_API_KEY="nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO"
export GEMINI_API_KEY="AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8"
export NODE_ENV="production"

# Navigate to project directory
cd /home/ubuntu/aimagicbox

# Ensure PostgreSQL is running
sudo service postgresql start

# Start the application
npm start
