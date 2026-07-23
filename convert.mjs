// Converts Confluence storage-format XHTML into plain, self-contained HTML.
export function convertConfluenceStorage(html, titleAnchorMap = {}) {
  html = stripLayout(html);
  html = convertPanels(html);
  html = convertMisc(html, titleAnchorMap);
  return html;
}

function stripLayout(html) {
  return html.replace(/<\/?ac:layout(?:-section|-cell)?[^>]*>/g, '');
}

function convertPanels(html) {
  const macroRe = /<ac:structured-macro ac:name="panel"[^>]*>((?:(?!<ac:structured-macro)[\s\S])*?)<\/ac:structured-macro>/;
  let prev;
  do {
    prev = html;
    html = html.replace(macroRe, (match, inner) => {
      const titleMatch = inner.match(/<ac:parameter ac:name="title">([\s\S]*?)<\/ac:parameter>/);
      const title = titleMatch ? titleMatch[1] : '';
      const bodyMatch = inner.match(/<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>/);
      const body = bodyMatch ? bodyMatch[1] : inner;
      return `<div class="cf-panel">${title ? `<div class="cf-panel-title">${title}</div>` : ''}<div class="cf-panel-body">${body}</div></div>`;
    });
  } while (html !== prev);
  return html;
}

function convertMisc(html, titleAnchorMap) {
  html = html.replace(/<ac:inline-comment-marker[^>]*>([\s\S]*?)<\/ac:inline-comment-marker>/g, '$1');
  html = html.replace(/<time datetime="([^"]*)"\s*\/>/g, '$1');
  html = html.replace(/<ac:link>\s*<ri:user[^>]*\/>\s*<\/ac:link>/g, '<span class="cf-user">—</span>');
  html = html.replace(/<ac:link>\s*<ri:page ri:content-title="([^"]*)"\s*\/>\s*<\/ac:link>/g, (m, title) => {
    const anchor = titleAnchorMap[title];
    return anchor ? `<a href="#${anchor}">${title}</a>` : `<em>${title}</em>`;
  });
  html = html.replace(
    /<ac:image[^>]*>[\s\S]*?<ri:attachment ri:filename="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:image>/g,
    (m, filename) => `<div class="cf-image-placeholder">📎 圖片參考：${filename}（原圖請見 Confluence 附件）</div>`
  );
  // Safety net: unwrap any remaining unhandled ac:/ri: tags, keep inner text.
  html = html.replace(/<\/?ac:[a-zA-Z0-9-]+(?:\s+[^>]*)?\/?>/g, '');
  html = html.replace(/<\/?ri:[a-zA-Z0-9-]+(?:\s+[^>]*)?\/?>/g, '');
  return html;
}
