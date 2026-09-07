# 足跡斷鏈

繁體中文、手機優先的跨平台數位足跡情境測驗。八題分為辨識、斷鏈、回查，附即時解說、三構面計分、可列印 A4 檢核卡與站內使用教學。

## 開發

- 安裝：`npm ci`
- 開啟本機網站：`npm run dev`
- 產生靜態網站：`npm run build`
- 檢查型別：`npx tsc --noEmit`
- 驗證測驗邏輯：`node --experimental-strip-types --test tests/quiz.test.ts`

使用 Node.js 22.13 以上；本次在 Node.js 24 上建置。靜態成品在 `dist/client`，不需要網站後端。Sites 發布設定在 `.openai/hosting.json`。

## 修改內容

題目、選項及逐項解說集中在 `data/questions.json`。虛構資料卡在 `components/evidence.tsx`；計分與狀態轉換在 `lib/quiz-engine.ts`；檢核卡在 `components/checklist.tsx`，列印樣式在 `app/globals.css`。

第八題統一使用示範修正版，不隨前面答案變動。三構面各依答對題數換算為 40、40、20 分，分別四捨五入後相加。複選採完整答對，避免全勾取得分數。

所有作答只在 React 記憶體狀態處理；不使用 localStorage、cookie、資料庫、廣告追蹤或外部 AI API 儲存或分析作答。重新整理即重設。

## Windows 建置

此版本的 Vinext CLI 成功後強制 process.exit(0)，在本機會觸發 Windows libuv 關閉斷言。建置腳本只在 Windows 將成功退出改為設定 exitCode，讓事件迴圈自然結束；非零退出仍使用原始行為。這不改動建置步驟或忽略錯誤，也不影響網站本身。

## 驗證範圍

已通過 TypeScript 檢查、靜態建置、六項測驗邏輯測試，包括所有 256 種題目正誤組合、答案鎖定、複選排他與重設。使用者未要求瀏覽器操作測試，因此未進行瀏覽器逐題操作、360px 螢幕實測或實際 A4 列印檢視；A4 使用專用列印樣式。

當瀏覽器支援 WebMCP 時提供 read_quiz_state、start_quiz、submit_quiz_answer、next_quiz_question、reset_quiz。未取得可呼叫 WebMCP 的驗證環境，故未宣稱其執行契約已驗證；不支援時不影響一般按鈕操作。
