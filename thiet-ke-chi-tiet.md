# THIẾT KẾ KỸ THUẬT CHI TIẾT: ỨNG DỤNG QUẢN LÝ ĐỘI BÓNG

> Tài liệu này đào sâu vào **cách triển khai** từng phần trong tài liệu thiết kế gốc: luồng dữ liệu, chuẩn API, logic service, bảo mật, và vận hành. Đọc kèm `TÀI LIỆU THIẾT KẾ HỆ THỐNG` và `ke-hoach-phat-trien.md`.

---

## 1. Luồng dữ liệu tổng thể (Sequence Flows)

### 1.1. Luồng Đăng nhập Google
```
User (browser) → Google OAuth popup → nhận id_token từ Google
  → Frontend gửi id_token lên POST /api/auth/google
    → Backend verify id_token với Google (google-auth-library)
    → Tìm user theo email trong DB
        - Nếu chưa có → tạo mới (role: 'member', monthlyFund: default)
        - Nếu có → lấy thông tin hiện tại
    → Ký JWT (payload: { userId, role }, expiresIn: '7d')
    → Trả về { token, user }
  → Frontend lưu token vào memory + httpOnly cookie (KHÔNG localStorage cho token nhạy cảm nếu tránh được XSS steal)
  → Mọi request sau đó gắn header Authorization: Bearer <token>
```

**Lưu ý thiết kế:** vì đây là app nội bộ nhỏ (một đội bóng), có thể chấp nhận JWT 7 ngày không cần refresh token để giảm độ phức tạp. Nếu muốn chặt hơn, dùng access token ngắn (15 phút) + refresh token (30 ngày, lưu trong DB để revoke được).

### 1.2. Luồng Tạo trận đấu + Thông báo
```
Admin tạo trận (POST /api/matches)
  → matchController.create()
    → Validate input (Joi/Zod schema)
    → Lưu Match với status: 'upcoming', checkInList: [] (rỗng, sẽ populate sau)
    → Query toàn bộ Users isActive:true → tạo checkInList với status:'pending' cho từng user
    → Trả response ngay cho Admin (không chờ email)
    → Bất đồng bộ (fire-and-forget hoặc queue nhẹ): gọi mailer.sendMatchNotification(users, match)
      → Nodemailer gửi qua SMTP Gmail, dùng App Password (không dùng mật khẩu Gmail thật)
      → Nếu gửi lỗi: log lại, KHÔNG làm fail request tạo trận
```

**Lưu ý:** Gmail SMTP free có giới hạn ~500 email/ngày — với quy mô 1 đội (~20-30 người), không đáng lo, nhưng nên có delay nhỏ giữa các lần gửi nếu batch lớn.

### 1.3. Luồng Force Check-in (Frontend)
```
App mount → gọi GET /api/matches?status=upcoming&checkinPending=true
  → Backend trả trận gần nhất mà req.user chưa check-in (status:'pending' trong checkInList)
  → Nếu có: Frontend render <ForceCheckInModal> full-screen, chặn route khác (kiểm tra ở layout cấp cao, không cho ẩn modal bằng ESC/click ngoài)
  → User chọn Tham gia/Xin nghỉ → PUT /api/matches/:id/checkin { status, reason? }
  → Modal đóng, cho qua các route khác
```

### 1.4. Luồng AI Tìm đối (Apify + Gemini)
```
Cron/Manual trigger → GET /api/opponents/scrape?day=3&time=19:00,19:15,19:30
  → opponentController.scrape()
    → apifyService.runActor() — xem chi tiết mục 4
      → Trả về mảng bài post thô (text + metadata: postUrl, posterFbUrl, postedAt)
    → Lọc sơ bộ bằng regex/keyword trước khi tốn quota Gemini (VD: bài không chứa số điện thoại → bỏ qua)
    → geminiService.extractOpponentInfo(rawText) cho từng bài — xem chi tiết mục 5
      → Validate output bằng Zod schema
      → Nếu hợp lệ: upsert vào Opponents (isSaved:false, scrapedAt: now)
      → Nếu không parse được: log lại để review thủ công, KHÔNG lưu rác vào DB
    → Trả danh sách Opponents mới cào cho Frontend
```

---

## 2. Chuẩn thiết kế API

### 2.1. Response envelope thống nhất
Tất cả endpoint trả về cùng một cấu trúc để frontend xử lý nhất quán:
```javascript
// Thành công
{
  success: true,
  data: { /* payload */ },
  meta: { page, limit, total } // chỉ có khi trả list
}

// Lỗi
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",   // mã lỗi cố định, frontend map sang message hiển thị
    message: "Số tiền phải lớn hơn 0",
    details: [ { field: "amount", issue: "must be positive" } ]
  }
}
```

### 2.2. Mã lỗi chuẩn (error codes)
| Code | HTTP Status | Ý nghĩa |
|---|---|---|
| `UNAUTHORIZED` | 401 | Thiếu/hết hạn token |
| `FORBIDDEN` | 403 | Đúng token nhưng không đủ quyền (member cố sửa finance) |
| `VALIDATION_ERROR` | 400 | Input không hợp lệ |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `CONFLICT` | 409 | VD: check-in trận đã kết thúc |
| `EXTERNAL_SERVICE_ERROR` | 502 | Apify/Gemini/Google lỗi |
| `RATE_LIMITED` | 429 | Vượt giới hạn request |

### 2.3. Chi tiết ví dụ endpoint quan trọng

**`POST /api/finances`** (tạo phiếu thu/chi)
```javascript
// Request
{
  "type": "OUT",
  "category": "tien_san",
  "amount": 800000,
  "description": "Tiền sân trận vs FC Sao Mai",
  "matchId": "665f1...",
  "proofImage": "https://res.cloudinary.com/.../bill.jpg"
}

// Response 201
{
  "success": true,
  "data": {
    "_id": "665f2...",
    "type": "OUT",
    "amount": 800000,
    "createdBy": "665e0...",
    "createdAt": "2026-08-08T10:00:00Z"
  }
}
```
Validate: `type IN ('IN','OUT')`, `amount > 0`, nếu `type:'IN'` bắt buộc có `userId` + `fundMonth`, nếu `type:'OUT'` khuyến khích có `matchId`. Chỉ `role:'admin'` được gọi (check ở `adminMiddleware`, không chỉ ẩn nút ở UI).

**`PUT /api/finances/bulk-update`** (Data Grid Desktop)
```javascript
// Request — mảng các thay đổi, mỗi item có _id để update
{
  "updates": [
    { "_id": "665f2...", "amount": 850000 },
    { "_id": "665f3...", "description": "Sửa lại ghi chú" }
  ]
}

// Response — trả rõ item nào thành công/thất bại để Data Grid highlight đúng dòng lỗi
{
  "success": true,
  "data": {
    "updated": ["665f2..."],
    "failed": [ { "_id": "665f3...", "reason": "Not found" } ]
  }
}
```
**Thiết kế quan trọng:** dùng `bulkWrite` của Mongoose thay vì loop `save()` từng cái để tránh N+1 query khi Data Grid lưu 50-100 dòng cùng lúc.

**`GET /api/matches?status=upcoming&checkinPending=true`**
```javascript
// Response
{
  "success": true,
  "data": [{
    "_id": "665f0...",
    "date": "2026-08-12",
    "time": "19:00",
    "stadium": "Sân ABC, Q.7",
    "pitchCost": 800000,
    "deal": "6-4",
    "opponent": { "teamName": "FC Sao Mai" },
    "checkInSummary": { "joined": 8, "absent": 2, "pending": 5 }
  }]
}
```
`checkInSummary` nên được tính sẵn ở backend (aggregate) thay vì để frontend loop `checkInList`, tránh lộ toàn bộ danh sách user ID không cần thiết ra response.

---

## 3. Thiết kế Database chi tiết

### 3.1. Index cần thiết
```javascript
// Users
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ isActive: 1 });

// Matches
MatchSchema.index({ date: -1 });
MatchSchema.index({ status: 1, date: -1 });          // query "upcoming" nhanh
MatchSchema.index({ "checkInList.userId": 1 });       // tìm trận mà 1 user chưa check-in

// Finances
FinanceSchema.index({ type: 1, date: -1 });
FinanceSchema.index({ matchId: 1 });
FinanceSchema.index({ fundMonth: 1 });                // query báo cáo theo tháng

// Opponents
OpponentSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true }); // tránh cào trùng 1 bài
OpponentSchema.index({ scrapedAt: -1 });
OpponentSchema.index({ isSaved: 1 });
```

### 3.2. Validate ở tầng Schema (Mongoose), không chỉ ở Controller
```javascript
amount: {
  type: Number,
  required: true,
  min: [1, 'Số tiền phải lớn hơn 0']
},
type: {
  type: String,
  enum: { values: ['IN', 'OUT'], message: '{VALUE} không hợp lệ' },
  required: true
}
```
Lý do: nếu sau này có thêm script/cron ghi thẳng vào DB (không qua controller), validate ở Schema vẫn chặn được dữ liệu bẩn.

### 3.3. Tính số dư quỹ — dùng Aggregation, không tính tay ở frontend
```javascript
const [balance] = await Finance.aggregate([
  { $group: {
      _id: null,
      totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN']  }, '$amount', 0] } },
      totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] } }
  }},
  { $project: { balance: { $subtract: ['$totalIn', '$totalOut'] }, totalIn: 1, totalOut: 1 } }
]);
```
Cache kết quả này (VD: trong `res.locals` hoặc Redis nếu sau này scale) vì Dashboard sẽ gọi liên tục — nhưng với quy mô 1 đội bóng, gọi trực tiếp mỗi lần cũng đủ nhanh, không cần cache sớm (tránh over-engineering).

### 3.4. Quan hệ & Denormalization có chủ đích
- `Finance.matchId` và `Finance.userId` chỉ lưu ObjectID, `.populate()` khi cần hiển thị tên — giữ chuẩn hóa vì dữ liệu tài chính cần chính xác tuyệt đối, không nên denormalize.
- `Match.checkInSummary` NGƯỢC LẠI nên tính on-the-fly (aggregate) thay vì lưu field đếm sẵn, vì check-in thay đổi liên tục và đội chỉ có ~20-30 người — tính lại không tốn kém.

---

## 4. Thiết kế `apifyService.js` — Xoay vòng API Key

**Vấn đề:** nhiều Apify free-tier key, mỗi key có giới hạn credit riêng, cần tự động chuyển key khi 1 key hết quota mà không crash luồng cào.

```javascript
// config/apify.js
const API_KEYS = process.env.APIFY_KEYS_ARRAY.split(',');
let currentKeyIndex = 0;

// services/apifyService.js
async function runActorWithRotation(actorId, input, retriesLeft = API_KEYS.length) {
  if (retriesLeft <= 0) throw new AppError('EXTERNAL_SERVICE_ERROR', 'Tất cả Apify key đã hết quota');

  const key = API_KEYS[currentKeyIndex];
  const client = new ApifyClient({ token: key });

  try {
    const run = await client.actor(actorId).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
  } catch (err) {
    if (err.statusCode === 429 || err.type === 'usage-hard-limit-exceeded') {
      // key này hết quota → xoay sang key tiếp theo
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      return runActorWithRotation(actorId, input, retriesLeft - 1);
    }
    throw err; // lỗi khác (network, actor lỗi) — không retry vô ích
  }
}
```

**Điểm cần lưu ý khi triển khai thật:**
- Lưu `currentKeyIndex` vào DB/file thay vì biến in-memory nếu chạy nhiều instance backend (VD: PM2 cluster mode) — biến in-memory sẽ không đồng bộ giữa các process.
- Log lại mỗi lần xoay key (key nào, lúc nào) để theo dõi tốc độ tiêu quota, tránh bị "cạn" hết cả dàn key giữa mùa giải mà không biết.
- Cache kết quả cào trong ngày (VD: theo key `scrape:${day}:${time}`) — nếu đã cào trong 6 tiếng gần nhất thì trả cache, không cào lại, tiết kiệm quota đáng kể vì bài đăng tìm đối không đổi liên tục.

---

## 5. Thiết kế `geminiService.js` — Trích xuất dữ liệu có kiểm soát

**Nguyên tắc:** không tin tưởng 100% output của LLM — luôn validate bằng schema cứng trước khi lưu DB.

```javascript
// Prompt được thiết kế để ép Gemini trả ĐÚNG JSON, không kèm giải thích
const SYSTEM_PROMPT = `
Bạn là bộ trích xuất dữ liệu. Đọc bài đăng tìm đối bóng đá dưới đây và trả về DUY NHẤT một JSON object theo đúng schema sau, không thêm text giải thích, không dùng markdown code block:
{
  "teamName": string | null,
  "matchTime": string | null,   // định dạng "HH:mm", null nếu không rõ
  "matchDay": string | null,    // VD "Thứ 3", null nếu không rõ
  "homeArea": string | null,
  "level": string | null,       // chỉ nhận: "Mềm" | "Trung bình" | "Cứng" | null
  "contactPhone": string | null // chỉ lấy số VN hợp lệ, null nếu không có
}
Nếu không chắc chắn về một trường, trả về null cho trường đó thay vì đoán.
`;

async function extractOpponentInfo(rawText) {
  const response = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    .generateContent([SYSTEM_PROMPT, rawText]);

  const raw = response.response.text().trim();
  let parsed;
  try {
    parsed = JSON.parse(raw); // nếu Gemini lỡ trả kèm ```json``` thì cần strip trước khi parse
  } catch {
    return { valid: false, reason: 'JSON_PARSE_ERROR', raw };
  }

  const result = OpponentExtractSchema.safeParse(parsed); // Zod schema
  if (!result.success) {
    return { valid: false, reason: 'SCHEMA_VALIDATION_ERROR', errors: result.error.issues };
  }

  // Điều kiện tối thiểu để coi là 1 kèo hợp lệ: phải có contactPhone HOẶC posterFbUrl
  if (!result.data.contactPhone) {
    return { valid: false, reason: 'MISSING_CONTACT' };
  }

  return { valid: true, data: result.data };
}
```

**Zod schema tương ứng:**
```javascript
const OpponentExtractSchema = z.object({
  teamName: z.string().nullable(),
  matchTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  matchDay: z.string().nullable(),
  homeArea: z.string().nullable(),
  level: z.enum(['Mềm', 'Trung bình', 'Cứng']).nullable(),
  contactPhone: z.string().regex(/^0\d{9,10}$/).nullable(),
});
```

**Kiểm soát chi phí/quota Gemini free tier:**
- Batch nhiều bài trong 1 request (gộp nhiều bài vào 1 prompt, yêu cầu trả về mảng JSON) thay vì gọi API riêng lẻ từng bài — giảm số request đáng kể.
- Thêm delay 1-2s giữa các batch nếu cào nhiều để tránh rate limit (free tier Gemini thường giới hạn request/phút).
- Log token usage nếu API trả về (`response.usageMetadata`) để theo dõi có gần chạm free tier limit hàng ngày không.

---

## 6. Thiết kế Bảo mật (Security Design)

| Lớp bảo vệ | Triển khai |
|---|---|
| **Authentication** | JWT verify ở `authMiddleware`, reject nếu thiếu/hết hạn/sai chữ ký |
| **Authorization** | `adminMiddleware` kiểm tra `req.user.role === 'admin'` cho các route sửa Finance, tạo/sửa Match, xoá Opponent |
| **Input validation** | Zod/Joi schema ở tầng route, chặn trước khi vào controller |
| **Rate limiting** | `express-rate-limit` — riêng route `/api/opponents/scrape` giới hạn chặt hơn (VD: 5 lần/giờ/user) vì tốn quota external service |
| **CORS** | Chỉ whitelist domain Vercel + domain riêng nếu có, không dùng `origin: '*'` |
| **HTTP Headers** | `helmet()` middleware mặc định |
| **NoSQL Injection** | `express-mongo-sanitize` để chặn payload dạng `{ "$gt": "" }` trong body/query |
| **File/URL input** | `proofImage`, `avatar`, `videoLink` chỉ nhận URL hợp lệ (regex + kiểm tra domain cho phép: Cloudinary, YouTube, Google Drive), không cho nhập URL bất kỳ để tránh SSRF/phishing link |
| **Secrets** | `.env` không commit, dùng `.env.example` liệt kê tên biến; trên VPS dùng file `.env` với quyền `chmod 600` |
| **Google OAuth** | Verify `id_token` bằng `google-auth-library`, kiểm tra `aud` khớp `GOOGLE_CLIENT_ID`, không tự tin vào email do frontend gửi lên |

---

## 7. Thiết kế Frontend chi tiết

### 7.1. State Management
- **AuthContext**: lưu `user`, `token`, hàm `login()/logout()`. Dùng React Context là đủ, **không cần Redux** cho quy mô app này.
- **React Query (TanStack Query)**: quản lý cache dữ liệu server (matches, finances, opponents) — tự động refetch, tránh phải tự viết loading/error state thủ công cho từng page.
- Data Grid (AG Grid) giữ state chỉnh sửa cục bộ (dirty rows) trước khi bấm "Lưu tất cả" → gọi `bulk-update` → invalidate React Query cache để đồng bộ lại.

### 7.2. Routing & Guard
```
/login              → public
/                   → Dashboard (protected)
/matches            → protected
/matches/:id        → protected
/matchmaking        → protected
/finances           → protected (Data Grid chỉ enable edit nếu role === 'admin')
/members            → protected, list chỉ admin sửa được
```
`ProtectedRoute` wrapper kiểm tra `AuthContext.user`, redirect `/login` nếu chưa đăng nhập. `ForceCheckInModal` render ở layout cấp cao nhất (bọc ngoài toàn bộ protected routes), không phải per-page, để không thể "lách" bằng cách vào thẳng URL khác.

### 7.3. Component quan trọng cần thiết kế kỹ
- **`<DataGridTable />`**: wrapper chung cho AG Grid, nhận `columns`, `rows`, `onBulkSave`, có sẵn state dirty-tracking và nút "Lưu tất cả" disable khi không có gì thay đổi.
- **`<ForceCheckInModal />`**: không có nút đóng (X), không đóng khi click ra ngoài/ESC — chỉ đóng khi gọi API check-in thành công.
- **`<MatchCard />`**: hiển thị `checkInSummary` dạng progress bar (VD: 8 tham gia / 2 nghỉ / 5 chưa trả lời) để nhìn nhanh không cần mở chi tiết.

---

## 8. Deployment & DevOps chi tiết

### 8.1. PM2 ecosystem config (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'football-app-api',
    script: './server.js',
    cwd: './backend',
    instances: 1,              // 1 instance vì apifyService dùng biến in-memory (xem lưu ý mục 4)
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '300M',
    error_file: './logs/err.log',
    out_file: './logs/out.log'
  }]
};
```

### 8.2. Nginx reverse proxy (mẫu)
```nginx
server {
  listen 443 ssl;
  server_name api.yourdomain.com;

  ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 8.3. CI/CD — GitHub Actions (deploy backend lên VPS khi push `main`)
```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/football-app/backend
            git pull origin main
            npm ci --production
            pm2 restart football-app-api
```
Frontend không cần workflow riêng — Vercel tự CI/CD khi push (đã nêu ở tài liệu gốc).

### 8.4. Backup dữ liệu
- MongoDB Atlas M0 **không có auto-backup** (chỉ từ M10 trở lên). Giải pháp: cron job hàng ngày chạy `mongodump` → nén → upload lên Google Drive (dùng `googleapis` với service account), giữ lại 7 bản gần nhất.
- Đây là việc **quan trọng nhưng dễ bị bỏ quên** — nên đưa vào Phase 0/1 luôn thay vì để cuối, vì dữ liệu tài chính của cả đội mà mất là vấn đề lớn.

---

## 9. Monitoring & Logging tối giản

- **Logging:** `winston` hoặc đơn giản là `console.log` có structure (`{ level, timestamp, message, meta }`) ghi ra file, PM2 tự động xoay log.
- **Uptime:** UptimeRobot free tier ping `/api/health` mỗi 5 phút, báo qua email/Telegram nếu server die.
- **Error tracking:** Sentry free tier (5k events/tháng, đủ dùng cho app quy mô nhỏ) — bắt lỗi frontend + backend, biết ngay khi có exception thay vì đợi user report.
- **Endpoint health check tối thiểu:**
```javascript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
});
```

---

## 10. Biến môi trường đầy đủ (`.env.example`)

```
# Server
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-app.vercel.app

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/football-app

# Auth
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Email
GMAIL_USER=your-team-email@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx   # App Password, không phải mật khẩu Gmail thật

# AI & Scraping
APIFY_KEYS_ARRAY=key1,key2,key3
APIFY_ACTOR_ID=your-actor-id
GEMINI_API_KEY=xxxx

# Storage
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

# Backup
BACKUP_GDRIVE_FOLDER_ID=xxxx
GOOGLE_SERVICE_ACCOUNT_JSON=xxxx   # base64-encoded, decode lúc runtime
```

---

## 11. Việc dễ bị bỏ sót nhưng nên làm sớm

- **Soft delete thay vì hard delete** cho `Users` (`isActive:false`) — đã có trong schema gốc, nhớ áp dụng tương tự cho `Matches` đã lỡ tạo nhầm (thêm `status: 'cancelled'` thay vì xoá hẳn, vì Finance có thể đã link tới `matchId` đó).
- **Timezone:** lưu `date`/`time` nhất quán theo giờ VN (UTC+7) — dễ lỗi lệch giờ nếu server VPS chạy UTC mặc định trong khi user nhập giờ VN. Nên chuẩn hoá: lưu UTC trong DB, convert sang giờ VN ở tầng hiển thị (frontend), dùng `dayjs` với plugin timezone.
- **Idempotency cho Clone Match:** nếu user bấm "Tạo lại trận" 2 lần liên tiếp (double-click), tránh tạo trùng 2 trận giống hệt — có thể debounce ở frontend + check nhẹ ở backend (trận cùng ngày/giờ/đối thủ tạo trong vòng vài giây gần nhất thì cảnh báo).
