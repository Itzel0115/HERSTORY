# Exhibition Registry v1

現行 schema v1 與生成契約；變更需同步程式及測試。

唯一登錄資料為 [exhibitions.json](../data/exhibitions.json)。[exhibitions.schema.json](../data/exhibitions.schema.json) 是 JSON Schema 2020-12 結構描述，不是第二份內容清單；不安裝 schema validator。實際執行檢查由 [build-index.mjs](../scripts/build-index.mjs) 的 `validate()` 完成，包括 schema 難以描述的檔案／跨紀錄檢查。修改 schema 時必須同步此函式及測試。

## 欄位

頂層只接受 `schemaVersion: 1` 與 `exhibitions` 陣列。未知欄位拒絕，避免拼字錯誤靜默失效。

| 欄位 | 必填／規則 |
| --- | --- |
| id | 必填；ASCII 小寫 kebab-case，全清單唯一 |
| status | 必填；draft / review / published；只有 published 公開索引 |
| primaryCategory | 必填；her-words / her-art / her-life / her-world；三首展分類另有固定核對 |
| tags | 必填陣列，可空；目前詞彙限上述四分類，不重複，不生成另一展覽頁 |
| locales | 必填；且僅 zh-Hant、en |
| locales.{lang}.title、summary | 必填非空字串；首頁索引用 HTML escaping 輸出，不把內容當標籤 |
| locales.{lang}.path | 必填；無開頭斜線的站內根相對路徑，必須精確對應 id 及語言，結尾 index.html |
| locales.{lang}.coverAlt | 有 cover 時兩語必填；無 cover 時不得存在 |
| displayOrder | 必填非負安全整數 |
| featured | 必填 boolean；featured 優先，其次 displayOrder，再依 ASCII id 排序；同一規則用於全部／分類索引 |
| relatedIds | 必填陣列，可空；唯一、不可自己、須存在且 published；draft 也不免除結構檢查 |
| researchPath | 必填；`docs/research/{id}/` 且資料夾存在 |
| updatedAt | 必填真實日期 YYYY-MM-DD；校驗日曆合法性 |
| publishedAt | 僅 published 必填；不得晚於 updatedAt；draft/review 不編造發布日 |
| cover | 選填物件，只有 path、assetId；path 為 `assets/images/{id}/{filename}`，支援 jpg/jpeg/png/webp/svg，檔案須存在；assetId 對應逐件權利紀錄，正式核准由人類審查 |

日期真實性、正文翻譯、素材權利及人類批准不能只靠 schema 驗證。目前三筆皆 draft，updatedAt 是本次本機更新日；沒有 publishedAt、cover 或 relatedIds 假資料。

## 跨檔驗證與生成範圍

所有狀態均檢查 ID、分類、雙語欄位／路徑、頁面 lang／h1／Sources 結構與 relatedIds。逐段目錄名稱精確比對大小寫，不使用 Windows 不區分大小寫的成功讀取冒充 Pages 路徑正確；拒絕 traversal、反斜線與 symlink。

目的頁規格：中文 `exhibitions/{id}/index.html`，英文 `en/exhibitions/{id}/index.html`。首頁連結從所在頁重新算相對深度，因此兩語首頁通常均輸出 `exhibitions/{id}/index.html`，實際各自位於對應語言的展覽目錄。

每個首頁恰有五對區域標記，`name` 為 all、her-words、her-art、her-life、her-world：

```html
<!-- HERSTORY:INDEX:all:START -->
（生成內容）
<!-- HERSTORY:INDEX:all:END -->
```

只替換 START 結尾到 END 開頭之間的字元；marker 本身、品牌、策展介紹、一般入口、四展區錨點與所有正文均不變。標記缺失、重複、錯配、巢狀都失敗，不猜測範圍。沒有 published 時輸出本語言「展覽籌備中」，HER ART 保留人工介紹，不造展覽補空。

完整驗證並準備兩語結果後才寫入；只有改變的首頁才寫檔。正常 I/O 例外時嘗試回復已寫檔案，驗證錯誤完全零寫入。跨兩檔不保證對電源中斷／程序終止的交易原子性；異常中止後先執行 `--check`，再生成修復。這個限制不影響驗證失敗不得留下單語更新的契約。

```powershell
node scripts/build-index.mjs
node scripts/build-index.mjs --check
node --test scripts/test-index.mjs
```

`--check` 包含資料有效性與兩語生成結果比對，過時／無效時非零退出，成功與失敗都不寫檔。測試使用隔離暫存副本，逐檔雜湊及 mtime 證明零寫入；重跑檢查不只看畫面。

## 不在 Registry 的內容

首頁策展文、About、固定導覽與一般公開頁不納入此表。新增一般頁按 I12 在兩語首頁人工加入語言正確的入口，並保留索引外原文與全站導覽。沒有另一個一般頁 Registry，沒有全站 HTML 自動重建命令。

草稿內容可供本機審閱，但 published 篩選不是權限系統。若直接上傳 draft 檔案，知道 URL 的人仍可讀取；目前 Pages 僅發布四頁白名單；擴大 artifact 必須另經審核。
