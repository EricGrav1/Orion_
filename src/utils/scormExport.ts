import type { EditorBlock } from '../types/blocks.types';
import type { CourseTheme, StorylineDraft } from '../types/courseTheme.types';

interface ScormExportOptions {
  courseId: string;
  courseTitle: string;
  blocks: EditorBlock[];
  theme: CourseTheme;
}

interface StorylineScormExportOptions {
  courseId: string;
  courseTitle: string;
  storyline: StorylineDraft;
  theme: CourseTheme;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const textEncoder = new TextEncoder();

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugifyFilename(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'orion-course';
}

function toHexColor(value: string, fallback: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return fallback;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function validateBlocksForScormExport(blocks: EditorBlock[]): string[] {
  const visibleBlocks = blocks
    .filter((block) => !block.settings.hidden)
    .sort((left, right) => left.order - right.order);

  const errors: string[] = [];
  visibleBlocks.forEach((block, index) => {
    const label = `Block ${index + 1} (${block.type})`;
    if (block.type === 'image') {
      const src = block.content.src || '';
      const alt = (block.content.alt || '').trim();
      if (src && !alt) errors.push(`${label} is missing required alt text.`);
    }
    if (block.type === 'imagetext') {
      const src = block.content.imageSrc || '';
      const alt = (block.content.imageAlt || '').trim();
      if (src && !alt) errors.push(`${label} is missing required image alt text.`);
    }
  });

  return errors;
}

function buildSectionMarkup(block: EditorBlock, index: number): string {
  const safeIndex = index + 1;
  const styleAttr = block.settings.backgroundColor
    ? ` style="background:${escapeHtml(block.settings.backgroundColor)};"`
    : '';

  switch (block.type) {
    case 'heading': {
      const headingLevel = Math.min(3, Math.max(1, block.content.level || 2));
      return `
        <section class="lesson-section block-heading" data-section="${safeIndex}"${styleAttr}>
          <h${headingLevel}>${escapeHtml(block.content.text || `Section ${safeIndex}`)}</h${headingLevel}>
        </section>
      `;
    }
    case 'text': {
      return `
        <section class="lesson-section block-text" data-section="${safeIndex}"${styleAttr}>
          <div class="rich-text">${block.content.html || '<p>Add your text here.</p>'}</div>
        </section>
      `;
    }
    case 'image': {
      const altText = block.content.alt || 'Course image';
      return `
        <section class="lesson-section block-image" data-section="${safeIndex}"${styleAttr}>
          ${block.content.src ? `<img src="${escapeHtml(block.content.src)}" alt="${escapeHtml(altText)}" loading="lazy" />` : '<div class="img-placeholder">No image selected</div>'}
          ${block.content.caption ? `<p class="caption">${escapeHtml(block.content.caption)}</p>` : ''}
        </section>
      `;
    }
    case 'video': {
      const videoUrl = block.content.url || '';
      return `
        <section class="lesson-section block-video" data-section="${safeIndex}"${styleAttr}>
          <h3>Video</h3>
          ${
            videoUrl
              ? `<p><a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer">Open video in new tab</a></p>`
              : '<p>No video URL configured.</p>'
          }
        </section>
      `;
    }
    case 'divider': {
      const borderStyle = block.content.style || 'solid';
      return `
        <section class="lesson-section block-divider" data-section="${safeIndex}">
          <hr class="divider divider-${escapeHtml(borderStyle)}" />
        </section>
      `;
    }
    case 'quote': {
      return `
        <section class="lesson-section block-quote" data-section="${safeIndex}"${styleAttr}>
          <blockquote>
            <p>${escapeHtml(block.content.text || '')}</p>
            ${block.content.attribution ? `<footer>${escapeHtml(block.content.attribution)}</footer>` : ''}
          </blockquote>
        </section>
      `;
    }
    case 'cta': {
      const label = block.content.label || 'Continue';
      const target = block.content.url || '#';
      return `
        <section class="lesson-section block-cta" data-section="${safeIndex}"${styleAttr}>
          <a class="cta ${escapeHtml(block.content.style || 'primary')}" href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>
        </section>
      `;
    }
    case 'button': {
      const label = block.content.label || 'Button';
      const target = block.content.url || '#';
      const alignClass =
        block.content.align === 'center'
          ? 'align-center'
          : block.content.align === 'right'
            ? 'align-right'
            : 'align-left';
      const styleClass = block.content.style === 'secondary' ? 'secondary' : 'primary';
      return `
        <section class="lesson-section block-button ${alignClass}" data-section="${safeIndex}"${styleAttr}>
          <a class="cta ${escapeHtml(styleClass)}" href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>
        </section>
      `;
    }
    case 'accordion': {
      const items = block.content.items || [];
      return `
        <section class="lesson-section block-accordion" data-section="${safeIndex}"${styleAttr}>
          ${items
            .map(
              (item, itemIndex) => `
              <details ${itemIndex === 0 ? 'open' : ''}>
                <summary>${escapeHtml(item.title || `Item ${itemIndex + 1}`)}</summary>
                <div>${escapeHtml(item.body || '')}</div>
              </details>
            `
            )
            .join('\n')}
        </section>
      `;
    }
    case 'tabs': {
      const tabs = Array.isArray(block.content.tabs) ? block.content.tabs : [];
      const normalizedTabs =
        tabs.length > 0 ? tabs : [{ id: `tab-${safeIndex}-1`, title: 'Tab 1', body: '' }];
      const defaultTabId = normalizedTabs.some((tab) => tab.id === block.content.defaultTabId)
        ? block.content.defaultTabId
        : normalizedTabs[0].id;

      const tabButtons = normalizedTabs
        .map((tab, tabIndex) => {
          const isActive = tab.id === defaultTabId;
          const tabId = `tabs-${safeIndex}-tab-${tabIndex}`;
          const panelId = `tabs-${safeIndex}-panel-${tabIndex}`;
          return `
            <button
              type="button"
              class="tabs-tab${isActive ? ' active' : ''}"
              role="tab"
              id="${tabId}"
              aria-selected="${isActive ? 'true' : 'false'}"
              aria-controls="${panelId}"
              tabindex="${isActive ? '0' : '-1'}"
              data-tabs="${safeIndex}"
              data-tab="${escapeHtml(tab.id)}"
            >${escapeHtml(tab.title || `Tab ${tabIndex + 1}`)}</button>
          `;
        })
        .join('\n');

      const panels = normalizedTabs
        .map((tab, tabIndex) => {
          const isActive = tab.id === defaultTabId;
          const tabId = `tabs-${safeIndex}-tab-${tabIndex}`;
          const panelId = `tabs-${safeIndex}-panel-${tabIndex}`;
          return `
            <div
              class="tabs-panel${isActive ? ' active' : ''}"
              role="tabpanel"
              id="${panelId}"
              aria-labelledby="${tabId}"
              data-tabs="${safeIndex}"
              data-panel="${escapeHtml(tab.id)}"
              ${isActive ? '' : 'hidden'}
            >
              <h3>${escapeHtml(tab.title || `Tab ${tabIndex + 1}`)}</h3>
              <div class="tabs-body">${escapeHtml(tab.body || '')}</div>
            </div>
          `;
        })
        .join('\n');

      return `
        <section class="lesson-section block-tabs" data-section="${safeIndex}"${styleAttr}>
          <div class="tabs-shell" data-tabs-shell="${safeIndex}">
            <div class="tabs-tablist" role="tablist" aria-label="Tabs">
              ${tabButtons}
            </div>
            <div class="tabs-panels">
              ${panels}
            </div>
          </div>
        </section>
      `;
    }
    case 'flipcard': {
      const frontTitle = block.content.frontTitle || 'Front';
      const backTitle = block.content.backTitle || 'Back';
      const frontBody = block.content.frontBody || '';
      const backBody = block.content.backBody || '';
      return `
        <section class="lesson-section block-flipcard" data-section="${safeIndex}"${styleAttr}>
          <button
            type="button"
            class="flipcard"
            data-flipcard="${safeIndex}"
            aria-label="${escapeHtml(`Flip card: ${frontTitle}`)}"
            aria-expanded="false"
          >
            <span class="flipcard-face front">
              <span class="flipcard-head">${escapeHtml(frontTitle)}</span>
              <span class="flipcard-body">${escapeHtml(frontBody)}</span>
              <span class="flipcard-hint">Click to reveal</span>
            </span>
            <span class="flipcard-face back" aria-hidden="true">
              <span class="flipcard-head">${escapeHtml(backTitle)}</span>
              <span class="flipcard-body">${escapeHtml(backBody)}</span>
              <span class="flipcard-hint">Click to flip back</span>
            </span>
          </button>
        </section>
      `;
    }
    case 'timeline': {
      const items = Array.isArray(block.content.items) ? block.content.items : [];
      const steps = items
        .map(
          (item, itemIndex) => `
            <li class="timeline-step">
              <div class="timeline-marker">${itemIndex + 1}</div>
              <div class="timeline-copy">
                <div class="timeline-title">${escapeHtml(item.title || `Step ${itemIndex + 1}`)}</div>
                <div class="timeline-body">${escapeHtml(item.body || '')}</div>
              </div>
            </li>
          `
        )
        .join('\n');
      return `
        <section class="lesson-section block-timeline" data-section="${safeIndex}"${styleAttr}>
          <ol class="timeline" aria-label="Timeline">
            ${steps || '<li class="timeline-empty">Add timeline steps.</li>'}
          </ol>
        </section>
      `;
    }
    case 'imagetext': {
      const layoutClass = block.content.layout === 'right' ? 'layout-right' : 'layout-left';
      return `
        <section class="lesson-section block-imagetext ${layoutClass}" data-section="${safeIndex}"${styleAttr}>
          <div class="imagetext-media">
            ${
              block.content.imageSrc
                ? `<img src="${escapeHtml(block.content.imageSrc)}" alt="${escapeHtml(block.content.imageAlt || 'Illustration')}" loading="lazy" />`
                : '<div class="img-placeholder">No image selected</div>'
            }
          </div>
          <div class="imagetext-copy">
            <h3>${escapeHtml(block.content.heading || 'Section heading')}</h3>
            <p>${escapeHtml(block.content.body || '')}</p>
          </div>
        </section>
      `;
    }
    case 'quiz': {
      const options = block.content.options || [];
      const inputType = block.content.allowMultiple ? 'checkbox' : 'radio';
      const optionMarkup = options
        .map(
          (option, optionIndex) => `
            <label class="quiz-option">
              <input type="${inputType}" name="quiz-${safeIndex}" value="${optionIndex}" data-correct="${option.correct ? 'true' : 'false'}" />
              <span>${escapeHtml(option.text || `Option ${optionIndex + 1}`)}</span>
            </label>
          `
        )
        .join('\n');
      const explanation = block.content.explanation ? escapeHtml(block.content.explanation) : '';
      return `
        <section class="lesson-section block-quiz" data-section="${safeIndex}"${styleAttr}>
          <h3>${escapeHtml(block.content.question || 'Knowledge check')}</h3>
          <div class="quiz-options">${optionMarkup}</div>
          <button type="button" class="quiz-check" data-quiz="${safeIndex}" data-allow-multiple="${block.content.allowMultiple ? 'true' : 'false'}">Check answer</button>
          <p class="quiz-feedback" data-feedback="${safeIndex}" aria-live="polite"></p>
          ${explanation ? `<p class="quiz-explanation" data-explanation="${safeIndex}" hidden>${explanation}</p>` : ''}
        </section>
      `;
    }
    default:
      return `
        <section class="lesson-section" data-section="${safeIndex}"${styleAttr}>
          <p>${escapeHtml('Unsupported block type')}</p>
        </section>
      `;
  }
}

function buildManifestXml(courseId: string, courseTitle: string): string {
  const safeId = slugifyFilename(courseId);
  const safeTitle = escapeHtml(courseTitle || 'Orion Course');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="ORION-${safeId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 ims_xml.xsd
  http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${safeTitle}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>${safeTitle}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
    </resource>
  </resources>
</manifest>`;
}

function buildIndexHtml(courseTitle: string, blocks: EditorBlock[], theme: CourseTheme): string {
  const visibleBlocks = blocks
    .filter((block) => !block.settings.hidden)
    .sort((left, right) => left.order - right.order);
  const safeTitle = escapeHtml(courseTitle || 'Orion Course');
  const brand = toHexColor(theme.brandColor, '#D4A84B');
  const accent = toHexColor(theme.accentColor, '#264B8C');
  const fontFamily = theme.fontFamily || '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';

  const navItems = visibleBlocks
    .map((block, index) => {
      const label =
        block.type === 'heading'
          ? block.content.text || `Section ${index + 1}`
          : block.type === 'text'
            ? stripHtml(block.content.html || '').slice(0, 36) || `Section ${index + 1}`
            : `${block.type[0].toUpperCase()}${block.type.slice(1)} ${index + 1}`;
      return `<button type="button" class="nav-item" data-jump="${index}">${escapeHtml(label)}</button>`;
    })
    .join('\n');

  const sectionMarkup = visibleBlocks.length
    ? visibleBlocks.map((block, index) => buildSectionMarkup(block, index)).join('\n')
    : '<section class="lesson-section"><p>No visible content blocks found. Add content in Orion before exporting.</p></section>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      --brand: ${brand};
      --accent: ${accent};
      --text: #1e2433;
      --muted: #5a657d;
      --bg: #f5f7fb;
      --card: #ffffff;
      --border: #dbe2ef;
      --font: ${fontFamily};
    }
    * { box-sizing: border-box; }
	    body {
	      margin: 0;
	      font-family: var(--font);
	      background: linear-gradient(180deg, #eef2fa 0%, var(--bg) 100%);
	      color: var(--text);
	    }
	    a:focus-visible,
	    button:focus-visible,
	    input:focus-visible,
	    select:focus-visible,
	    textarea:focus-visible {
	      outline: 3px solid color-mix(in srgb, var(--accent) 55%, white);
	      outline-offset: 2px;
	    }
	    .shell { max-width: 1080px; margin: 0 auto; padding: 24px 16px 40px; }
	    .skip-link {
	      position: absolute;
	      left: -999px;
	      top: 10px;
	      background: #fff;
	      color: #111;
	      border: 1px solid var(--border);
	      border-radius: 999px;
	      padding: 8px 12px;
	      font-weight: 700;
	      text-decoration: none;
	      z-index: 10;
	    }
	    .skip-link:focus { left: 16px; }
	    .header {
	      background: var(--card);
	      border: 1px solid var(--border);
	      border-radius: 14px;
	      padding: 18px 18px 12px;
      margin-bottom: 14px;
    }
    .header h1 { margin: 0 0 10px; font-size: 1.9rem; line-height: 1.2; }
    .status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .status { color: var(--muted); font-size: 0.88rem; margin: 0; }
    .lms-badge {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: #fff;
      color: var(--muted);
    }
    .lms-badge.connected {
      border-color: color-mix(in srgb, var(--accent) 45%, white);
      background: color-mix(in srgb, var(--accent) 15%, white);
      color: #173864;
    }
    .lms-badge.preview {
      border-color: color-mix(in srgb, var(--brand) 45%, white);
      background: color-mix(in srgb, var(--brand) 16%, white);
      color: #5c4309;
    }
    .debug-toggle {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--muted);
      background: #fff;
      cursor: pointer;
    }
    .debug-toggle:hover { border-color: color-mix(in srgb, var(--accent) 35%, white); color: var(--text); }
    .debug-panel {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: rgba(15, 24, 45, 0.02);
      padding: 10px;
      margin-bottom: 12px;
    }
    .debug-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .debug-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      padding: 7px 8px;
      min-height: 52px;
      display: grid;
      gap: 4px;
      align-content: start;
    }
    .debug-label {
      font-size: 0.68rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 700;
    }
    .debug-value {
      font-size: 0.82rem;
      color: var(--text);
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .nav-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .nav-item {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 10px;
      background: #fff;
      cursor: pointer;
      color: var(--muted);
      font-size: 0.78rem;
    }
    .nav-item.active {
      border-color: var(--brand);
      color: #1b1b1b;
      background: color-mix(in srgb, var(--brand) 18%, white);
    }
    .lesson-frame {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
      min-height: 380px;
    }
    .lesson-section { display: none; animation: fade 220ms ease; }
    .lesson-section.active { display: block; }
    .lesson-section h1, .lesson-section h2, .lesson-section h3 { margin: 0 0 10px; line-height: 1.25; }
    .lesson-section p { margin: 0 0 10px; line-height: 1.6; }
    .lesson-section img { width: 100%; height: auto; border-radius: 10px; border: 1px solid var(--border); }
    .img-placeholder {
      border: 1px dashed var(--border);
      border-radius: 10px;
      padding: 24px;
      color: var(--muted);
      text-align: center;
    }
    .caption { color: var(--muted); font-size: 0.86rem; margin-top: 8px; }
    .block-divider .divider { border: none; border-top: 2px solid var(--border); margin: 4px 0; }
    .block-divider .divider-dashed { border-top-style: dashed; }
    .block-divider .divider-dotted { border-top-style: dotted; }
    .block-quote blockquote {
      margin: 0;
      border-left: 4px solid var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, white);
      border-radius: 8px;
      padding: 12px 12px 12px 14px;
    }
    .block-quote footer { color: var(--muted); font-size: 0.84rem; margin-top: 6px; }
    .cta {
      display: inline-flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      border: 1px solid transparent;
    }
    .cta.primary { background: var(--brand); color: #1a1a1a; }
    .cta.secondary { background: white; color: var(--accent); border-color: var(--accent); }
    .block-button.align-left { text-align: left; }
    .block-button.align-center { text-align: center; }
    .block-button.align-right { text-align: right; }
    .block-accordion details {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .block-accordion summary { cursor: pointer; font-weight: 600; }
    .tabs-shell { display: grid; gap: 10px; }
    .tabs-tablist { display: flex; flex-wrap: wrap; gap: 8px; }
    .tabs-tab {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 7px 12px;
      background: #fff;
      cursor: pointer;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .tabs-tab.active {
      border-color: var(--accent);
      color: #1b1b1b;
      background: color-mix(in srgb, var(--accent) 18%, white);
    }
    .tabs-panel {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #fff;
      padding: 12px 12px 10px;
    }
    .tabs-body { white-space: pre-wrap; color: var(--muted); line-height: 1.55; }
    .flipcard {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 0;
      background: transparent;
      cursor: pointer;
      perspective: 1200px;
      position: relative;
      display: block;
      text-align: left;
    }
    .flipcard-face {
      display: grid;
      gap: 8px;
      padding: 16px 16px 14px;
      border-radius: 16px;
      background: radial-gradient(circle at 18% 16%, color-mix(in srgb, var(--accent) 14%, white), #fff);
      color: var(--text);
      min-height: 160px;
      backface-visibility: hidden;
      transform-style: preserve-3d;
      transition: transform 380ms ease;
      white-space: pre-wrap;
    }
    .flipcard-face.back {
      background: radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--brand) 16%, white), #fff);
      transform: rotateY(180deg) translateZ(1px);
      position: absolute;
      inset: 0;
    }
    .flipcard-face.front { transform: rotateY(0deg) translateZ(1px); }
    .flipcard.is-flipped .flipcard-face.front { transform: rotateY(-180deg) translateZ(1px); }
    .flipcard.is-flipped .flipcard-face.back { transform: rotateY(0deg) translateZ(1px); }
    .flipcard-head { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; }
    .flipcard-body { color: var(--muted); line-height: 1.55; }
    .flipcard-hint { margin-top: auto; color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.9; }
    .timeline { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
    .timeline-step {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: start;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #fff;
      padding: 12px;
    }
    .timeline-marker {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-weight: 900;
      background: color-mix(in srgb, var(--accent) 14%, white);
      border: 1px solid color-mix(in srgb, var(--accent) 38%, white);
      color: #1a1a1a;
    }
    .timeline-copy { display: grid; gap: 4px; }
    .timeline-title { font-weight: 800; letter-spacing: -0.01em; }
    .timeline-body { color: var(--muted); line-height: 1.55; white-space: pre-wrap; }
    .timeline-empty { color: var(--muted); padding: 10px 2px; }
    .block-imagetext { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; }
    .block-imagetext.layout-right .imagetext-media { order: 2; }
    .block-quiz .quiz-options { display: grid; gap: 8px; margin: 10px 0; }
    .quiz-option {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
	    .quiz-check {
	      border: 1px solid var(--accent);
	      color: var(--accent);
	      background: white;
	      border-radius: 8px;
	      padding: 6px 10px;
	      cursor: pointer;
	      font-weight: 600;
	    }
	    .quiz-feedback { color: var(--muted); font-size: 0.86rem; min-height: 18px; margin-top: 8px; }
	    .quiz-explanation { color: var(--muted); font-size: 0.86rem; margin-top: 6px; }
	    .footer-controls {
	      margin-top: 14px;
	      display: flex;
	      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .controls-left { display: flex; gap: 8px; }
    .control-btn {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: white;
      color: var(--text);
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 600;
    }
    .control-btn.primary { background: var(--accent); border-color: var(--accent); color: white; }
    .progress { color: var(--muted); font-size: 0.86rem; }
    @keyframes fade {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 760px) {
      .block-imagetext { grid-template-columns: 1fr; }
      .footer-controls { flex-direction: column; align-items: stretch; }
      .controls-left { justify-content: space-between; }
      .debug-grid { grid-template-columns: 1fr; }
    }
  </style>
	</head>
	<body>
	  <main class="shell">
	    <a class="skip-link" href="#lesson-frame">Skip to content</a>
	    <header class="header">
	      <h1>${safeTitle}</h1>
	      <div class="status-row">
	        <div class="status" id="scorm-status">Preparing SCORM session…</div>
	        <span class="lms-badge preview" id="lms-badge">Preview mode</span>
	        <button type="button" class="debug-toggle" id="toggle-debug" aria-expanded="false">Debug</button>
	      </div>
	      <div class="debug-panel" id="scorm-debug" hidden>
	        <div class="debug-grid">
	          <div class="debug-item">
	            <div class="debug-label">Mode</div>
	            <div class="debug-value" id="debug-mode">Preview</div>
	          </div>
	          <div class="debug-item">
	            <div class="debug-label">Lesson Status</div>
	            <div class="debug-value" id="debug-lesson-status">—</div>
	          </div>
	          <div class="debug-item">
	            <div class="debug-label">Location</div>
	            <div class="debug-value" id="debug-location">0</div>
	          </div>
	          <div class="debug-item">
	            <div class="debug-label">Visited</div>
	            <div class="debug-value" id="debug-visited">0</div>
	          </div>
	          <div class="debug-item">
	            <div class="debug-label">Suspend Bytes</div>
	            <div class="debug-value" id="debug-suspend-size">0</div>
	          </div>
	          <div class="debug-item">
	            <div class="debug-label">Commits</div>
	            <div class="debug-value" id="debug-commits">0</div>
	          </div>
	          <div class="debug-item">
	            <div class="debug-label">Last Error</div>
	            <div class="debug-value" id="debug-error">None</div>
	          </div>
	        </div>
	      </div>
	      <nav class="nav-list">${navItems}</nav>
	    </header>

    <article class="lesson-frame" id="lesson-frame">
      ${sectionMarkup}
      <div class="footer-controls">
        <div class="controls-left">
          <button type="button" class="control-btn" id="prev-btn">Previous</button>
          <button type="button" class="control-btn" id="next-btn">Next</button>
        </div>
        <div class="progress" id="progress-text">Section 0 of 0</div>
        <button type="button" class="control-btn primary" id="mark-complete">Mark Complete</button>
      </div>
    </article>
  </main>

	  <script>
	    (function () {
	      var api = null;
	      var currentSection = 0;
	      var visited = '';
	      var completed = false;
      var lmsConnected = false;
      var commitCount = 0;
      var suspendBytes = 0;
      var lastError = 'None';
	      var sections = Array.prototype.slice.call(document.querySelectorAll('.lesson-section'));
	      var navButtons = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
	      var statusEl = document.getElementById('scorm-status');
      var badgeEl = document.getElementById('lms-badge');
      var debugPanelEl = document.getElementById('scorm-debug');
      var debugToggleEl = document.getElementById('toggle-debug');
      var debugModeEl = document.getElementById('debug-mode');
      var debugLessonStatusEl = document.getElementById('debug-lesson-status');
      var debugLocationEl = document.getElementById('debug-location');
      var debugVisitedEl = document.getElementById('debug-visited');
      var debugSuspendSizeEl = document.getElementById('debug-suspend-size');
      var debugCommitsEl = document.getElementById('debug-commits');
      var debugErrorEl = document.getElementById('debug-error');
	      var progressEl = document.getElementById('progress-text');
	      var prevBtn = document.getElementById('prev-btn');
      var nextBtn = document.getElementById('next-btn');
      var completeBtn = document.getElementById('mark-complete');

      function findApi(win) {
        var depth = 0;
        while (win && !win.API && win.parent && win.parent !== win && depth < 10) {
          depth += 1;
          win = win.parent;
        }
        return win ? win.API : null;
      }

      function setLastError(error) {
        if (!error) return;
        var text = error && error.message ? String(error.message) : String(error);
        lastError = text.slice(0, 120) || 'Unknown error';
      }

      function refreshDebug() {
        if (debugModeEl) debugModeEl.textContent = lmsConnected ? 'LMS Connected' : 'Preview';
        if (debugLessonStatusEl) debugLessonStatusEl.textContent = scormGet('cmi.core.lesson_status') || '—';
        if (debugLocationEl) debugLocationEl.textContent = String(currentSection);
        if (debugVisitedEl) debugVisitedEl.textContent = String(countVisited()) + '/' + String(sections.length || 0);
        if (debugSuspendSizeEl) debugSuspendSizeEl.textContent = String(suspendBytes);
        if (debugCommitsEl) debugCommitsEl.textContent = String(commitCount);
        if (debugErrorEl) debugErrorEl.textContent = lastError;
      }

      function setMode(isConnected) {
        lmsConnected = !!isConnected;
        if (!badgeEl) return;
        badgeEl.classList.toggle('connected', lmsConnected);
        badgeEl.classList.toggle('preview', !lmsConnected);
        badgeEl.textContent = lmsConnected ? 'LMS Connected' : 'Preview mode';
      }

      function scormSet(name, value) {
        if (!api || typeof api.LMSSetValue !== 'function') return;
        try {
          api.LMSSetValue(name, String(value));
        } catch (_error) {
          setLastError(_error);
        }
      }

      function scormGet(name) {
        if (!api || typeof api.LMSGetValue !== 'function') return '';
        try {
          return api.LMSGetValue(name) || '';
        } catch (_error) {
          setLastError(_error);
          return '';
        }
      }

      function scormCommit() {
        if (api && typeof api.LMSCommit === 'function') {
          try {
            api.LMSCommit('');
            commitCount += 1;
          } catch (_error) {
            setLastError(_error);
          }
        }
        refreshDebug();
      }

      function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
        refreshDebug();
      }

	      function normalizeVisited(raw, length) {
	        var safe = typeof raw === 'string' ? raw : '';
	        var out = '';
	        for (var i = 0; i < length; i += 1) {
	          var ch = safe.charAt(i);
	          out += ch === '1' ? '1' : '0';
	        }
	        return out;
	      }

	      function setVisitedAt(index) {
	        if (index < 0 || index >= sections.length) return;
	        if (!visited || visited.length !== sections.length) {
	          visited = normalizeVisited(visited, sections.length);
	        }
	        visited = visited.slice(0, index) + '1' + visited.slice(index + 1);
	      }

	      function countVisited() {
	        var total = 0;
	        for (var i = 0; i < visited.length; i += 1) {
	          if (visited.charAt(i) === '1') total += 1;
	        }
	        return total;
	      }

	      function buildSuspendData() {
	        return JSON.stringify({ c: currentSection, v: visited });
	      }

	      function loadSuspendData() {
	        var raw = scormGet('cmi.suspend_data');
	        if (!raw) return null;
	        try {
	          var parsed = JSON.parse(raw);
	          if (!parsed || typeof parsed !== 'object') return null;
	          return parsed;
	        } catch (_error) {
	          return null;
	        }
	      }

	      function persistState() {
	        if (!api) return;
	        scormSet('cmi.core.lesson_location', currentSection);
	        var suspend = buildSuspendData();
        suspendBytes = suspend.length;
	        // SCORM 1.2 suspend_data is typically limited to 4096 chars.
	        if (suspend.length < 3900) {
	          scormSet('cmi.suspend_data', suspend);
	        }
	        scormCommit();
        refreshDebug();
	      }

	      function updateProgress() {
	        var total = sections.length || 1;
	        var visitedCount = Math.max(1, countVisited());
	        if (progressEl) {
	          progressEl.textContent =
	            'Section ' + (currentSection + 1) + ' of ' + total + ' • Visited ' + visitedCount + '/' + total;
	        }
	        var percent = Math.round((visitedCount / total) * 100);
	        scormSet('cmi.core.score.min', 0);
	        scormSet('cmi.core.score.max', 100);
	        scormSet('cmi.core.score.raw', percent);

	        if (!completed && visitedCount >= total && total > 0) {
	          completed = true;
	          scormSet('cmi.core.lesson_status', 'completed');
	          setStatus('All sections visited.');
	        }
        refreshDebug();
	      }

	      function showSection(index) {
	        if (!sections.length) return;
	        currentSection = Math.min(Math.max(index, 0), sections.length - 1);
	        setVisitedAt(currentSection);
	        sections.forEach(function (section, sectionIndex) {
	          section.classList.toggle('active', sectionIndex === currentSection);
	        });
	        navButtons.forEach(function (button, navIndex) {
	          button.classList.toggle('active', navIndex === currentSection);
	        });
	        if (prevBtn) prevBtn.disabled = currentSection <= 0;
	        if (nextBtn) nextBtn.disabled = currentSection >= sections.length - 1;
	        updateProgress();
	        persistState();
	      }

	      function markComplete() {
	        completed = true;
	        scormSet('cmi.core.lesson_status', 'completed');
	        scormSet('cmi.core.exit', 'logout');
	        persistState();
	        setStatus('Course marked completed.');
	      }

	      function checkQuiz(button) {
	        var quizIndex = button.getAttribute('data-quiz');
	        var options = Array.prototype.slice.call(document.querySelectorAll('input[name="quiz-' + quizIndex + '"]'));
	        var feedback = document.querySelector('[data-feedback="' + quizIndex + '"]');
	        var explanation = document.querySelector('[data-explanation="' + quizIndex + '"]');
	        var checked = options.filter(function (option) { return option.checked; });
	        if (!checked.length) {
	          if (feedback) feedback.textContent = 'Select an answer first.';
	          if (explanation) explanation.setAttribute('hidden', '');
	          return;
	        }
	        function isTrue(value) {
	          var raw = (value || 'false').trim().toLowerCase();
	          return raw === 'true' || raw === '1' || raw === 'yes';
	        }
	        var anyWrong = checked.some(function (option) { return !isTrue(option.getAttribute('data-correct')); });
	        var missingCorrect = options.some(function (option) {
	          return isTrue(option.getAttribute('data-correct')) && !option.checked;
	        });
	        var correct = !anyWrong && !missingCorrect;
	        if (feedback) {
	          feedback.textContent = correct ? 'Correct.' : 'Not quite. Try again.';
	        }
	        if (explanation) explanation.removeAttribute('hidden');
	      }

      function selectTab(button) {
        var group = button.getAttribute('data-tabs');
        var tabId = button.getAttribute('data-tab') || '';
        var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs-tab[data-tabs="' + group + '"]'));
        var panels = Array.prototype.slice.call(document.querySelectorAll('.tabs-panel[data-tabs="' + group + '"]'));
        tabs.forEach(function (btn) {
          var isActive = (btn.getAttribute('data-tab') || '') === tabId;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        panels.forEach(function (panel) {
          var isActive = (panel.getAttribute('data-panel') || '') === tabId;
          panel.classList.toggle('active', isActive);
          if (isActive) panel.removeAttribute('hidden');
          else panel.setAttribute('hidden', '');
        });
      }

      function initTabs() {
        var all = Array.prototype.slice.call(document.querySelectorAll('.tabs-tab'));
        all.forEach(function (button) {
          button.addEventListener('click', function () {
            selectTab(button);
          });
          button.addEventListener('keydown', function (event) {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            var group = button.getAttribute('data-tabs');
            var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs-tab[data-tabs="' + group + '"]'));
            if (!tabs.length) return;
            var currentIndex = tabs.findIndex(function (t) { return t.classList.contains('active'); });
            if (currentIndex < 0) currentIndex = 0;
            var delta = event.key === 'ArrowLeft' ? -1 : 1;
            var nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
            var nextBtn = tabs[nextIndex];
            if (nextBtn) {
              selectTab(nextBtn);
              nextBtn.focus();
            }
          });
        });
      }

      function initFlipCards() {
        var cards = Array.prototype.slice.call(document.querySelectorAll('.flipcard'));
        cards.forEach(function (card) {
          card.addEventListener('click', function () {
            var flipped = card.classList.toggle('is-flipped');
            card.setAttribute('aria-expanded', flipped ? 'true' : 'false');
            var backFace = card.querySelector('.flipcard-face.back');
            if (backFace) backFace.setAttribute('aria-hidden', flipped ? 'false' : 'true');
          });
          card.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              card.click();
            }
          });
        });
      }

	      function initializeScorm() {
	        api = findApi(window);
	        if (!api || typeof api.LMSInitialize !== 'function') {
          setMode(false);
	          setStatus('Preview mode (no SCORM LMS API detected).');
	          visited = normalizeVisited('', sections.length);
	          showSection(0);
          refreshDebug();
	          return;
	        }

        var initialized = api.LMSInitialize('');
        if (initialized !== 'true') {
          setMode(false);
          setStatus('Failed to initialize SCORM API.');
          showSection(0);
          refreshDebug();
          return;
        }

        setMode(true);
	        var lessonStatus = scormGet('cmi.core.lesson_status');
	        if (!lessonStatus || lessonStatus === 'not attempted') {
	          scormSet('cmi.core.lesson_status', 'incomplete');
	        }
	        scormSet('cmi.core.exit', 'suspend');
	        var state = loadSuspendData();
	        var resumeAt = state && typeof state.c === 'number' ? state.c : parseInt(scormGet('cmi.core.lesson_location'), 10);
	        var startIndex = Number.isFinite(resumeAt) ? resumeAt : 0;
	        visited = normalizeVisited(state && typeof state.v === 'string' ? state.v : '', sections.length);
	        setStatus('SCORM session active.');
	        showSection(startIndex);
	        scormCommit();
        refreshDebug();
	      }

      navButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          var index = parseInt(button.getAttribute('data-jump') || '0', 10);
          showSection(index);
        });
      });
      if (prevBtn) prevBtn.addEventListener('click', function () { showSection(currentSection - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { showSection(currentSection + 1); });
      if (completeBtn) completeBtn.addEventListener('click', markComplete);
      if (debugToggleEl && debugPanelEl) {
        debugToggleEl.addEventListener('click', function () {
          var isHidden = debugPanelEl.hasAttribute('hidden');
          if (isHidden) debugPanelEl.removeAttribute('hidden');
          else debugPanelEl.setAttribute('hidden', '');
          debugToggleEl.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          debugToggleEl.textContent = isHidden ? 'Hide Debug' : 'Debug';
        });
      }
      Array.prototype.slice.call(document.querySelectorAll('.quiz-check')).forEach(function (button) {
        button.addEventListener('click', function () { checkQuiz(button); });
      });
      initTabs();
      initFlipCards();

	      window.addEventListener('beforeunload', function () {
	        if (!api) return;
	        scormSet('cmi.core.exit', completed ? 'logout' : 'suspend');
	        persistState();
	        try {
	          if (typeof api.LMSFinish === 'function') api.LMSFinish('');
	        } catch (_error) {
	          // Ignore finish errors.
	        }
	      });

      setMode(false);
      refreshDebug();
      initializeScorm();
    })();
  </script>
</body>
</html>`;
}

function buildStorylineIndexHtml(courseTitle: string, storyline: StorylineDraft, theme: CourseTheme): string {
  const safeTitle = escapeHtml(courseTitle || 'Orion Interactive Course');
  const brand = toHexColor(theme.brandColor, '#D4A84B');
  const accent = toHexColor(theme.accentColor, '#264B8C');
  const fontFamily = theme.fontFamily || '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  const storylinePayload = JSON.stringify(storyline)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      --brand: ${brand};
      --accent: ${accent};
      --text: #1e2433;
      --muted: #5a657d;
      --bg: #f4f6fb;
      --card: #ffffff;
      --border: #dce2ef;
      --font: ${fontFamily};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font);
      background: linear-gradient(180deg, #eef2fa 0%, var(--bg) 100%);
      color: var(--text);
    }
    .shell { max-width: 1140px; margin: 0 auto; padding: 24px 16px 36px; }
    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 12px;
    }
    .header h1 { margin: 0 0 8px; font-size: 1.8rem; line-height: 1.2; }
    .status { color: var(--muted); font-size: 0.9rem; margin-bottom: 8px; }
    .progress { color: var(--muted); font-size: 0.85rem; }
    .layout { display: grid; gap: 12px; grid-template-columns: 220px 1fr 260px; }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
    }
    .panel h2 { margin: 0 0 10px; font-size: 0.95rem; letter-spacing: 0.01em; }
    .scene-list { display: grid; gap: 6px; }
    .scene-btn {
      width: 100%;
      text-align: left;
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 10px;
      color: var(--text);
      padding: 8px 10px;
      cursor: pointer;
      font-size: 0.86rem;
    }
    .scene-btn.active {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, white);
    }
    .scene-card h3 { margin: 0 0 8px; font-size: 1.3rem; }
    .scene-summary { color: var(--muted); line-height: 1.55; margin: 0 0 14px; }
    .choice-grid { display: grid; gap: 8px; margin-bottom: 12px; }
    .choice-btn {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--text);
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      font-weight: 600;
    }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .control-btn {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--text);
      padding: 7px 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.84rem;
    }
    .control-btn.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }
    .runtime-log {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px;
      background: rgba(15, 24, 45, 0.02);
      display: grid;
      gap: 6px;
      max-height: 180px;
      overflow-y: auto;
    }
    .runtime-log-row { font-size: 0.82rem; color: var(--muted); line-height: 1.35; }
    .runtime-log-row strong { color: var(--text); }
    .variable-list { display: grid; gap: 7px; }
    .variable-row {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 7px 8px;
      background: rgba(15, 24, 45, 0.02);
    }
    .variable-name { font-size: 0.76rem; color: var(--muted); margin-bottom: 4px; }
    .variable-value {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text);
      overflow-wrap: anywhere;
    }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="header">
      <h1>${safeTitle}</h1>
      <div class="status" id="scorm-status">Preparing SCORM session…</div>
      <div class="progress" id="story-progress">Visited 0 of 0 scenes</div>
    </header>

    <div class="layout">
      <aside class="panel">
        <h2>Scenes</h2>
        <div class="scene-list" id="scene-list"></div>
      </aside>

      <section class="panel scene-card">
        <h3 id="scene-title">Scene</h3>
        <p class="scene-summary" id="scene-summary">Scene summary</p>
        <div class="choice-grid" id="choice-grid"></div>
        <div class="controls">
          <button type="button" class="control-btn" id="btn-on-click">Run on_click</button>
          <button type="button" class="control-btn" id="btn-timeline-end">Run timeline_end</button>
          <button type="button" class="control-btn" id="btn-reset">Reset preview</button>
          <button type="button" class="control-btn primary" id="btn-complete">Mark Complete</button>
        </div>
        <div class="runtime-log" id="runtime-log"></div>
      </section>

      <aside class="panel">
        <h2>Variables</h2>
        <div class="variable-list" id="variable-list"></div>
      </aside>
    </div>
  </main>

  <script id="storyline-data" type="application/json">${storylinePayload}</script>
  <script>
    (function () {
      var rawData = document.getElementById('storyline-data');
      var data = {};
      try {
        data = JSON.parse((rawData && rawData.textContent) || '{}');
      } catch (error) {
        data = {};
      }

      var nodes = Array.isArray(data.nodes) ? data.nodes : [];
      var connections = Array.isArray(data.connections) ? data.connections : [];
      var triggers = Array.isArray(data.triggers) ? data.triggers : [];
      var variableDefs = Array.isArray(data.variables) ? data.variables : [];
      var nodeById = {};
      nodes.forEach(function (node) {
        if (node && typeof node.id === 'string') nodeById[node.id] = node;
      });

      var sceneListEl = document.getElementById('scene-list');
      var sceneTitleEl = document.getElementById('scene-title');
      var sceneSummaryEl = document.getElementById('scene-summary');
      var choiceGridEl = document.getElementById('choice-grid');
      var variableListEl = document.getElementById('variable-list');
      var runtimeLogEl = document.getElementById('runtime-log');
      var statusEl = document.getElementById('scorm-status');
      var progressEl = document.getElementById('story-progress');
      var onClickBtn = document.getElementById('btn-on-click');
      var timelineEndBtn = document.getElementById('btn-timeline-end');
      var resetBtn = document.getElementById('btn-reset');
      var completeBtn = document.getElementById('btn-complete');

      var api = null;
      var logs = [];
      var visited = {};
      var variableState = {};
      var sceneIds = nodes.map(function (node) { return node.id; });
      var firstSceneId = sceneIds[0] || '';
      var configuredStart = typeof data.startNodeId === 'string' && nodeById[data.startNodeId] ? data.startNodeId : null;
      var currentSceneId = configuredStart || firstSceneId;

      function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
      }

      function appendLog(message, emphasize) {
        logs.push({ message: message, emphasize: !!emphasize });
        if (logs.length > 24) logs = logs.slice(logs.length - 24);
        if (!runtimeLogEl) return;
        runtimeLogEl.innerHTML = logs
          .map(function (entry) {
            return '<div class="runtime-log-row">' + (entry.emphasize ? '<strong>' + entry.message + '</strong>' : entry.message) + '</div>';
          })
          .join('');
      }

      function findApi(win) {
        var depth = 0;
        while (win && !win.API && win.parent && win.parent !== win && depth < 10) {
          depth += 1;
          win = win.parent;
        }
        return win ? win.API : null;
      }

      function scormSet(name, value) {
        if (!api || typeof api.LMSSetValue !== 'function') return;
        api.LMSSetValue(name, String(value));
      }

      function scormGet(name) {
        if (!api || typeof api.LMSGetValue !== 'function') return '';
        return api.LMSGetValue(name) || '';
      }

      function scormCommit() {
        if (api && typeof api.LMSCommit === 'function') api.LMSCommit('');
      }

      function normalizeByType(value, type) {
        if (type === 'number') {
          var numeric = Number(value);
          return Number.isFinite(numeric) ? numeric : 0;
        }
        if (type === 'boolean') {
          var normalized = String(value || '').trim().toLowerCase();
          return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        return String(value == null ? '' : value);
      }

      function evaluateCondition(condition) {
        if (!condition || typeof condition.variableId !== 'string') return false;
        var variable = variableDefs.find(function (candidate) { return candidate.id === condition.variableId; });
        if (!variable) return false;
        var left = normalizeByType(variableState[condition.variableId], variable.type);
        var right = normalizeByType(condition.value, variable.type);
        if (condition.operator === 'not_equals') return left !== right;
        if (condition.operator === 'greater_than') return Number(left) > Number(right);
        if (condition.operator === 'less_than') return Number(left) < Number(right);
        return left === right;
      }

      function executeEvent(eventName, allowSceneChange) {
        var sceneBefore = currentSceneId;
        var sceneAfter = currentSceneId;
        var relevant = triggers.filter(function (trigger) {
          return trigger && trigger.sceneId === sceneBefore && trigger.event === eventName;
        });
        if (!relevant.length) return false;

        relevant.forEach(function (trigger) {
          var conditionList = Array.isArray(trigger.conditions) ? trigger.conditions : [];
          var actionList = Array.isArray(trigger.actions) ? trigger.actions : [];
          var conditionsPass = conditionList.every(evaluateCondition);
          if (!conditionsPass) {
            appendLog('Skipped "' + (trigger.label || 'Trigger') + '" (conditions failed).', false);
            return;
          }

          appendLog('Fired "' + (trigger.label || 'Trigger') + '".', true);
          actionList.forEach(function (action) {
            if (!action) return;
            if (action.type === 'set_variable' && action.variableId) {
              variableState[action.variableId] = String(action.value == null ? '' : action.value);
              var variableName = action.variableId;
              var variable = variableDefs.find(function (candidate) { return candidate.id === action.variableId; });
              if (variable && variable.name) variableName = variable.name;
              appendLog('Set ' + variableName + ' = ' + variableState[action.variableId] + '.', false);
            }
            if (allowSceneChange && action.type === 'go_to_scene' && action.targetSceneId && nodeById[action.targetSceneId]) {
              sceneAfter = action.targetSceneId;
            }
          });
        });

        if (allowSceneChange && sceneAfter !== currentSceneId) {
          currentSceneId = sceneAfter;
          appendLog('Moved to ' + (nodeById[currentSceneId] && nodeById[currentSceneId].title ? nodeById[currentSceneId].title : 'next scene') + '.', true);
          return true;
        }

        return false;
      }

      function updateProgress() {
        var total = sceneIds.length || 1;
        var visitedCount = Object.keys(visited).length;
        if (progressEl) {
          progressEl.textContent = 'Visited ' + visitedCount + ' of ' + total + ' scenes';
        }
        var percent = Math.round((visitedCount / total) * 100);
        scormSet('cmi.core.score.raw', percent);
        if (visitedCount >= total && total > 0) {
          scormSet('cmi.core.lesson_status', 'completed');
        }
      }

      function saveSuspendData() {
        var payload = {
          scene: currentSceneId,
          visited: Object.keys(visited),
          vars: variableState,
        };
        var raw = JSON.stringify(payload);
        scormSet('cmi.suspend_data', raw.slice(0, 3800));
      }

      function renderSceneList() {
        if (!sceneListEl) return;
        sceneListEl.innerHTML = nodes
          .map(function (scene) {
            var activeClass = scene.id === currentSceneId ? ' active' : '';
            return '<button type="button" class="scene-btn' + activeClass + '" data-scene-id="' + scene.id + '">' + (scene.title || 'Scene') + '</button>';
          })
          .join('');
        Array.prototype.slice.call(sceneListEl.querySelectorAll('[data-scene-id]')).forEach(function (button) {
          button.addEventListener('click', function () {
            var nextId = button.getAttribute('data-scene-id') || '';
            jumpToScene(nextId, true);
          });
        });
      }

      function renderVariables() {
        if (!variableListEl) return;
        if (!variableDefs.length) {
          variableListEl.innerHTML = '<div class="variable-row"><div class="variable-name">No variables</div><div class="variable-value">This scene flow has no variables yet.</div></div>';
          return;
        }
        variableListEl.innerHTML = variableDefs
          .map(function (variable) {
            var value = variableState[variable.id];
            return '<div class="variable-row"><div class="variable-name">' + (variable.name || variable.id) + '</div><div class="variable-value">' + String(value == null ? '' : value) + '</div></div>';
          })
          .join('');
      }

      function renderSceneCard() {
        var scene = nodeById[currentSceneId];
        if (!scene) return;
        if (sceneTitleEl) sceneTitleEl.textContent = scene.title || 'Scene';
        if (sceneSummaryEl) sceneSummaryEl.textContent = scene.summary || 'No summary.';
        if (!choiceGridEl) return;
        var outgoing = connections.filter(function (connection) {
          return connection && connection.fromId === currentSceneId && nodeById[connection.toId];
        });
        if (!outgoing.length) {
          choiceGridEl.innerHTML = '<div class="runtime-log-row">No explicit branch choices from this scene.</div>';
        } else {
          choiceGridEl.innerHTML = outgoing
            .map(function (connection) {
              return '<button type="button" class="choice-btn" data-target-scene="' + connection.toId + '">' + (connection.label || 'Continue') + ' → ' + (nodeById[connection.toId].title || 'Scene') + '</button>';
            })
            .join('');
          Array.prototype.slice.call(choiceGridEl.querySelectorAll('[data-target-scene]')).forEach(function (button) {
            button.addEventListener('click', function () {
              var targetSceneId = button.getAttribute('data-target-scene') || '';
              jumpToScene(targetSceneId, true);
            });
          });
        }
      }

      function render() {
        renderSceneList();
        renderSceneCard();
        renderVariables();
      }

      function resolveOnEntryChain(maxSteps) {
        var steps = 0;
        while (steps < maxSteps) {
          var changed = executeEvent('on_entry', true);
          if (!changed) break;
          visited[currentSceneId] = true;
          steps += 1;
        }
      }

      function jumpToScene(sceneId, runEntry) {
        if (!sceneId || !nodeById[sceneId]) return;
        currentSceneId = sceneId;
        visited[currentSceneId] = true;
        if (runEntry) resolveOnEntryChain(6);
        scormSet('cmi.core.lesson_location', currentSceneId);
        updateProgress();
        saveSuspendData();
        scormCommit();
        render();
      }

      function runEventFromButton(eventName) {
        var moved = executeEvent(eventName, true);
        if (moved) {
          visited[currentSceneId] = true;
          resolveOnEntryChain(6);
        }
        updateProgress();
        saveSuspendData();
        scormCommit();
        render();
      }

      function resetPreview() {
        var startScene = configuredStart || firstSceneId;
        variableDefs.forEach(function (variable) {
          variableState[variable.id] = String(variable.initialValue == null ? '' : variable.initialValue);
        });
        visited = {};
        logs = [];
        appendLog('Preview reset to start scene.', true);
        jumpToScene(startScene, true);
      }

      function markComplete() {
        scormSet('cmi.core.lesson_status', 'completed');
        scormSet('cmi.core.exit', 'logout');
        saveSuspendData();
        scormCommit();
        setStatus('Course marked completed.');
        appendLog('Marked course complete.', true);
      }

      function initializeScorm() {
        api = findApi(window);
        if (!api || typeof api.LMSInitialize !== 'function') {
          setStatus('Preview mode (no SCORM LMS API detected).');
          resetPreview();
          return;
        }

        var initialized = api.LMSInitialize('');
        if (initialized !== 'true') {
          setStatus('Failed to initialize SCORM API.');
          resetPreview();
          return;
        }

        var status = scormGet('cmi.core.lesson_status');
        if (!status || status === 'not attempted') {
          scormSet('cmi.core.lesson_status', 'incomplete');
        }
        scormSet('cmi.core.exit', 'suspend');

        var resumeScene = scormGet('cmi.core.lesson_location');
        var suspendRaw = scormGet('cmi.suspend_data');
        if (suspendRaw) {
          try {
            var parsed = JSON.parse(suspendRaw);
            if (parsed && parsed.vars && typeof parsed.vars === 'object') {
              Object.keys(parsed.vars).forEach(function (key) {
                variableState[key] = String(parsed.vars[key] == null ? '' : parsed.vars[key]);
              });
            }
            if (parsed && Array.isArray(parsed.visited)) {
              parsed.visited.forEach(function (sceneId) {
                if (typeof sceneId === 'string' && nodeById[sceneId]) {
                  visited[sceneId] = true;
                }
              });
            }
            if (!resumeScene && parsed && typeof parsed.scene === 'string') {
              resumeScene = parsed.scene;
            }
          } catch (error) {
            appendLog('Could not restore saved runtime state.', false);
          }
        }

        var startSceneId = nodeById[resumeScene] ? resumeScene : (configuredStart || firstSceneId);
        setStatus('SCORM session active.');
        jumpToScene(startSceneId, true);
      }

      variableDefs.forEach(function (variable) {
        variableState[variable.id] = String(variable.initialValue == null ? '' : variable.initialValue);
      });

      if (onClickBtn) onClickBtn.addEventListener('click', function () { runEventFromButton('on_click'); });
      if (timelineEndBtn) timelineEndBtn.addEventListener('click', function () { runEventFromButton('timeline_end'); });
      if (resetBtn) resetBtn.addEventListener('click', resetPreview);
      if (completeBtn) completeBtn.addEventListener('click', markComplete);

      window.addEventListener('beforeunload', function () {
        saveSuspendData();
        scormCommit();
        if (api && typeof api.LMSFinish === 'function') api.LMSFinish('');
      });

      if (!sceneIds.length) {
        setStatus('No scenes found in this Storyline export.');
        if (sceneTitleEl) sceneTitleEl.textContent = 'No scenes available';
        if (sceneSummaryEl) sceneSummaryEl.textContent = 'Add scenes in Orion Storyline Studio before exporting.';
        if (choiceGridEl) choiceGridEl.innerHTML = '';
        if (variableListEl) variableListEl.innerHTML = '';
        return;
      }

      initializeScorm();
    })();
  </script>
</body>
</html>`;
}

function computeCrc32(data: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

function getDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  return { dosDate, dosTime };
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function createZip(entries: ZipEntry[]): Uint8Array {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const { dosDate, dosTime } = getDosDateTime(now);

  entries.forEach((entry) => {
    const nameBytes = textEncoder.encode(entry.name);
    const data = entry.data;
    const crc32 = computeCrc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc32, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc32, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localChunks.push(localHeader, data);
    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralDirectory = concatUint8Arrays(centralChunks);
  const localData = concatUint8Arrays(localChunks);
  const endOfCentralDirectory = new Uint8Array(22);
  const endView = new DataView(endOfCentralDirectory.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localData.length, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([localData, centralDirectory, endOfCentralDirectory]);
}

function triggerBrowserDownload(data: Uint8Array, filename: string): void {
  const arrayBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(arrayBuffer).set(data);
  const blob = new Blob([arrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportCourseAsScormPackage(options: ScormExportOptions): void {
  const validationErrors = validateBlocksForScormExport(options.blocks);
  if (validationErrors.length > 0) {
    throw new Error(`Fix these before exporting SCORM:\n- ${validationErrors.join('\n- ')}`);
  }
  const manifestXml = buildManifestXml(options.courseId, options.courseTitle);
  const indexHtml = buildIndexHtml(options.courseTitle, options.blocks, options.theme);
  const zipData = createZip([
    { name: 'imsmanifest.xml', data: textEncoder.encode(manifestXml) },
    { name: 'index.html', data: textEncoder.encode(indexHtml) },
  ]);
  const filename = `${slugifyFilename(options.courseTitle)}-scorm12.zip`;
  triggerBrowserDownload(zipData, filename);
}

export function exportStorylineAsScormPackage(options: StorylineScormExportOptions): void {
  const manifestXml = buildManifestXml(options.courseId, options.courseTitle);
  const indexHtml = buildStorylineIndexHtml(options.courseTitle, options.storyline, options.theme);
  const zipData = createZip([
    { name: 'imsmanifest.xml', data: textEncoder.encode(manifestXml) },
    { name: 'index.html', data: textEncoder.encode(indexHtml) },
  ]);
  const filename = `${slugifyFilename(options.courseTitle)}-storyline-scorm12.zip`;
  triggerBrowserDownload(zipData, filename);
}
