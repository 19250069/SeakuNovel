const { JSDOM } = require('jsdom');
const dom = new JSDOM();
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;

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

console.log('TEST 1:', sanitizeHtml('<p>SEAKUNOVEL_REAL_CONTENT_TEST_987654321</p>'));
console.log('TEST 2:', sanitizeHtml('SEAKUNOVEL_REAL_CONTENT_TEST_987654321'));
