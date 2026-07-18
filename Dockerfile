# ── 基础镜像 ─────────────────────────────────────────────────────
FROM node:18-alpine

# 设置时区
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

WORKDIR /app

# 先复制 package.json，利用层缓存
COPY package.json ./
RUN npm install --production

# 复制项目源文件
COPY . .

# 确保运行时目录存在
RUN mkdir -p /app/data /app/photos

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/members > /dev/null || exit 1
CMD ["node", "server.js"]
