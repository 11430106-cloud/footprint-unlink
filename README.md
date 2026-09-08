# 足跡斷鏈

依附件 PRD MVP v2.0 製作的繁體中文、手機優先體驗。流程：首頁 → 辨識 → 斷鏈 → 回查 → 回到自己 → 個人回查建議與結果。包含八題情境、即時解說、線索連線圖、三構面計分、自我檢核、可列印 A4 檢核卡與使用教學。

## 開發

- 安裝：`npm ci`
- 開啟本機網站：`npm run dev`
- 產生靜態網站：`npm run build`
- 檢查型別：`npx tsc --noEmit`
- 驗證測驗邏輯：`node --experimental-strip-types --test tests/quiz.test.ts`

使用 Node.js 22.13 以上；本次在 Node.js 24 上建置。靜態成品在 `dist/client`，不需要網站後端。Sites 發布設定在 `.openai/hosting.json`。

## GitHub Pages

使用者選擇 GitHub Pages 作為同學使用的正式網址。自動發布流程在 `.github/workflows/pages.yml`：上傳 main 後，自動型別檢查、測驗測試、建置及發布。需先在儲存庫 Settings → Pages 選 GitHub Actions。

`NEXT_PUBLIC_BASE_PATH` 由 configure-pages 的 base_path 輸出設定，自動支援一般儲存庫子路徑與帳號首頁。本機開發不設定此變數。完整步驟請看 `GitHub發布教學.md`。

## 修改內容

題目、選項及逐項解說集中在 `data/questions.json`。個人檢核的 12 種選項、組合規則與建議集中在 `data/riskRules.json`；規則比對在 `lib/self-check-engine.ts`，介面在 `components/self-check.tsx`。虛構資料卡在 `components/evidence.tsx`；計分與狀態轉換在 `lib/quiz-engine.ts`；檢核卡在 `components/checklist.tsx`，列印樣式在 `app/globals.css`。

第八題統一使用示範修正版，不隨前面答案變動。三構面各依答對題數換算為 40、40、20 分，分別四捨五入後相加。複選採完整答對，避免全勾取得分數。

「回到自己」不計分，結果只依勾選類型顯示回查建議。組合規則優先於同類一般建議，並依固定的建議順序呈現；此順序並非個人危險程度排名。「以上皆無」與其他選項互斥，「其他」提供四類線索的通用檢查方式。依 PRD 第 18、20、25 節，選配的 AI 與自由輸入暫不啟用。

所有作答與自我檢核只在 React 記憶體狀態處理；不使用 localStorage、cookie、資料庫、廣告追蹤或外部 AI API 儲存或分析作答。重新整理即重設。

## Windows 建置

此版本的 Vinext CLI 成功後強制 process.exit(0)，在本機會觸發 Windows libuv 關閉斷言。建置腳本只在 Windows 將成功退出改為設定 exitCode，讓事件迴圈自然結束；非零退出仍使用原始行為。這不改動建置步驟或忽略錯誤，也不影響網站本身。

## 驗證範圍

v2 已通過 TypeScript 檢查與 10 項自動化測試，包含所有 256 種測驗正誤組合、2,048 種有效自我檢核組合、PRD 的三項組合規則、選項互斥、無效輸入、答案鎖定、修改自我檢核不改分數及完整重設。發行時另執行 `npm run build`。

本次未進行瀏覽器逐題操作、360px 畫面實測或實際 A4 列印預覽；手機介面與 A4 專用列印樣式已實作，這些項目仍需實際瀏覽器驗收。

瀏覽器支援 WebMCP 時提供 read_quiz_state、start_quiz、submit_quiz_answer、next_quiz_question、submit_self_check、reset_quiz。使用相同狀態轉換與輸入驗證；未取得可呼叫 WebMCP 的驗證環境，故未宣稱其註冊及執行契約已實際驗證，不支援時不影響一般操作。
