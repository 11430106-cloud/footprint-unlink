# 足跡防護

依附件 PRD MVP v2.0 製作的繁體中文、手機優先體驗。流程：首頁 → 辨識 → 防護 → 回查 → 回到自己 → 個人回查建議與結果。包含八題情境、即時解說、線索連線圖、三構面計分、自我檢核、可列印 A4 檢核卡與使用教學。

## 開發

- 安裝：`npm ci`
- 開啟本機網站：`npm run dev`
- 產生靜態網站：`npm run build`
- 檢查型別：`npx tsc --noEmit`
- 驗證測驗與研究流程：`npm test`

使用 Node.js 22.13 以上；本次在 Node.js 24 上建置。靜態成品在 `dist/client`。測驗須先同意匿名統計，使用 Cloudflare Worker 和 D1 建立紀錄及計分。Sites 發布設定在 `.openai/hosting.json`，正式網站仍依使用者選擇部署 GitHub Pages。

## GitHub Pages

使用者選擇 GitHub Pages 作為同學使用的正式網址。自動發布流程在 `.github/workflows/pages.yml`：上傳 main 後，自動型別檢查、測驗測試、建置及發布。需先在儲存庫 Settings → Pages 選 GitHub Actions。

`NEXT_PUBLIC_BASE_PATH` 由 configure-pages 的 base_path 輸出設定，自動支援一般儲存庫子路徑與帳號首頁。本機開發不設定此變數。完整步驟請看 `GitHub發布教學.md`。

## 修改內容

題目、選項及逐項解說集中在 `data/questions.json`。個人檢核的 12 種選項、組合規則與建議集中在 `data/riskRules.json`；規則比對在 `lib/self-check-engine.ts`，介面在 `components/self-check.tsx`。虛構資料卡在 `components/evidence.tsx`；計分與狀態轉換在 `lib/quiz-engine.ts`；檢核卡在 `components/checklist.tsx`，列印樣式在 `app/globals.css`。

第八題統一使用示範修正版，不隨前面答案變動。三構面各依答對題數換算為 40、40、20 分，分別四捨五入後相加。複選採完整答對，避免全勾取得分數。

「回到自己」不計分，結果只依勾選類型顯示回查建議。組合規則優先於同類一般建議，並依固定的建議順序呈現；此順序並非個人危險程度排名。「以上皆無」與其他選項互斥，「其他」提供四類線索的通用檢查方式。依 PRD 第 18、20、25 節，選配的 AI 與自由輸入暫不啟用。

所有訪客進入首頁時須先閱讀資料使用告知，勾選同意並按「同意並開始測驗」；未同意無法作答，也不建立測試紀錄。同意者使用同一套八題，瀏覽器暫存進度，完成送出後取得匿名完成編號。已同意者在同一瀏覽器可續填；「下一位受測者」會重新顯示告知。未設定研究 API 時顯示服務尚未設定，無法開始測驗。單次八題統計不能當成前後測成效。題目、後端、管理權限與部署步驟見 [研究測試部署與題庫草稿.md](研究測試部署與題庫草稿.md)。

## Windows 建置

此版本的 Vinext CLI 成功後強制 process.exit(0)，在本機會觸發 Windows libuv 關閉斷言。建置腳本只在 Windows 將成功退出改為設定 exitCode，讓事件迴圈自然結束；非零退出仍使用原始行為。這不改動建置步驟或忽略錯誤，也不影響網站本身。

## 驗證範圍

已通過 TypeScript 檢查與 13 項自動化測試，包含原測驗的 256 種正誤組合、2,048 種有效自我檢核組合，以及同意、後端計分、完成編號、重送、流失、管理 JWT、CSV 與刪除。管理驗證另涵蓋未登入、非指定信箱、錯誤 AUD、錯誤發行者、過期與無效憑證。發行時另執行 `npm run build`。

資料流程已由自動測試驗證；部署正式 Cloudflare 服務前，仍須依部署文件走完一次瀏覽器測試。尚未做實際 A4 列印預覽。

同意入口另有瀏覽器回歸檢查 `npm run test:consent`。先以正式公開 `NEXT_PUBLIC_RESEARCH_API_URL`、`NEXT_PUBLIC_BASE_PATH=/footprint-unlink` 建置；檢查程式會攔截所有研究 API，使用模擬資料，不寫入正式後台。需另備 Playwright 與 Chromium，可執行 `npm install --no-save --package-lock=false playwright`、`npx playwright install chromium`；也可用 `PLAYWRIGHT_MODULE` 指向已安裝的 Playwright，`PLAYWRIGHT_CHANNEL=chrome` 使用已安裝的 Chrome。檢查涵蓋未同意不可作答、取消勾選、連線失敗、完成送出、同意後續填，以及下一位重新同意。

後台瀏覽器檢查為 `npm run test:admin`，使用相同 Playwright 設定，啟動獨立本機記憶體資料庫及模擬 JWT。檢查無資料、更新統計、逐人紀錄、CSV 數字、雙重刪除確認與登入失效；不存取正式 D1。預覽存於 Git 忽略的 `outputs/admin-preview.png`，明確標示假資料。

後台操作請看 [後台使用與登入設定.md](後台使用與登入設定.md)。2026 年 10 月 7 日已部署 Cloudflare Access 與四個指定信箱的後端白名單，並成功驗證主要管理者的正式登入及 CSV 匯出；未登入的後台請求會轉到登入頁。另外三位管理者的首次實際登入須由本人完成。`npm run research:configure-admin` 供維護時填入本機團隊網域及 AUD，不要求管理金鑰、不會建立 Access 規則，也不會自行部署。

瀏覽器支援 WebMCP 時提供 read_quiz_state、start_quiz、submit_quiz_answer、next_quiz_question、submit_self_check、reset_quiz。使用相同狀態轉換與輸入驗證；未取得可呼叫 WebMCP 的驗證環境，故未宣稱其註冊及執行契約已實際驗證，不支援時不影響一般操作。
