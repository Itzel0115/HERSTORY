# 展覽內容格式
這是最小可執行結構，不是要求三展使用同一敘事模板。

新增 id 先完成公開研究摘要，再建立兩頁；可複製既有 draft 頁的 head／header／footer，但清除全部舊展題名、主張及來源，替換所有分類、語言切換與章節 ID。兩語章節 ID 相同，正文各自自然撰寫。

中文資產前綴 ../../assets/；英文 ../../../assets/。
中文首頁 ../../index.html；英文 ../../../en/index.html。
中文 About ../../about/index.html；英文 ../../../en/about/index.html。
中文切英文 ../../en/exhibitions/{id}/index.html；英文切中文 ../../../exhibitions/{id}/index.html。
頁面 head 必須含 UTF-8、viewport、lang、title、description、本地 fonts.css／round5.css／site.css、site.js。新增專屬 CSS 先確認範圍並更新發布契約；不擅自引遠端字體或套件。

~~~html
<main id="main">
  <div class="page-heading">
    <p class="eyebrow"><a href="../../index.html#her-art">HER ART</a></p>
    <h1>核准工作題名</h1>
    <p class="notice">展覽籌備中，內容與翻譯待人工審核。</p>
  </div>
  <section class="text-page" id="question"><h2>策展問題</h2><p>有材料支持的問題。</p></section>
  <section class="text-page" id="reading"><h2>材料近讀</h2><p>已核對主張。<a href="#source-01">來源 1</a></p></section>
  <section class="text-page" id="sources"><h2>資料來源</h2>
    <p id="source-01">機構、題名、版本／證據位置、來源 URL、取用日期。</p>
    <p>AI 協助草稿；人工審核待完成。未取得圖像權利時不使用圖像。</p>
  </section>
  <section class="text-page" id="related"><h2>延伸探索</h2><a href="../../index.html#exhibitions">返回 Museum</a></section>
</main>
~~~
以上只示意 main；必須補齊 header 的首頁／About／data-language-switch、skip link、footer 四區回鏈。不可將示意句當作史實正文。

公開研究摘要可用以下四表，無新增圖片就明說，不假填權利：
1. Sources：ID｜機構／作者｜題名／URL｜證據位置｜取用日期。
2. Claims：ID｜中英章節與主張｜source ID｜supported／interpretation／unverified。
3. Assets：ID｜來源／授權證據｜署名／修改／alt｜cleared／pending／excluded。
4. Review：實際檢查者｜日期｜方法｜待審內容。草稿不能寫「已人工批准」。

新展 Registry 最小欄位：id、status=draft、primaryCategory、tags=[]、locales（zh-Hant/en 各 title/summary/path）、displayOrder（非負整數）、featured=false、relatedIds=[]、researchPath=docs/research/{id}/、updatedAt。日期用實際日期，無封面不加 cover／coverAlt，draft 不加 publishedAt。完整限制見 REGISTRY.md。
