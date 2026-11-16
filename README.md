# HERSTORY
**A Living Museum of Women's Stories, Art & Ideas.**

[公開網站](https://itzel0115.github.io/HERSTORY/) · [GitHub 專案](https://github.com/Itzel0115/HERSTORY) · [AI 員工手冊](AGENTS.md) · [W9 繳交說明](docs/SUBMISSION.md)

這是生成式 AI 課程 **W9（11/03）：建立自己的 AGENTS.md** 作業，不是 W10 Wiki 或簡報。HERSTORY 以女性歷史、藝術、思想與生活為主題，採用數位博物館形式，讓作品、文字與來源共同回答策展問題。它同時示範如何將 AI 的工作規則保存為可接手的專案文件。

## 現有成果
公開網站有中英文首頁、About、The Woven Archive 原創纖維與落字互動、四展區錨點及靜態閱讀替代。開發來源共10頁，三展都是 draft；公開 Pages 只有4頁與14份資產。沒有為作業補造史料或發布未完成展覽。

| 頁面 | 中文 | English | Pages |
|---|---|---|---|
| 首頁 | index.html | en/index.html | 公開 |
| About | about/index.html | en/about/index.html | 公開 |
| NÜSHU | exhibitions/nushu/index.html | en/exhibitions/nushu/index.html | draft，不部署 |
| Room | exhibitions/a-room-of-ones-own/index.html | en/exhibitions/a-room-of-ones-own/index.html | draft，不部署 |
| Hours | exhibitions/the-unseen-hours/index.html | en/exhibitions/the-unseen-hours/index.html | draft，不部署 |

HER WORDS、HER ART、HER LIFE、HER WORLD 只在首頁，沒有獨立展區頁。所有頁面使用配對語言入口；三展研究仍不完整。

## 本機使用
Node.js 24，HTML/CSS/Vanilla JS，沒有框架或 npm 安裝步驟。
~~~powershell
node scripts/build-index.mjs --check
node scripts/package-site.mjs
node scripts/check-package.mjs
node scripts/preview.mjs --submission
~~~
開啟 http://127.0.0.1:8030/HERSTORY/index.html ，Ctrl+C 停止。十頁開發預覽用 preview 不帶 --submission。公開來源不依賴本機研究圖片，乾淨 clone 可執行。

其他驗收：
~~~powershell
node scripts/build-index.mjs
node --test scripts/test-index.mjs
node scripts/check-site.mjs
node scripts/check-browser.mjs --submission
node --use-system-ca scripts/check-live.mjs https://itzel0115.github.io/HERSTORY/
~~~
瀏覽器檢查需已安裝 Chrome（可設 CHROME_PATH）；詳細結果寫在被忽略的 docs/qa/，不提交內部證據。--check 不寫檔。所有失敗非零退出，人工語意／權利審查不能由自動測試替代。

## 專案分工
- README：給人介紹成果、路徑、執行方式。
- AGENTS：給 AI 的目的、視覺、命名、資料夾、材料格式、四種工作流程、修改邊界與驗收規則。
- data/：單一 Registry 及 schema；scripts/：生成／打包／測試；assets/：核准樣式、互動及字體。
- docs/：必要規則、權利及精簡可公開來源摘要。歷史原型、研究擷取、交接與長篇 QA 已留在 Repository 外的完整內部備份，不屬公開版。
- _site/：白名單部署產物，不提交，不手改。

## 下一個 AI 如何繼續
使用者提出題目或材料 → AI 先讀 AGENTS.md → 確認任務類型與分類 → 查證來源／權利 → 建立公開來源摘要 → 策展與雙語頁 → 按任務更新 Registry → 執行生成器與測試 → 回報待審事項。

新增展覽是一筆新 Registry；既有展內新增材料只更新該展內容／日期，不增加展覽。共用元件修正回歸所有受影響頁。未核准內容維持 draft，生成器不讓它出現在首頁。新增一般公開頁則依 I12 人工更新兩語首頁入口，不加入展覽 Registry。

[內容格式](docs/CONTENT_FORMAT.md) · [Registry 契約](docs/REGISTRY.md) · [素材權利](docs/RIGHTS.md) · [接手測試結果](docs/REPEATABILITY.md)

## 發布
Public Repository 保留程式、規則與必要文件；GitHub Pages 使用手動 pages.yml，只上傳 _site/。大幅內容、素材及正式發布須取得授權。現有四頁的部署不是授權下一個 Agent 任意擴大公開範圍。三展與完整可及性／人工雙語審核仍待後續完成。
