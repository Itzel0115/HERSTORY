# W9 — HERSTORY 繳交說明

課程主題：建立可讓 AI 延續專案的 AGENTS.md；作業週次 W9（11/03）。
- Website：https://itzel0115.github.io/HERSTORY/
- Repository：https://github.com/Itzel0115/HERSTORY （Public）
- 核心規則：[AGENTS.md](../AGENTS.md)

## 展示方式
先看雙語首頁的 The Woven Archive 互動、四展區與 About，再在 GitHub 根目錄閱讀 AGENTS。手冊將新展、新材料、既有展修改、共用元件修正分成四種流程，明列輸入、檔案位置、Registry、生成、測試與人類決策。

專案是女性故事、藝術與思想的數位博物館。已完成10頁開發架構、Single JSON Registry、Node 生成器、測試與 Pages 白名單；4頁公開、3展 draft。核心價值是可追溯材料與可重複執行的 AI 規則，不是宣稱三展完整研究已完成。

## 教師要求對應
| 要求 | 證據 |
|---|---|
| 可持續擴充的小專案 | 穩定展覽 ID、雙語路徑、Registry 與新增流程 |
| 具體 AI 規則 | 根 AGENTS 的目的、視覺、架構、命名、資料夾、內容與 QA |
| 完整可分享專案在 GitHub | 公開原始碼、字體／授權、規則、生成器與測試；不含內部原型及研究擷取 |
| 可瀏覽網站 | 真實 Pages 網址；四頁與14資產白名單 |
| 未來新增內容 | 四種流程及內容格式；未批准內容保持 draft |
| 新 AI 接手測試 | 實際方法與限制見 [REPEATABILITY](REPEATABILITY.md)，不把獨立子 Agent 冒稱使用者新對話 |

## Release 驗證
本次公開版本：索引 --check Pass；28項單元測試 Pass；10頁／432項結構與三前綴檢查 Pass；四頁14資產 package/check-package Pass；72項 Chrome 瀏覽器檢查 Pass。部署包與整理前四頁網站逐 byte 相同。詳細證據留在內部，不公開長篇執行日誌。

接手驗證：isolated clean-room test Pass，新增展後12頁／492項檢查通過，仍為 draft、未污染正式站。真正新的使用者 Codex 對話測試 Not Run。

公開 main 採乾淨 root 歷史，作者／提交者使用 GitHub noreply；舊工作資料有完整本機備份。這不代表 GitHub 舊物件、快取或他人的 clone 已永久清除。

## 限制與自評
三展完整研究、逐展素材與人工雙語審核、實體裝置／Safari／讀屏完整驗收未完成。公開網站不是完整三展展覽。
依本次提供的9–10分方向，檢查規則是否具體、Agent 能否接手、網站是否對應規則、流程能否重複使用；證據可支持能力評估，但不預測或保證老師給分。真正新的使用者 Codex 對話測試與 isolated clean-room test 必須分別記錄。
