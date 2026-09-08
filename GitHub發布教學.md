# 上傳 GitHub 並分享固定網址

網站已準備 GitHub Pages 自動發布流程。需要先有 GitHub 帳號，以及你有權限管理的儲存庫。

## 第一次發布

1. 在 GitHub 建立空白儲存庫，建議名稱為 footprint-unlink。使用免費個人方案時，選 Public 才能使用 GitHub Pages；Public 也會公開程式碼。
2. 將本專案的程式碼上傳至儲存庫的 main 分支。專案檔案需放在儲存庫根目錄，保留 .github/workflows/pages.yml；不要上傳 node_modules、.git、.env 或本機暫存檔。
3. 在儲存庫開啟 Settings → Pages，將 Build and deployment 的 Source 選為 GitHub Actions。
4. 開啟 Actions → Publish quiz to GitHub Pages，選 Run workflow，分支選 main，開始發布。
5. 等待 build 與 deploy 都顯示綠色勾號。開啟 Settings → Pages 顯示的正式網址，或點 workflow 的 github-pages 網址。
6. 將這個正式網址貼到班群。同學可用手機或電腦直接作答，無須登入 GitHub。

一般專案網址格式為 https://你的帳號.github.io/儲存庫名稱/；這只是格式示例，實際網址以 GitHub Pages 顯示為準。只要帳號、儲存庫名稱與 Pages 設定不變，後續更新沿用同一網址。

## 後續更新

修改程式碼並推送到 main 後，GitHub Actions 會重新檢查與發布，無須再發新網址。若 Actions 出現紅色叉號，打開失敗的步驟查看原因；不要把未完成發布當作已上線。

## 使用教學

右上角「使用教學」包含完整操作方式。主流程為：開始測驗 → 認識四種線索 → 完成八題並閱讀解說 → 查看分數 → 開啟 A4 檢核卡。

檢核卡可點「列印／另存 PDF」；選 A4、直向、100% 縮放，關閉瀏覽器頁首與頁尾。測驗不保留作答，重新整理即重設。

## 官方說明

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
