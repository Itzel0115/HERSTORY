# Agent 接手測試

日期：2026-11-16。結果：**isolated clean-room test — Pass（本次新增展流程）**。
使用未繼承先前聊天的獨立子 Agent；它只收到公開專案副本、根 AGENTS 入口、V&A 官方材料網址及新增最小雙語 draft 的任務。不是新的使用者 Codex 對話；該項仍 **Not Run**。

材料：[V&A — Julia Margaret Cameron: an introduction](https://www.vam.ac.uk/articles/julia-margaret-cameron-introduction)。Agent 實際讀取官方正文，沒有下載圖片或杜撰引文，只採有限的館方背景主張並標明單一來源限制。

| 驗證 | 實際結果 |
|---|---|
| 分類與命名 | 自行選 HER ART、cameron-art-of-seeing，符合 kebab-case |
| 檔案／來源 | 建立中英展頁、精簡公開來源／主張／權利／待審摘要 |
| 雙語結構 | 12 頁檢查通過；配對 ID、lang、來源與語言入口一致 |
| Registry | 正確增加第四筆 draft，無 cover、publishedAt 或虛構關聯 |
| 生成器 | generate 更新0首頁，--check 通過；draft 不入公開索引 |
| 自動測試 | 28 個隔離索引測試、492 個12頁檢查通過 |
| 公開排除 | package 仍4頁14資產；新草稿與研究不進 artifact |
| 保護既有內容 | 兩語首頁 SHA-256 不變，未修改共用 CSS／JS 或原三展 |
| 交接 | 回報實際命令／結果、人工待審與限制，無 commit／push／部署 |

測試發現兩項小文字歧義並已修正：已有研究 README 白名單時不必重複修改 .gitignore；沒有 .git 的測試副本應記錄限制、使用檔案基線，不自行初始化。核心流程沒有失敗或依賴主 Agent 的隱藏補充規則。

測試只驗證一次新展草稿接手，不代表所有四種工作類型均經獨立驗證，也不代表內容人工批准。測試內瀏覽器／實機／讀屏 Not Run；正式四頁 release 另有72項瀏覽器驗收。

測試內容、Registry 變更與完整紀錄保留在隔離內部副本，不加入正式站。公開 Repository 只保留本摘要。人工語意、策展及來源充分性仍待審。
