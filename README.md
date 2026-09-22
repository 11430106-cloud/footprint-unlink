# 足跡防護

依附件 PRD MVP v2.0 製作的繁體中文、手機優先體驗。流程：首頁 → 辨識 → 防護 → 回查 → 回到自己 → 個人回查建議與結果。包含八題情境、即時解說、線索連線圖、三構面計分、自我檢核、可列印 A4 檢核卡與使用教學。

## 開發

- 安裝：`npm ci`
- 開啟本機網站：`npm run dev`
- 產生靜態網站：`npm run build`
- 檢查型別：`npx tsc --noEmit`
- 驗證測驗與研究流程：`npm test`

使用 Node.js 22.13 以上；本次在 Node.js 24 上建置。靜態成品在 `dist/client`。一般體驗不需要網站後端；研究模式另使用 Cloudflare Worker 和 D1。Sites 發布設定在 `.openai/hosting.json`，正式網站仍依使用者選擇部署 GitHub Pages。

## GitHub Pages

使用者選擇 GitHub Pages 作為同學使用的正式網址。自動發布流程在 `.github/workflows/pages.yml`：上傳 main 後，自動型別檢查、測驗測試、建置及發布。需先在儲存庫 Settings → Pages 選 GitHub Actions。

`NEXT_PUBLIC_BASE_PATH` 由 configure-pages 的 base_path 輸出設定，自動支援一般儲存庫子路徑與帳號首頁。本機開發不設定此變數。完整步驟請看 `GitHub發布教學.md`。

## 修改內容

題目、選項及逐項解說集中在 `data/questions.json`。個人檢核的 12 種選項、組合規則與建議集中在 `data/riskRules.json`；規則比對在 `lib/self-check-engine.ts`，介面在 `components/self-check.tsx`。虛構資料卡在 `components/evidence.tsx`；計分與狀態轉換在 `lib/quiz-engine.ts`；檢核卡在 `components/checklist.tsx`，列印樣式在 `app/globals.css`。

第八題統一使用示範修正版，不隨前面答案變動。三構面各依答對題數換算為 40、40、20 分，分別四捨五入後相加。複選採完整答對，避免全勾取得分數。

「回到自己」不計分，結果只依勾選類型顯示回查建議。組合規則優先於同類一般建議，並依固定的建議順序呈現；此順序並非個人危險程度排名。「以上皆無」與其他選項互斥，「其他」提供四類線索的通用檢查方式。依 PRD 第 18、20、25 節，選配的 AI 與自由輸入暫不啟用。

一般入口的作答與自我檢核只在 React 記憶體處理；不儲存團隊測試紀錄，重新整理即重設。獨立的 `?mode=research` 入口在受測者同意後，才使用 localStorage 暫存進度，並送匿名測試資料到 Cloudflare Worker/D1；原八題的練習答案只暫存在本裝置供研究流程續填，不作前後測成效。題庫、後端、管理權限與部署步驟見 [研究測試部署與題庫草稿.md](研究測試部署與題庫草稿.md)。沒有 API 設定時研究入口顯示尚未開放。

## Windows 建置

此版本的 Vinext CLI 成功後強制 process.exit(0)，在本機會觸發 Windows libuv 關閉斷言。建置腳本只在 Windows 將成功退出改為設定 exitCode，讓事件迴圈自然結束；非零退出仍使用原始行為。這不改動建置步驟或忽略錯誤，也不影響網站本身。

## 驗證範圍

已通過 TypeScript 檢查與 12 項自動化測試，包含原測驗的 256 種正誤組合、2,048 種有效自我檢核組合，以及研究模式的同意、配對、重送、流失、管理 JWT/CSV/刪除。發行時另執行 `npm run build`。

研究模式已在本機瀏覽器走完前測、原八題、回到自己、後測及問卷，並測試重新整理續填及一般入口。尚未做 360px 畫面及實際 A4 列印預覽。

瀏覽器支援 WebMCP 時提供 read_quiz_state、start_quiz、submit_quiz_answer、next_quiz_question、submit_self_check、reset_quiz。使用相同狀態轉換與輸入驗證；未取得可呼叫 WebMCP 的驗證環境，故未宣稱其註冊及執行契約已實際驗證，不支援時不影響一般操作。
