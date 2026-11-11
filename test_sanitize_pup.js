import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    const ALLOWED_TAGS = new Set([
      "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "b", "em", "i", "u", "s",
      "blockquote", "ul", "ol", "li",
      "hr", "br", "span", "img",
    ]);

    function sanitizeHtml(html) {
      if (!html) return "";
      if (!/<[^>]+>/.test(html)) {
        return html.split(/\n\n+/).filter((p) => p.trim()).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      }
      
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const disallowed = doc.querySelectorAll(
          "script, style, iframe, object, embed, link, meta, a, video, audio, input, form, button"
        );
        disallowed.forEach((el) => el.remove());

        const allElements = doc.querySelectorAll("*");
        allElements.forEach((el) => {
          const tag = el.tagName.toLowerCase();
          if (tag === "html" || tag === "head" || tag === "body") return;
          if (!ALLOWED_TAGS.has(tag)) {
            const parent = el.parentNode;
            if (parent) {
              while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
              }
              parent.removeChild(el);
            }
            return;
          }
        });

        return doc.body.innerHTML;
      }
      return html;
    }

    return {
      test1: sanitizeHtml('<p>SEAKUNOVEL_REAL_CONTENT_TEST_987654321</p>'),
      test2: sanitizeHtml('SEAKUNOVEL_REAL_CONTENT_TEST_987654321')
    };
  });

  console.log(result);
  await browser.close();
}
run();
