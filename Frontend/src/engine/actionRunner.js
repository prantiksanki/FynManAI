import { createShapeId, AssetRecordType } from 'tldraw';
import { getImage }          from '../services/imageCache';
import { getVideo }          from '../services/videoCache';
import { enhanceVideoQuery } from '../services/VideoKeywordExtractor';
import { voiceEngine } from '../services/voiceEngine';

export function parseTime(t) {
  if (typeof t === 'number') return t * 1000;
  const m = String(t).match(/^(\d+(?:\.\d+)?)(s|ms)?$/);
  if (!m) return 0;
  return parseFloat(m[1]) * (m[2] === 'ms' ? 1 : 1000);
}

export function buildTimeline(actions) {
  return actions
    .map(a => ({ ...a, _ms: parseTime(a.time) }))
    .sort((a, b) => a._ms - b._ms);
}

function rt(plain) {
  return plain || '';
}

const COLOR_TOKENS = new Set([
  'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue',
  'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white',
]);
function toColorToken(hex) {
  if (COLOR_TOKENS.has(hex)) return hex;
  return 'grey';
}

// Maps accent color names to tldraw arrow color tokens for connector arrows
const ACCENT_TO_ARROW = {
  violet: 'light-violet',
  purple: 'light-violet',
  blue:   'light-blue',
  green:  'light-green',
  teal:   'light-blue',
  orange: 'orange',
  red:    'light-red',
  pink:   'light-red',
  yellow: 'yellow',
};

const PROCESS_ACCENTS = ['violet', 'blue', 'green', 'orange', 'teal', 'pink', 'yellow'];
const NODE_ACCENTS    = ['violet', 'blue', 'green', 'orange', 'teal', 'pink'];

// Tracks the placeholder shape created for each Manim job so it can be replaced
// by the finished video (or removed on failure) once the render completes.
const manimShapeByJob = new Map();

export async function executeAction(editor, action, onVoice) {
  const { action: type } = action;

  switch (type) {

    // ── Voice ─────────────────────────────────────────────────────────────────
    case 'voice':
      onVoice?.(action.content);
      voiceEngine.speak(action.content, () => {});
      break;

    // ── Hero card (large title + subtitle) ────────────────────────────────────
    case 'drawHeroCard': {
      const pos = action.position || { x: 40, y: 30 };
      const sz  = action.size    || { w: 680, h: 130 };
      editor.createShape({
        id: createShapeId(),
        type: 'hero-card',
        x: pos.x, y: pos.y,
        props: {
          title:    action.title    || action.content || '',
          subtitle: action.subtitle || '',
          accent:   action.accent   || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Feature card (icon + label + body) ────────────────────────────────────
    case 'drawFeatureCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 220, h: 110 };
      editor.createShape({
        id: createShapeId(),
        type: 'feature-card',
        x: pos.x, y: pos.y,
        props: {
          icon:   action.icon   || '⚡',
          label:  action.label  || action.content || '',
          body:   action.body   || '',
          accent: action.accent || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Code card (syntax-highlighted code block) ─────────────────────────────
    case 'drawCodeCard': {
      const pos = action.position || { x: 40, y: 440 };
      const sz  = action.size    || { w: 340, h: 200 };
      const rawLines = action.lines;
      const lines = Array.isArray(rawLines) ? rawLines
        : typeof rawLines === 'string' ? rawLines.split('\n')
        : [action.content || '// code'];
      editor.createShape({
        id: createShapeId(),
        type: 'code-card',
        x: pos.x, y: pos.y,
        props: {
          language: action.language || 'javascript',
          lines,
          caption: action.caption || '',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Process row (horizontal step cards with connecting arrows) ────────────
    case 'drawProcessRow': {
      const steps = action.steps || action.items || [];
      if (!steps.length) break;
      const base   = action.position || { x: 100, y: 300 };
      const cardW  = (action.size?.w) || 155;
      const cardH  = (action.size?.h) || 100;
      const gap    = 50;
      const stride = cardW + gap;
      const centerY = base.y + cardH / 2;

      steps.forEach((step, i) => {
        const x = base.x + i * stride;
        const ac = step.accent || PROCESS_ACCENTS[i % PROCESS_ACCENTS.length];

        editor.createShape({
          id: createShapeId(),
          type: 'process-card',
          x, y: base.y,
          props: {
            step:   step.step   || String(i + 1).padStart(2, '0'),
            label:  step.label  || (typeof step === 'string' ? step : ''),
            body:   step.body   || '',
            accent: ac,
            w: cardW, h: cardH,
          },
        });

        // Connecting arrow to next card
        if (i < steps.length - 1) {
          const fromX = x + cardW + 2;
          const toX   = x + stride - 2;
          editor.createShape({
            id: createShapeId(),
            type: 'arrow',
            x: fromX, y: centerY,
            props: {
              start: { x: 0, y: 0 },
              end:   { x: toX - fromX, y: 0 },
              color: ACCENT_TO_ARROW[ac] || 'light-violet',
              arrowheadEnd:   'arrow',
              arrowheadStart: 'none',
              size: 's',
              text: rt(''),
            },
          });
        }
      });
      break;
    }

    // ── Node graph (node-card shapes + arrows, BFS positions from backend) ────
    case 'createNodeGraph': {
      const nodes  = action.nodes  || [];
      const edges  = action.edges  || [];
      const base   = action.position || { x: 200, y: 200 };
      const nodeW  = 160, nodeH = 64;
      const nodeMap = {};

      nodes.forEach((node, i) => {
        const col  = i % 3;
        const row  = Math.floor(i / 3);
        const nx   = base.x + (node.x ?? col * 220);
        const ny   = base.y + (node.y ?? row * 140);
        const id   = createShapeId();
        const level = node.y != null ? Math.round(node.y / 160) : row;
        nodeMap[node.id] = { id, cx: nx + nodeW / 2, cy: ny + nodeH / 2 };

        editor.createShape({
          id,
          type: 'node-card',
          x: nx, y: ny,
          props: {
            label:    node.label    || node.id,
            sublabel: node.sublabel || '',
            level,
            w: nodeW, h: nodeH,
          },
        });
      });

      edges.forEach(edge => {
        const from = nodeMap[edge.from];
        const to   = nodeMap[edge.to];
        if (!from || !to) return;

        const dx   = to.cx - from.cx;
        const dy   = to.cy - from.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const offX = ux * (nodeW / 2 + 2);
        const offY = uy * (nodeH / 2 + 2);
        const sx = from.cx + offX;
        const sy = from.cy + offY;

        editor.createShape({
          id: createShapeId(),
          type: 'arrow',
          x: sx, y: sy,
          props: {
            start: { x: 0, y: 0 },
            end:   { x: to.cx - offX - sx, y: to.cy - offY - sy },
            text:           edge.label ? rt(edge.label) : rt(''),
            color:          'light-violet',
            arrowheadEnd:   'arrow',
            arrowheadStart: 'none',
            size: 's',
          },
        });
      });
      break;
    }

    // ── Table card ────────────────────────────────────────────────────────────
    case 'drawTableCard': {
      const pos = action.position || { x: 700, y: 300 };
      const sz  = action.size    || { w: 340, h: 200 };
      const rawHeaders = action.headers;
      const rawRows    = action.rows;
      const headers = Array.isArray(rawHeaders) ? rawHeaders
        : typeof rawHeaders === 'string' ? rawHeaders.split('|')
        : [];
      const rows = Array.isArray(rawRows) ? rawRows.map(r =>
        Array.isArray(r) ? r : typeof r === 'string' ? r.split('|') : []
      ) : [];

      editor.createShape({
        id: createShapeId(),
        type: 'table-card',
        x: pos.x, y: pos.y,
        props: {
          title:   action.title   || 'Result',
          headers,
          rows,
          accent:  action.accent  || 'teal',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Image ─────────────────────────────────────────────────────────────────
    case 'insertImage': {
      const img = await getImage(action.query || 'abstract');
      if (!img?.url) break;

      const assetId = AssetRecordType.createId();
      const shapeId = createShapeId();
      const pos = action.position || { x: 400, y: 200 };
      const sz  = action.size    || { w: 280, h: 200 };

      editor.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name:        img.alt || action.query || 'image',
          src:         img.url,
          w:           sz.w,
          h:           sz.h,
          mimeType:    'image/jpeg',
          isAnimated:  false,
        },
        meta: {},
      }]);

      editor.createShape({
        id: shapeId,
        type: 'image',
        x: pos.x, y: pos.y,
        props: { assetId, w: sz.w, h: sz.h },
      });

      editor.animateShape({ id: shapeId, type: 'image' }, { animation: { duration: 600 } });
      break;
    }

    // ── Video ─────────────────────────────────────────────────────────────────
    case 'insertVideo': {
      const rawQuery = action.query || 'nature landscape';
      const query    = enhanceVideoQuery(rawQuery, action._intent);
      const vid      = await getVideo(query);
      if (!vid?.url) break;

      const pos = action.position || { x: 400, y: 200 };
      const sz  = action.size    || { w: 320, h: 210 };

      editor.createShape({
        id: createShapeId(),
        type: 'video-card',
        x: pos.x, y: pos.y,
        props: {
          url:       vid.url,
          thumbnail: vid.thumbnail || '',
          title:     vid.title     || rawQuery,
          duration:  vid.duration  || 0,
          source:    vid.source    || 'unknown',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Manim: rendering placeholder ──────────────────────────────────────────
    // Uses a built-in dashed geo rectangle so no custom shape registration is
    // required; it is swapped for a video-card once the render finishes.
    case 'manimPlaceholder': {
      const pos = action.position || { x: 480, y: 560 };
      const sz  = action.size    || { w: 420, h: 240 };
      const shapeId = createShapeId();
      manimShapeByJob.set(action.jobId, shapeId);

      editor.createShape({
        id: shapeId,
        type: 'geo',
        x: pos.x, y: pos.y,
        props: {
          geo:   'rectangle',
          w: sz.w, h: sz.h,
          color: 'light-violet',
          fill:  'semi',
          dash:  'dashed',
          size:  's',
          text:  rt(`🎬 Rendering animation…\n${action.label || ''}`),
        },
      });
      break;
    }

    // ── Manim: swap placeholder for the rendered video ────────────────────────
    case 'manimVideo': {
      if (!action.url) break;
      const placeholderId = manimShapeByJob.get(action.jobId);
      const existing = placeholderId ? editor.getShape(placeholderId) : null;

      const pos = existing
        ? { x: existing.x, y: existing.y }
        : (action.position || { x: 480, y: 560 });
      const sz  = action.size || { w: 420, h: 240 };

      if (placeholderId) {
        editor.deleteShape(placeholderId);
        manimShapeByJob.delete(action.jobId);
      }

      editor.createShape({
        id: createShapeId(),
        type: 'video-card',
        x: pos.x, y: pos.y,
        props: {
          url:       action.url,
          thumbnail: '',
          title:     action.label || 'Manim animation',
          duration:  0,
          source:    'manim',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Manim: render failed / timed out — mark the placeholder ───────────────
    case 'manimError': {
      const placeholderId = manimShapeByJob.get(action.jobId);
      if (placeholderId) {
        const existing = editor.getShape(placeholderId);
        if (existing) {
          editor.updateShape({
            id: placeholderId,
            type: 'geo',
            props: { ...existing.props, color: 'light-red', text: rt('⚠ Animation unavailable') },
          });
        }
        manimShapeByJob.delete(action.jobId);
      }
      break;
    }

    // ── Geo shapes (used in math diagrams / highlights) ───────────────────────
    case 'drawShape': {
      const id  = createShapeId();
      const pos = action.position || { x: 300, y: 300 };
      const sz  = action.size    || { w: 200, h: 150 };
      const geo = action.shape === 'ellipse' ? 'ellipse'
                : action.shape === 'triangle' ? 'triangle'
                : 'rectangle';

      editor.createShape({
        id, type: 'geo',
        x: pos.x, y: pos.y,
        props: {
          geo,
          w: sz.w, h: sz.h,
          color:    toColorToken(action.color || 'light-violet'),
          fill:     'semi',
          size:     'm',
          text: action.label ? rt(action.label) : rt(''),
        },
      });
      break;
    }

    // ── Plain text (body / handwritten / formula fallback) ────────────────────
    case 'writeText': {
      const id    = createShapeId();
      const pos   = action.position || { x: 100, y: 100 };
      const style = action.style    || 'body';
      const sizeMap = { heading: 'xl', body: 'm', handwritten: 'm', code: 'm', note: 's' };
      const fontMap = { handwritten: 'draw', code: 'mono' };

      editor.createShape({
        id, type: 'text',
        x: pos.x, y: pos.y,
        props: {
          text:      rt(action.content || ''),
          size:      sizeMap[style] || 'm',
          font:      fontMap[style] || 'sans',
          color:     'white',
          textAlign: 'start',
          w:         action.width || 400,
          autoSize:  !action.width,
        },
      });
      break;
    }

    // ── Arrow ─────────────────────────────────────────────────────────────────
    case 'drawArrow': {
      const id   = createShapeId();
      const from = action.from || { x: 100, y: 100 };
      const to   = action.to   || { x: 300, y: 300 };

      editor.createShape({
        id, type: 'arrow',
        x: from.x, y: from.y,
        props: {
          start:          { x: 0, y: 0 },
          end:            { x: to.x - from.x, y: to.y - from.y },
          text:           action.label ? rt(action.label) : rt(''),
          color:          'grey',
          size:           'm',
          arrowheadEnd:   'arrow',
          arrowheadStart: 'none',
        },
      });
      break;
    }

    // ── Legacy sticky (maps to feature-card for backwards compat) ─────────────
    case 'createSticky': {
      const pos = action.position || { x: 200, y: 200 };
      const accentMap = { yellow: 'yellow', blue: 'blue', green: 'green', pink: 'pink', orange: 'orange' };
      editor.createShape({
        id: createShapeId(),
        type: 'feature-card',
        x: pos.x, y: pos.y,
        props: {
          icon:   '📌',
          label:  (action.content || '').slice(0, 40),
          body:   '',
          accent: accentMap[action.color] || 'yellow',
          w: 200,
          h: 90,
        },
      });
      break;
    }

    // ── Highlight area ────────────────────────────────────────────────────────
    case 'highlightArea': {
      const id  = createShapeId();
      const pos = action.position || { x: 100, y: 100 };
      const sz  = action.size    || { w: 200, h: 100 };

      editor.createShape({
        id, type: 'geo',
        x: pos.x, y: pos.y,
        opacity: action.opacity ?? 0.25,
        props: {
          geo:   'rectangle',
          w:     sz.w, h: sz.h,
          color: 'light-violet',
          fill:  'semi',
          dash:  'dashed',
        },
      });
      break;
    }

    // ── Formula ───────────────────────────────────────────────────────────────
    case 'drawFormula': {
      const id  = createShapeId();
      const pos = action.position || { x: 300, y: 300 };

      editor.createShape({
        id, type: 'text',
        x: pos.x, y: pos.y,
        props: {
          text:     rt(action.formula || ''),
          size:     'xl',
          font:     'mono',
          color:    'white',
          w:        500,
          autoSize: true,
        },
      });
      break;
    }

    // ── Legacy drawCard (maps to feature-card) ────────────────────────────────
    case 'drawCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 220, h: 110 };
      editor.createShape({
        id: createShapeId(),
        type: 'feature-card',
        x: pos.x, y: pos.y,
        props: {
          icon:   '▪',
          label:  (action.text || '').slice(0, 60),
          body:   '',
          accent: action.color || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Legacy createTimeline (maps to drawProcessRow) ────────────────────────
    case 'createTimeline': {
      const items = action.items || [];
      const base  = action.position || { x: 100, y: 300 };
      const steps = items.map((item, i) => ({
        step:   String(i + 1).padStart(2, '0'),
        label:  typeof item === 'string' ? item : item.label || '',
        body:   typeof item === 'object' ? item.body || '' : '',
        accent: PROCESS_ACCENTS[i % PROCESS_ACCENTS.length],
      }));
      // Recursively call the new handler
      await executeAction(editor, { action: 'drawProcessRow', steps, position: base, size: { w: 155, h: 95 } }, onVoice);
      break;
    }

    // ── Frame ─────────────────────────────────────────────────────────────────
    case 'drawFrame': {
      const pos = action.position || { x: 100, y: 100 };
      const sz  = action.size    || { w: 400, h: 300 };
      editor.createShape({
        id: createShapeId(),
        type: 'frame',
        x: pos.x, y: pos.y,
        props: { w: sz.w, h: sz.h, name: action.label || '' },
      });
      break;
    }

    // ── Stat card (KPI + progress bar) ───────────────────────────────────────
    case 'drawStatCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 220, h: 120 };
      editor.createShape({
        id: createShapeId(),
        type: 'stat-card',
        x: pos.x, y: pos.y,
        props: {
          label:   action.label   || '',
          value:   action.value   || '0',
          sub:     action.sub     || '',
          trend:   action.trend   || 'flat',
          percent: typeof action.percent === 'number' ? action.percent : 70,
          accent:  action.accent  || 'green',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Quote card (pull-quote) ───────────────────────────────────────────────
    case 'drawQuoteCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 340, h: 140 };
      editor.createShape({
        id: createShapeId(),
        type: 'quote-card',
        x: pos.x, y: pos.y,
        props: {
          quote:  action.quote  || action.content || '',
          author: action.author || '',
          accent: action.accent || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Callout card (tip / warning / info / danger / success) ───────────────
    case 'drawCallout': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 300, h: 90 };
      editor.createShape({
        id: createShapeId(),
        type: 'callout-card',
        x: pos.x, y: pos.y,
        props: {
          type:  action.calloutType || 'tip',
          title: action.title || 'Note',
          body:  action.body  || action.content || '',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Timeline card (vertical milestone list) ───────────────────────────────
    case 'drawTimelineCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 240, h: 200 };
      const raw = action.milestones || [];
      const milestones = Array.isArray(raw) ? raw : [];
      editor.createShape({
        id: createShapeId(),
        type: 'timeline-card',
        x: pos.x, y: pos.y,
        props: {
          title:      action.title      || 'Timeline',
          milestones,
          accent:     action.accent     || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Compare card (Pro/Con or A vs B) ─────────────────────────────────────
    case 'drawCompareCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 360, h: 180 };
      editor.createShape({
        id: createShapeId(),
        type: 'compare-card',
        x: pos.x, y: pos.y,
        props: {
          leftLabel:   action.leftLabel   || 'Pros',
          rightLabel:  action.rightLabel  || 'Cons',
          leftItems:   Array.isArray(action.leftItems)  ? action.leftItems  : [],
          rightItems:  Array.isArray(action.rightItems) ? action.rightItems : [],
          leftAccent:  action.leftAccent  || 'green',
          rightAccent: action.rightAccent || 'red',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Badge card (pill/tag cloud) ───────────────────────────────────────────
    case 'drawBadgeCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 300, h: 110 };
      const rawBadges = action.badges || [];
      const badges = Array.isArray(rawBadges) ? rawBadges : [];
      editor.createShape({
        id: createShapeId(),
        type: 'badge-card',
        x: pos.x, y: pos.y,
        props: {
          title:  action.title  || '',
          badges,
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Radial / donut ring chart ─────────────────────────────────────────────
    case 'drawRadialCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 180, h: 180 };
      editor.createShape({
        id: createShapeId(),
        type: 'radial-card',
        x: pos.x, y: pos.y,
        props: {
          label:   action.label   || '',
          value:   action.value   || '0%',
          percent: typeof action.percent === 'number' ? action.percent : 0,
          sub:     action.sub     || '',
          accent:  action.accent  || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Glow card (animated neon border) ─────────────────────────────────────
    case 'drawGlowCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 280, h: 150 };
      editor.createShape({
        id: createShapeId(),
        type: 'glow-card',
        x: pos.x, y: pos.y,
        props: {
          icon:   action.icon   || '✦',
          title:  action.title  || action.label || '',
          body:   action.body   || action.content || '',
          accent: action.accent || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Avatar stack (circular team members) ──────────────────────────────────
    case 'drawAvatarCard': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 300, h: 140 };
      const rawMembers = action.members || [];
      const members = Array.isArray(rawMembers) ? rawMembers : [];
      editor.createShape({
        id: createShapeId(),
        type: 'avatar-card',
        x: pos.x, y: pos.y,
        props: {
          title:   action.title || 'Team',
          members,
          sub:     action.sub   || '',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Pill banner (gradient announcement strip) ──────────────────────────────
    case 'drawPillBanner': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 420, h: 68 };
      editor.createShape({
        id: createShapeId(),
        type: 'pill-banner',
        x: pos.x, y: pos.y,
        props: {
          emoji:  action.emoji  || '✨',
          text:   action.text   || action.title || action.content || '',
          sub:    action.sub    || '',
          accent: action.accent || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Step circle card (numbered/icon circle steps) ─────────────────────────
    case 'drawStepCircle': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 480, h: 160 };
      const rawSteps = action.steps || [];
      const steps = Array.isArray(rawSteps) ? rawSteps : [];
      editor.createShape({
        id: createShapeId(),
        type: 'step-circle-card',
        x: pos.x, y: pos.y,
        props: {
          title: action.title || 'How It Works',
          steps,
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Emoji sticker (floating emoji with glow halo) ─────────────────────────
    case 'drawEmojiSticker': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 140, h: 140 };
      editor.createShape({
        id: createShapeId(),
        type: 'emoji-sticker',
        x: pos.x, y: pos.y,
        props: {
          emoji:   action.emoji   || '🚀',
          caption: action.caption || '',
          size:    action.emojiSize || 'lg',
          accent:  action.accent  || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Reaction bubble cluster ───────────────────────────────────────────────
    case 'drawReactionBubble': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 340, h: 60 };
      const rawReactions = action.reactions || [];
      const reactions = Array.isArray(rawReactions) ? rawReactions : [];
      editor.createShape({
        id: createShapeId(),
        type: 'reaction-bubble',
        x: pos.x, y: pos.y,
        props: {
          reactions,
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Emoji cloud (scattered mood/topic emoji cluster) ──────────────────────
    case 'drawEmojiCloud': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 380, h: 180 };
      const rawItems = action.items || [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      editor.createShape({
        id: createShapeId(),
        type: 'emoji-cloud',
        x: pos.x, y: pos.y,
        props: {
          title:  action.title  || '',
          items,
          accent: action.accent || 'violet',
          w: sz.w, h: sz.h,
        },
      });
      break;
    }

    // ── Camera ────────────────────────────────────────────────────────────────
    case 'cameraFocus': {
      const pos = action.position || { x: 200, y: 200 };
      const sz  = action.size    || { w: 600, h: 400 };
      editor.zoomToBounds(
        { x: pos.x, y: pos.y, w: sz.w, h: sz.h },
        { animation: { duration: 800 }, inset: 60 }
      );
      break;
    }

    case 'panTo': {
      const pos = action.position || { x: 800, y: 450 };
      editor.centerOnPoint({ x: pos.x, y: pos.y }, { animation: { duration: 600 } });
      break;
    }

    case 'zoomTo': {
      const level = action.level || 1.0;
      editor.setCamera(
        { ...editor.getCamera(), z: level },
        { animation: { duration: 600 } }
      );
      break;
    }

    default:
      console.warn('[ActionRunner] Unknown action type:', type);
  }
}
