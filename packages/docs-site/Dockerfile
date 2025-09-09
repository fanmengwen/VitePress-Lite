# Production stage with Nginx
FROM nginx:alpine as production

# Copy custom nginx server config
COPY packages/docs-site/nginx.conf /etc/nginx/conf.d/default.conf

# Copy pre-built files
COPY packages/docs-site/dist/ /usr/share/nginx/html/

# Create nginx pid directory
RUN mkdir -p /var/run/nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
