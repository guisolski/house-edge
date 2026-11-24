# Optional secondary deploy path. Prefer GitHub Pages (see docs/deployment.md).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ || exit 1
