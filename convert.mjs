// Converts Confluence storage-format XHTML into plain, self-contained HTML.
// imgDir: relative path (e.g. "assets/images/page-b") where this page's downloaded
// attachments live; ac:image/ri:attachment refs are rewritten to <img> tags pointing there.
export function convertConfluenceStorage(html, titleAnchorMap = {}, imgDir = '') {
  html = stripLayout(html);
  html = convertPanels(html);
  html = convertMisc(html, titleAnchorMap, imgDir);
  html = fixMissingTextColor(html);
  return html;
}

// Confluence authors rely on Confluence's own light-mode default (black text) and only set an
// explicit `color` when a cell has a dark background. Cells with a pastel background and no
// explicit color inherit this site's theme text color, which goes near-white in dark mode and
// becomes invisible. Force a fixed dark, readable color on any inline style that sets a
// background but no color, so these Confluence-authored pastel cells render correctly regardless
// of the page's light/dark theme.
function fixMissingTextColor(html) {
  return html.replace(/style="([^"]*)"/g, (match, style) => {
    const hasBg = /background(-color)?\s*:/.test(style);
    const hasColor = /(?:^|;)\s*color\s*:/.test(style);
    if (!hasBg || hasColor) return match;
    const sep = style.trim() === '' || style.trim().endsWith(';') ? '' : ';';
    return `style="${style}${sep}color:#1d1d1f;"`;
  });
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

function convertMisc(html, titleAnchorMap, imgDir) {
  html = html.replace(/<ac:inline-comment-marker[^>]*>([\s\S]*?)<\/ac:inline-comment-marker>/g, '$1');
  html = html.replace(/<time datetime="([^"]*)"\s*\/>/g, '$1');
  html = html.replace(/<ac:link>\s*<ri:user[^>]*\/>\s*<\/ac:link>/g, '<span class="cf-user">—</span>');
  html = html.replace(/<ac:link>\s*<ri:page ri:content-title="([^"]*)"\s*\/>\s*<\/ac:link>/g, (m, title) => {
    const anchor = titleAnchorMap[title];
    return anchor ? `<a href="#${anchor}">${title}</a>` : `<em>${title}</em>`;
  });
  html = html.replace(
    /<ac:image([^>]*)>[\s\S]*?<ri:attachment ri:filename="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:image>/g,
    (m, imgAttrs, filename) => {
      if (!imgDir) return `<div class="cf-image-placeholder">📎 圖片參考：${filename}（原圖請見 Confluence 附件）</div>`;
      const heightMatch = imgAttrs.match(/ac:height="([^"]*)"/);
      const style = heightMatch ? ` style="max-height:${heightMatch[1]}px;height:auto;max-width:100%;"` : ' style="max-width:100%;height:auto;"';
      return `<img class="cf-image" src="${imgDir}/${encodeURIComponent(filename)}" alt="${filename}" loading="lazy"${style} />`;
    }
  );
  // Safety net: unwrap any remaining unhandled ac:/ri: tags, keep inner text.
  html = html.replace(/<\/?ac:[a-zA-Z0-9-]+(?:\s+[^>]*)?\/?>/g, '');
  html = html.replace(/<\/?ri:[a-zA-Z0-9-]+(?:\s+[^>]*)?\/?>/g, '');
  return html;
}
