FROM php:8.2-cli

WORKDIR /app

# Copy all project files
COPY . .

# Expose port
EXPOSE 10000

# Start PHP built-in server
CMD php -S 0.0.0.0:${PORT:-10000} router.php
