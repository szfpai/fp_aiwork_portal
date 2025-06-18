# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装git
RUN apk add --no-cache git

COPY . .

RUN npm install -g pnpm \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @vben/web-antd... run build

# 生产环境镜像
FROM nginx:1.25-alpine

# 拷贝构建好的前端资源到nginx默认静态目录
COPY --from=builder /app/apps/web-antd/dist /usr/share/nginx/html

# 可选：自定义nginx配置（如有需要可取消注释并提供nginx.conf）
# COPY nginx.conf /etc/nginx/nginx.conf
COPY fp_workportal.conf /etc/nginx/conf.d/fp_workportal.conf

WORKDIR /usr/share/nginx/html

EXPOSE 8090

CMD ["nginx", "-g", "daemon off;"] 