#!/bin/bash
# Cleanup Expired Visuals - Cron Job Script
# Run this daily at midnight to delete visuals older than 60 days

cd /home/ubuntu/aimagicbox
node -r ts-node/register server/cleanup-expired-visuals.ts >> /home/ubuntu/aimagicbox/logs/cleanup.log 2>&1
