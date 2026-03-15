# Vercel 部署步驟（顧客下單網頁）

專案已改為支援 **PostgreSQL**（Vercel 上無法用本機 SQLite）。照下面順序做即可。

---

## 步驟 1：申請 Neon 免費資料庫（約 2 分鐘）

1. 打開 https://neon.tech 用 GitHub 登入。
2. **New Project** → 選 region（例如 Singapore）、取個名字 → **Create**。
3. 進到專案後，在 **Connection string** 選 **Pooled connection**，複製整串網址，長相類似：
   ```txt
   postgresql://使用者:密碼@ep-xxx.region.aws.neon.tech/資料庫名?sslmode=require
   ```
4. 先貼到記事本備用，下一步會用到。

---

## 步驟 2：本機改用 Postgres 並建立資料表

1. 在專案根目錄新增或編輯 `.env`，內容改成（把 `你的_NEON_連線字串` 換成剛複製的）：
   ```env
   DATABASE_URL="你的_NEON_連線字串"
   SESSION_SECRET="請填至少32個字元的亂碼當作後台登入加密用"
   ```
   `SESSION_SECRET` 可自己亂打 32 字以上，或執行一次：
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   把輸出的字串貼上去。

2. 在終端機執行（會依 schema 在 Neon 建立所有表）：
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
   - `db push`：建立/更新表結構  
   - `db seed`：寫入預設單位、分類等（若你有 seed）

3. 本機跑一次確認沒壞：
   ```bash
   npm run dev
   ```
   開 http://localhost:3000 下單、http://localhost:3000/admin 登入後台，都正常再繼續。  
   **後台登入**：帳號 `admin`、密碼 `admin123`（由 seed 建立）。若無法登入，先執行 `npx prisma db seed` 建立 admin，並確認 `.env` 的 `SESSION_SECRET` 至少 32 字元。

---

## 步驟 3：程式碼推上 GitHub

1. 若還沒建 repo：到 https://github.com/new 建立一個新 repo（例如 `order`），不要勾選 README。
2. 在專案目錄執行（若已初始化過 git 就從 `git remote add` 開始）：
   ```bash
   git init
   git add .
   git commit -m "init: order app for Vercel"
   git branch -M main
   git remote add origin https://github.com/你的帳號/order.git
   git push -u origin main
   ```
   把 `你的帳號/order` 換成你的 repo 路徑。

---

## 步驟 4：Vercel 部署

1. 打開 https://vercel.com 用 GitHub 登入 → **Add New** → **Project**。畫面上會出現「你的 GitHub 倉庫列表」→ 點你要部署的那個專案（例如 order），再按 **Import**。若列表是空的，先點 **Configure GitHub App** 或 **Adjust GitHub App Permissions**，把倉庫權限打開後重新整理。
2. 在 **Environment Variables** 新增兩筆（直接從本機 `.env` 複製貼上即可）：
   - `DATABASE_URL`
   - `SESSION_SECRET`
3. 按 **Deploy**，等約 1～2 分鐘。

---

## 步驟 5：部署完成後

- 部署成功會給一個網址，例如：`https://order-xxx.vercel.app`。
- **顧客下單**：把這個網址給顧客，他們開首頁就是下單頁。
- **後台**：`https://order-xxx.vercel.app/admin`，用你 seed 裡設定的 admin 帳密登入。

若之後改程式，只要 `git push` 到同一個 repo，Vercel 會自動再部署。

---

## 常見問題

- **Build 失敗：Prisma / DATABASE_URL**  
  確認 Vercel 的 Environment Variables 有設 `DATABASE_URL` 和 `SESSION_SECRET`，且 Neon 連線字串是 **Pooled**、結尾有 `?sslmode=require`。

- **上線後 500 / 無法下單**  
  多數是 DB 連不到。到 Neon 後台確認專案沒被暫停，並再貼一次連線字串到 Vercel 的 `DATABASE_URL`。

- **想用自己網域**  
  Vercel 專案 → **Settings** → **Domains** → 照畫面加網域並照指示設 DNS。
