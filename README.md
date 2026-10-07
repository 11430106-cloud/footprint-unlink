# 足跡防護

依附件 PRD MVP v2.0 製作的繁體中文、手機優先體驗。流程：首頁 → 辨識 → 防護 → 回查 → 回到自己 → 個人回查建議與結果。包含八題情境、即時解說、線索連線圖、三構面計分、自我檢核、可列印 A4 檢核卡與使用教學。

## 開發

- 安裝：`npm ci`
- 開啟本機網站：`npm run dev`
- 產生靜態網站：`npm run build`
- 檢查型別：`npx tsc --noEmit`
- 驗證測驗與研究流程：`npm test`

使用 Node.js 22.13 以上；本次在 Node.js 24 上建置。靜態成品在 `dist/client`。一般體驗不建立研究紀錄；獨立研究入口須先同意，再由 Cloudflare Worker 和 D1 記錄與計分。Sites 發布設定在 `.openai/hosting.json`，正式網站仍依使用者選擇部署 GitHub Pages。

## GitHub Pages

使用者選擇 GitHub Pages 作為同學使用的正式網址。自動發布流程在 `.github/workflows/pages.yml`：上傳 main 後，自動型別檢查、測驗測試、建置及發布。需先在儲存庫 Settings → Pages 選 GitHub Actions。

`NEXT_PUBLIC_BASE_PATH` 由 configure-pages 的 base_path 輸出設定，自動支援一般儲存庫子路徑與帳號首頁。本機開發不設定此變數。完整步驟請看 `GitHub發布教學.md`。

## 修改內容

題目、選項及逐項解說集中在 `data/questions.json`。個人檢核的 12 種選項、組合規則與建議集中在 `data/riskRules.json`；規則比對在 `lib/self-check-engine.ts`，介面在 `components/self-check.tsx`。虛構資料卡在 `components/evidence.tsx`；計分與狀態轉換在 `lib/quiz-engine.ts`；檢核卡在 `components/checklist.tsx`，列印樣式在 `app/globals.css`。

第八題統一使用示範修正版，不隨前面答案變動。三構面各依答對題數換算為 40、40、20 分，分別四捨五入後相加。複選採完整答對，避免全勾取得分數。

「回到自己」不計分，結果只依勾選類型顯示回查建議。組合規則優先於同類一般建議，並依固定的建議順序呈現；此順序並非個人危險程度排名。「以上皆無」與其他選項互斥，「其他」提供四類線索的通用檢查方式。依 PRD 第 18、20、25 節，選配的 AI 與自由輸入暫不啟用。

一般網址保留八題學習、即時解說及回查，不呼叫研究API。`?research=1` 獨立入口在同意後依序完成五題前測、原八題學習與回查、五題不同後測及結束問卷；後端隨機分配A→B或B→A，保存版本、時間及逐題答案。瀏覽器及後端暫存進度，開始與階段重送皆不重複計人。`STUDY_ENABLED=false` 保持研究關閉，待團隊審核題庫後才開放。新後台在 Worker `/admin`，舊八題資料保留於 `/admin/legacy`，不混入前後測成效。詳見 [部署與使用](複賽研究系統部署與使用.md)、[A/B題庫草稿](A-B前後測題庫草稿.md) 與 [逐項檢查報告](複賽系統檢查與驗收.md)。

## Windows 建置

此版本的 Vinext CLI 成功後強制 process.exit(0)，在本機會觸發 Windows libuv 關閉斷言。建置腳本只在 Windows 將成功退出改為設定 exitCode，讓事件迴圈自然結束；非零退出仍使用原始行為。這不改動建置步驟或忽略錯誤，也不影響網站本身。

## 驗證範圍

驗證包含20項自動化測試：原測驗的256種正誤組合、2,048種自我檢核組合、舊同意與計分、管理JWT，以及新增A/B配對、12人分母、流失、百分點、80%／70%門檻、互斥問卷、安全複製、CSV、重送與單筆刪除。管理驗證涵蓋未登入、非指定信箱、錯誤AUD、錯誤發行者、過期與無效憑證。發行時另執行型別檢查及 `npm run build`。

資料流程已由自動測試驗證；部署正式 Cloudflare 服務前，仍須依部署文件走完一次瀏覽器測試。尚未做實際 A4 列印預覽。

新研究入口瀏覽器檢查為 `npm run test:consent`。先以正式公開 `NEXT_PUBLIC_RESEARCH_API_URL`、`NEXT_PUBLIC_BASE_PATH=/footprint-unlink` 建置；攔截所有API並交給本機Worker和記憶體資料庫，不寫入正式後台。需另備Playwright與Chromium，或用 `PLAYWRIGHT_MODULE` 指向已安裝模組、`PLAYWRIGHT_CHANNEL=chrome`。涵蓋一般訪客零API、未同意零紀錄、回應中斷重送、刷新、完整前後測／學習／回查／問卷、下一位重置及入口關閉。

新後台瀏覽器檢查為 `npm run test:paired-admin`，舊後台為 `npm run test:admin`，均使用記憶體資料庫及模擬JWT。新版涵蓋八圖表、12人分母、最新複製與預覽、UTF-8 TXT、權限拒絕備援、CSV、補充欄位、單筆雙重確認刪除與登入失效。測試截圖在Git忽略的outputs，假資料圖明確標示不屬正式結果。

後台操作請看 [後台使用與登入設定.md](後台使用與登入設定.md)。2026 年 10 月 7 日已部署 Cloudflare Access 與四個指定信箱的後端白名單，並成功驗證主要管理者的正式登入及 CSV 匯出；未登入的後台請求會轉到登入頁。另外三位管理者的首次實際登入須由本人完成。`npm run research:configure-admin` 供維護時填入本機團隊網域及 AUD，不要求管理金鑰、不會建立 Access 規則，也不會自行部署。

瀏覽器支援 WebMCP 時提供 read_quiz_state、start_quiz、submit_quiz_answer、next_quiz_question、submit_self_check、reset_quiz。使用相同狀態轉換與輸入驗證；未取得可呼叫 WebMCP 的驗證環境，故未宣稱其註冊及執行契約已實際驗證，不支援時不影響一般操作。
