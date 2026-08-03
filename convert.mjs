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
// explicit `color` when a cell has a dark background. Two mismatches result when this HTML is
// dropped onto our own light/dark-aware theme instead of Confluence's:
// 1. A pastel background with no explicit color inherits this site's theme text color, which
//    goes near-white in dark mode and becomes invisible on the light pastel. Force a fixed dark,
//    readable color in this case.
// 2. An explicit `color:var(--ds-text-accent-gray,#44546f)`-style annotation color with NO
//    background assumes it's sitting on Confluence's light page background. Here it sits on our
//    theme's surface color instead, so in dark mode a dark fallback color becomes unreadable.
//    Strip the color declaration in this case and let our theme-aware `color: var(--text)` (set
//    on <body>) take over, which is correct in both themes.
function fixMissingTextColor(html) {
  return html.replace(/style="([^"]*)"/g, (match, style) => {
    const decls = style.split(';').map((s) => s.trim()).filter(Boolean);
    const hasBg = decls.some((d) => /^background(-color)?\s*:/i.test(d));
    const hasColor = decls.some((d) => /^color\s*:/i.test(d));
    if (hasBg && !hasColor) {
      decls.push('color:#1d1d1f');
      return `style="${decls.join('; ')};"`;
    }
    if (!hasBg && hasColor) {
      const filtered = decls.filter((d) => !/^color\s*:/i.test(d));
      return filtered.length ? `style="${filtered.join('; ')};"` : '';
    }
    return match;
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
