# -------- deps --------
  FROM node:24-alpine AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci && npm cache clean --force
  # npm ci:
  #  Cài đúng 100% theo package-lock.json
  #  Xóa node_modules cũ rồi cài lại từ đầu
  #  Nhanh hơn, ổn định hơn
  #  Không update version linh tinh

  # Xóa cache của npm
  # Tránh cache bị lỗi (corrupt)
  # Đảm bảo build sạch
  # --force là gì?
  # Bắt buộc npm phải xóa cache (vì mặc định nó không cho xóa)
  
  # -------- builder --------
  FROM node:24-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .

  ARG NEXT_PUBLIC_API_BASE_URL

  ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
  
  RUN npm run build
  
  # -------- runner --------
  FROM node:24-alpine AS runner
  WORKDIR /app
  
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  # tắt telemetry (thu thập dữ liệu) của Next.js
  
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  COPY --from=builder /app/public ./public
  
  RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
  RUN chown -R nextjs:nextjs /app
  USER nextjs

  # addgroup = tạo một group (nhóm user) trong Linux
  # -S = system group
  # Nhẹ, không dùng cho login
  # Thường dùng cho service/app (như Next.js)
  #  adduser = tạo user
  # -S = system user (không login, không password)
  # nextjs = tên user
  # -G nextjs = cho user này vào group nextjs
  #  chown = change owner (đổi quyền sở hữu)
  # -R = recursive (áp dụng cho toàn bộ file/folder bên trong)
  # nextjs:nextjs =
  # user = nextjs
  # group = nextjs
  # /app = thư mục chứa code của bạn
  
  EXPOSE 3000
  
  CMD ["node", "server.js"]