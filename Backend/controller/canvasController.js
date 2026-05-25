const axios = require('axios');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4-5';

// ─── Intent detection ──────────────────────────────────────────────────────────
function detectIntent(prompt) {
  const p = prompt.toLowerCase();
  if (/\b(theorem|formula|equation|pythagoras|algebra|calculus|geometry|trig|derivative|integral|matrix|vector|proof|math|triangle|hypotenuse|sine|cosine|logarithm|fibonacci|prime)\b/.test(p)) return 'math';
  if (/\b(kubernetes|docker|api|microservice|algorithm|code|program|function|class|database|sql|graphql|server|deploy|devops|git|react|node|python|java|javascript|architecture|connect|driver|orm|query)\b/.test(p)) return 'coding';
  if (/\b(sad|happy|anxious|stressed|depressed|lonely|overwhelmed|angry|scared|worried|excited|love|miss|hurt|cry|feel|emotion)\b/.test(p)) return 'emotional';
  if (/\b(stock|chart|portfolio|budget|compound|interest|investment|finance|financial|expense|income|profit|loss|dividend|equity|bond|fund|asset|liability|cash flow|balance sheet|p&l|roi|irr|npv|forex|crypto|trading|market trend|revenue flow|budget breakdown)\b/.test(p)) return 'finance';
  if (/\b(startup|business|company|product|market|strategy|revenue|investor|pitch|mvp|growth|saas)\b/.test(p)) return 'business';
  if (/\b(story|once upon|narrative|character|plot|adventure|tale|journey)\b/.test(p)) return 'story';
  if (/\b(route|travel|trip|distance|map|city|country|from .+ to|km|miles|visit)\b/.test(p)) return 'travel';
  return 'general';
}

// ─── Pre-computed layout grids (no ambiguity, exact pixels) ───────────────────

function getMathLayout() {
  return {
    slots: {
      hero:        { x: 40,   y: 20,  w: 860, h: 110, accent: 'violet' },
      shape_main:  { x: 40,   y: 150, w: 300, h: 260 },
      formula_big: { x: 480,  y: 150 },
      formula_ex:  { x: 480,  y: 380 },
      explain:     { x: 480,  y: 520, w: 380, style: 'body' },
      card_a:      { x: 940,  y: 80,  w: 220, h: 110, accent: 'yellow'  },
      card_b:      { x: 940,  y: 210, w: 220, h: 110, accent: 'blue'    },
      card_c:      { x: 940,  y: 340, w: 220, h: 110, accent: 'green'   },
      card_d:      { x: 940,  y: 470, w: 220, h: 110, accent: 'orange'  },
      highlight:   { x: 460,  y: 130, w: 460, h: 560 },
    },
    instructions: `
Use drawHeroCard at hero slot for the title (title="concept name", subtitle="one-line definition").
Draw ONE large drawShape (triangle/rectangle/ellipse) that visually represents the concept.
Use drawArrow to label its sides/parts.
Place the formula LARGE at formula_big using drawFormula. Worked example at formula_ex.
Put 4 drawFeatureCard (icon+label+body) in the right column at card_a/b/c/d. NO images.`
  };
}

function getCodingLayout() {
  return {
    slots: {
      hero:       { x: 40,   y: 20,  w: 860,  h: 110, accent: 'violet' },
      // Graph lives in a safe 860×440 zone: x:40–900, y:155–595
      graph:      { x: 60,   y: 155 },
      // Right column starts at x:920, well clear of graph right edge
      card_r1:    { x: 920,  y: 155, w: 230,  h: 110, accent: 'yellow'  },
      card_r2:    { x: 920,  y: 285, w: 230,  h: 110, accent: 'blue'    },
      card_r3:    { x: 920,  y: 415, w: 230,  h: 110, accent: 'green'   },
      card_r4:    { x: 920,  y: 545, w: 230,  h: 110, accent: 'orange'  },
      // Bottom row: below y:620 (safe below graph), two items side by side
      code_block: { x: 40,   y: 640, w: 400,  h: 230 },
      table:      { x: 460,  y: 640, w: 420,  h: 230, accent: 'teal'   },
      // Process row at very bottom
      process:    { x: 40,   y: 900 },
    },
    instructions: `
Use drawHeroCard at hero slot (title="topic name", subtitle="one-line description").
createNodeGraph at x:60,y:155. CRITICAL: max 5 nodes, HGAP=180px, VGAP=150px. Max right edge must stay under x:900. Max bottom edge must stay under y:620.
drawCodeCard at code_block (x:40,y:640) with 6-8 real lines of code. language matches topic.
drawTableCard at table (x:460,y:640) showing a relevant query result or data.
2 drawFeatureCard + 1 drawBadgeCard + 1 drawCallout at card_r1/r2/r3/r4 slots — use drawBadgeCard for tech stack (badges=[{label,accent}]) and drawCallout for a key tip/warning.
drawProcessRow at process (x:40,y:900) for end-to-end flow (4-5 steps).
HARD RULE: No shape may have x > 900 unless it is in the card_r* or table slots. Graph nodes must fit within x:60–880, y:155–600.`
  };
}

function getEmotionalLayout() {
  return {
    slots: {
      hero:        { x: 40,  y: 20,  w: 1260, h: 120, accent: 'pink'   },
      image_left:  { x: 40,  y: 160, w: 280,  h: 210                   },
      // Center text block: fixed width so it can't overflow into image areas
      msg_center:  { x: 360, y: 160, w: 540,  h: 120                   },
      msg_center2: { x: 360, y: 295, w: 540,  h: 160                   },
      image_right: { x: 950, y: 160, w: 280,  h: 210                   },
      // Bottom cards: y:490 clears the tallest center text block (y:295+160=455) + 35px gap
      card_bl:     { x: 40,  y: 490, w: 280,  h: 110, accent: 'green'  },
      card_bc:     { x: 360, y: 490, w: 280,  h: 110, accent: 'blue'   },
      card_brc:    { x: 680, y: 490, w: 280,  h: 110, accent: 'yellow' },
      card_br:     { x: 1000,y: 490, w: 230,  h: 110, accent: 'pink'   },
    },
    instructions: `
Use drawHeroCard at hero with warm greeting title and subtitle.
2 insertVideo: one at image_left (query="calm nature flowers candle serene"), one at image_right (query="sunrise ocean sky waves").
drawQuoteCard at msg_center — an uplifting quote with author. size:{w:540,h:120}.
drawCallout at msg_center2 — calloutType="success", title=supportive headline, body=2-sentence encouragement. size:{w:540,h:120}.
4 drawFeatureCard at card_bl/bc/brc/br — heart/star/sun/moon emoji icons, affirmation label+body.
Soft, calming voice throughout.`
  };
}

function getBusinessLayout() {
  return {
    slots: {
      hero:      { x: 40,   y: 20,  w: 1060, h: 120, accent: 'blue'   },
      graph:     { x: 30,   y: 160 },
      process:   { x: 430,  y: 180 },
      kpi_a:     { x: 1120, y: 160, w: 230, h: 110, accent: 'yellow'  },
      kpi_b:     { x: 1120, y: 290, w: 230, h: 110, accent: 'blue'    },
      kpi_c:     { x: 1120, y: 420, w: 230, h: 110, accent: 'green'   },
      pillar_a:  { x: 40,   y: 560, w: 220, h: 110, accent: 'orange'  },
      pillar_b:  { x: 290,  y: 560, w: 220, h: 110, accent: 'blue'    },
      pillar_c:  { x: 540,  y: 560, w: 220, h: 110, accent: 'yellow'  },
      pillar_d:  { x: 790,  y: 560, w: 220, h: 110, accent: 'green'   },
    },
    instructions: `
Use drawHeroCard at hero (title=company/product name, subtitle=tagline).
createNodeGraph at x:30,y:160 (org/product structure, 4-6 nodes).
drawTimelineCard at x:430,y:180 (roadmap milestones, 4-5 phases with done:true/false). size:{w:240,h:200}.
3 drawStatCard at kpi_a/b/c — each KPI with label, value, trend, percent.
4 drawBadgeCard or drawFeatureCard at pillar_a/b/c/d — core value pillars or tech stack.`
  };
}

function getFinanceLayout() {
  return {
    slots: {
      hero:      { x: 40,   y: 20,  w: 1060, h: 110, accent: 'green'  },
      kpi_a:     { x: 40,   y: 150, w: 240,  h: 110, accent: 'green'  },
      kpi_b:     { x: 310,  y: 150, w: 240,  h: 110, accent: 'blue'   },
      kpi_c:     { x: 580,  y: 150, w: 240,  h: 110, accent: 'teal'   },
      kpi_d:     { x: 850,  y: 150, w: 240,  h: 110, accent: 'orange' },
      table:     { x: 40,   y: 290, w: 500,  h: 240, accent: 'teal'   },
      graph:     { x: 580,  y: 290 },
      process:   { x: 40,   y: 560 },
      insight_a: { x: 40,   y: 720, w: 240,  h: 110, accent: 'violet' },
      insight_b: { x: 310,  y: 720, w: 240,  h: 110, accent: 'blue'   },
      insight_c: { x: 580,  y: 720, w: 240,  h: 110, accent: 'green'  },
      insight_d: { x: 850,  y: 720, w: 240,  h: 110, accent: 'orange' },
    },
    instructions: `
FINANCE layout. Use financial data, metrics, and flows.
drawHeroCard at hero (title=financial topic, subtitle=one-line summary with key stat).
4 drawStatCard at kpi_a/b/c/d — each a KPI with label=metric name, value=actual number, sub=context, trend=up|down|flat, percent=0-100.
drawTableCard at table (x:40,y:290) — financial data table with 3-4 columns and 4-5 rows of real numbers.
createNodeGraph at x:580,y:290 — financial flow or structure (4-5 nodes max). CRITICAL: nodes must stay within x:580–1100.
drawProcessRow at process (x:40,y:560) — 4-5 step financial process or formula breakdown.
4 drawCallout at insight_a/b/c/d — key takeaways using calloutType tip|warning|info|success with title+body.
NO insertImage or insertVideo — use data, tables, and charts instead.`
  };
}

function getGeneralLayout() {
  const styles = ['comparison', 'flow', 'nodegraph'];
  const style = styles[Math.floor(Math.random() * styles.length)];

  if (style === 'comparison') {
    return {
      slots: {
        hero:       { x: 40,  y: 20,  w: 1300, h: 110, accent: 'violet' },
        left_img:   { x: 40,  y: 150, w: 340,  h: 220 },
        right_img:  { x: 920, y: 150, w: 340,  h: 220 },
        left_c1:    { x: 40,  y: 390, w: 240,  h: 110, accent: 'blue'   },
        left_c2:    { x: 40,  y: 520, w: 240,  h: 110, accent: 'blue'   },
        right_c1:   { x: 900, y: 390, w: 240,  h: 110, accent: 'orange' },
        right_c2:   { x: 900, y: 520, w: 240,  h: 110, accent: 'orange' },
        vs_label:   { x: 600, y: 330, w: 100,  style: 'heading' },
      },
      instructions: `
COMPARISON layout. Two things side by side.
drawHeroCard at hero spanning full width (title="A vs B", subtitle="key difference").
Left (x:40): insertVideo at left_img (scene query matching left subject), 2x drawFeatureCard at left_c1/c2 for pros/features.
Right (x:900): insertVideo at right_img (scene query matching right subject), 2x drawFeatureCard at right_c1/c2 for pros/features.
writeText "VS" (heading) at vs_label x:600,y:330.
drawArrow vertical divider from x:680,y:140 to x:680,y:650.`
    };
  }

  if (style === 'flow') {
    return {
      slots: {
        hero:     { x: 40,  y: 20,  w: 1100, h: 110, accent: 'green'  },
        process:  { x: 40,  y: 155 },
        img1:     { x: 40,  y: 320, w: 300,  h: 200 },
        img2:     { x: 500, y: 320, w: 300,  h: 200 },
        img3:     { x: 960, y: 320, w: 300,  h: 200 },
        card_1:   { x: 40,  y: 550, w: 220,  h: 110, accent: 'yellow' },
        card_2:   { x: 300, y: 550, w: 220,  h: 110, accent: 'blue'   },
        card_3:   { x: 560, y: 550, w: 220,  h: 110, accent: 'green'  },
        card_4:   { x: 820, y: 550, w: 220,  h: 110, accent: 'orange' },
      },
      instructions: `
FLOW layout. drawHeroCard at hero.
drawProcessRow at process x:40,y:155 (4-5 steps with emoji icons, accent colors).
3 insertVideo in a row at img1/img2/img3 for visual context (use descriptive scene queries matching the topic steps).
4 drawFeatureCard at card_1/2/3/4 for takeaways.`
    };
  }

  // nodegraph
  return {
    slots: {
      hero:    { x: 40,  y: 20,  w: 1100, h: 110, accent: 'teal'   },
      graph:   { x: 100, y: 160 },
      card_1:  { x: 40,  y: 640, w: 240,  h: 110, accent: 'violet' },
      card_2:  { x: 320, y: 640, w: 240,  h: 110, accent: 'blue'   },
      card_3:  { x: 600, y: 640, w: 240,  h: 110, accent: 'green'  },
      card_4:  { x: 880, y: 640, w: 240,  h: 110, accent: 'orange' },
    },
    instructions: `
NODE GRAPH layout. drawHeroCard at hero.
createNodeGraph at x:100,y:160 — central topic node, 6-8 branch/sub-topic nodes, edges showing relationships.
4 drawFeatureCard at card_1/2/3/4 — key facts or insights from the topic.`
  };
}

function getStoryLayout() {
  return {
    slots: {
      hero:        { x: 40,  y: 20,  w: 1300, h: 110, accent: 'orange' },
      act1_card:   { x: 40,  y: 150, w: 320,  h: 100, accent: 'blue'   },
      act1_body:   { x: 40,  y: 265, w: 320,  style: 'body'            },
      act1_image:  { x: 40,  y: 430, w: 320,  h: 200                   },
      act2_card:   { x: 420, y: 150, w: 320,  h: 100, accent: 'violet' },
      act2_body:   { x: 420, y: 265, w: 320,  style: 'body'            },
      act2_image:  { x: 420, y: 430, w: 320,  h: 200                   },
      act3_card:   { x: 800, y: 150, w: 320,  h: 100, accent: 'green'  },
      act3_body:   { x: 800, y: 265, w: 320,  style: 'body'            },
      act3_image:  { x: 800, y: 430, w: 320,  h: 200                   },
      quote:       { x: 200, y: 660, w: 900,  style: 'body'            },
    },
    instructions: `
Three-act story layout. drawHeroCard at hero (title=story title, subtitle=logline).
Act 1=Setup (x:40): drawFeatureCard at act1_card (icon+act label), writeText body, insertVideo at act1_image (use a cinematic scene query).
Act 2=Conflict (x:420): drawFeatureCard at act2_card, writeText body, insertVideo at act2_image (use a dramatic scene query).
Act 3=Resolution (x:800): drawFeatureCard at act3_card, writeText body, insertVideo at act3_image (use a hopeful/triumphant scene query).
drawQuoteCard at quote slot — a memorable quote from the story with author. size:{w:900,h:130}.`
  };
}

function getTravelLayout() {
  return {
    slots: {
      hero:         { x: 40,   y: 20,  w: 1300, h: 110, accent: 'teal'   },
      origin_img:   { x: 30,   y: 150, w: 300,  h: 200                   },
      origin_card:  { x: 30,   y: 365, w: 300,  h: 110, accent: 'blue'   },
      dest_img:     { x: 1070, y: 150, w: 300,  h: 200                   },
      dest_card:    { x: 1070, y: 365, w: 300,  h: 110, accent: 'orange' },
      waypoint1:    { x: 230,  y: 420, w: 210,  h: 100, accent: 'violet' },
      waypoint2:    { x: 510,  y: 460, w: 210,  h: 100, accent: 'green'  },
      waypoint3:    { x: 790,  y: 420, w: 210,  h: 100, accent: 'teal'   },
      fact1:        { x: 230,  y: 540, w: 210,  h: 100, accent: 'violet' },
      fact2:        { x: 510,  y: 580, w: 210,  h: 100, accent: 'green'  },
      fact3:        { x: 790,  y: 540, w: 210,  h: 100, accent: 'teal'   },
    },
    instructions: `
Travel route layout. drawHeroCard at hero (title="origin → destination", subtitle=trip description).
insertImage at origin_img (specific landmark name for departure city).
drawFeatureCard at origin_card (icon="✈️", label=city name, body=key fact).
insertImage at dest_img (specific landmark name for arrival city).
drawFeatureCard at dest_card (icon="🏁", label=city name, body=key fact).
drawArrow from x:330,y:250 to x:1070,y:250 as the route connector.
3 drawFeatureCard at waypoint1/2/3 for cities or stops along the way.
3 drawFeatureCard at fact1/2/3 for interesting travel facts.`
  };
}

function getLayout(intent) {
  switch (intent) {
    case 'math':     return getMathLayout();
    case 'coding':   return getCodingLayout();
    case 'emotional':return getEmotionalLayout();
    case 'business': return getBusinessLayout();
    case 'finance':  return getFinanceLayout();
    case 'story':    return getStoryLayout();
    case 'travel':   return getTravelLayout();
    default:         return getGeneralLayout();
  }
}

// ─── BFS hierarchical node layout ─────────────────────────────────────────────
function computeNodeLayout(nodes, edges, maxWidth) {
  const NODE_W   = 160;
  const NODE_H   = 64;
  const VGAP     = 140;   // vertical gap between BFS levels
  const fitWidth = maxWidth || 800;

  const adj = {};
  const indegree = {};
  nodes.forEach(n => { adj[n.id] = []; indegree[n.id] = 0; });
  (edges || []).forEach(e => {
    if (adj[e.from]) adj[e.from].push(e.to);
    if (indegree[e.to] !== undefined) indegree[e.to]++;
  });
  const sources = nodes.filter(n => indegree[n.id] === 0).map(n => n.id);
  if (!sources.length && nodes.length) sources.push(nodes[0].id);

  const levels = {};
  const queue = sources.map(id => ({ id, level: 0 }));
  const visited = new Set();
  while (queue.length) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    levels[id] = level;
    (adj[id] || []).forEach(child => queue.push({ id: child, level: level + 1 }));
  }
  nodes.forEach(n => { if (levels[n.id] === undefined) levels[n.id] = 0; });

  const byLevel = {};
  nodes.forEach(n => {
    const lv = levels[n.id];
    if (!byLevel[lv]) byLevel[lv] = [];
    byLevel[lv].push(n.id);
  });

  // Find widest level to compute HGAP that fits everything within maxWidth
  const maxNodesInLevel = Math.max(...Object.values(byLevel).map(ids => ids.length));
  // HGAP = stride between node left edges; must fit maxNodesInLevel nodes in fitWidth
  const HGAP = maxNodesInLevel <= 1
    ? 0
    : Math.min(200, Math.max(170, Math.floor((fitWidth - NODE_W) / (maxNodesInLevel - 1))));

  const positions = {};
  Object.entries(byLevel).forEach(([lv, ids]) => {
    // Left-align each level — non-negative offsets always
    ids.forEach((id, i) => {
      positions[id] = { x: i * HGAP, y: Number(lv) * (NODE_H + VGAP) };
    });
  });

  return nodes.map(n => ({ ...n, ...(positions[n.id] || { x: 0, y: 0 }) }));
}

// ─── Build system prompt ───────────────────────────────────────────────────────
function buildSystemPrompt(intent, layout) {
  const slotsJson = JSON.stringify(layout.slots, null, 2);

  return `Generate a visual canvas timeline as JSON. Output ONLY raw JSON — no explanation, no markdown, no code fences, no preamble.

━━━ CANVAS SLOTS (USE THESE EXACT x,y VALUES) ━━━
${slotsJson}

━━━ LAYOUT RULES ━━━
${layout.instructions}

━━━ ACTION REFERENCE ━━━
voice:            { "time":"Xs", "action":"voice",            "content":"spoken narration 1-2 sentences" }
drawHeroCard:     { "time":"Xs", "action":"drawHeroCard",     "title":"Big Title", "subtitle":"one-line descriptor", "accent":"violet|blue|green|orange|teal|pink", "position":{"x":N,"y":N}, "size":{"w":N,"h":N} }
drawFeatureCard:  { "time":"Xs", "action":"drawFeatureCard",  "icon":"🔒", "label":"Short Label", "body":"1-2 sentence description", "accent":"violet|blue|green|orange|teal|pink|yellow", "position":{"x":N,"y":N}, "size":{"w":N,"h":N} }
drawCodeCard:     { "time":"Xs", "action":"drawCodeCard",     "language":"javascript|python|sql|bash|json", "lines":["line1","line2","line3"], "caption":"optional footer", "position":{"x":N,"y":N}, "size":{"w":N,"h":N} }
drawProcessRow:   { "time":"Xs", "action":"drawProcessRow",   "steps":[{"label":"Step Name","body":"desc","accent":"violet","step":"01"},{"label":"..."}], "position":{"x":N,"y":N} }
drawTableCard:    { "time":"Xs", "action":"drawTableCard",    "title":"Result Caption", "headers":["col1","col2","col3"], "rows":[["v1","v2","v3"],["v4","v5","v6"]], "accent":"teal|blue|green", "position":{"x":N,"y":N}, "size":{"w":N,"h":N} }
createNodeGraph:  { "time":"Xs", "action":"createNodeGraph",  "nodes":[{"id":"a","label":"Name","sublabel":"role"}], "edges":[{"from":"a","to":"b","label":"rel"}], "position":{"x":N,"y":N} }
insertImage:      { "time":"Xs", "action":"insertImage",      "query":"specific real-world landmark or object name", "position":{"x":N,"y":N}, "size":{"w":N,"h":N} }
insertVideo:      { "time":"Xs", "action":"insertVideo",      "query":"descriptive scene e.g. 'ocean waves sunset' or 'busy city street'", "position":{"x":N,"y":N}, "size":{"w":320,"h":210} }
drawShape:        { "time":"Xs", "action":"drawShape",        "shape":"rectangle|ellipse|triangle", "position":{"x":N,"y":N}, "size":{"w":N,"h":N}, "label":"label", "color":"blue|green|violet|orange|yellow" }
drawArrow:        { "time":"Xs", "action":"drawArrow",        "from":{"x":N,"y":N}, "to":{"x":N,"y":N}, "label":"optional" }
drawFormula:      { "time":"Xs", "action":"drawFormula",      "formula":"a² + b² = c²", "position":{"x":N,"y":N} }
writeText:        { "time":"Xs", "action":"writeText",        "content":"text", "position":{"x":N,"y":N}, "style":"body|handwritten", "width":N }
highlightArea:    { "time":"Xs", "action":"highlightArea",    "position":{"x":N,"y":N}, "size":{"w":N,"h":N}, "opacity":0.15 }
drawStatCard:     { "time":"Xs", "action":"drawStatCard",     "label":"Metric Name", "value":"$4.2M", "sub":"vs last quarter", "trend":"up|down|flat", "percent":75, "accent":"green|blue|orange|violet|teal", "position":{"x":N,"y":N}, "size":{"w":220,"h":120} }
drawQuoteCard:    { "time":"Xs", "action":"drawQuoteCard",    "quote":"Inspiring quote text here.", "author":"— Person Name", "accent":"violet|blue|teal|orange", "position":{"x":N,"y":N}, "size":{"w":340,"h":140} }
drawCallout:      { "time":"Xs", "action":"drawCallout",      "calloutType":"tip|warning|info|danger|success", "title":"Short Title", "body":"1-2 sentence explanation.", "position":{"x":N,"y":N}, "size":{"w":300,"h":90} }
drawTimelineCard: { "time":"Xs", "action":"drawTimelineCard", "title":"Roadmap", "milestones":[{"date":"Q1 2024","label":"Phase name","done":true},{"date":"Q2 2024","label":"Next phase","done":false}], "accent":"violet|blue|green|teal", "position":{"x":N,"y":N}, "size":{"w":240,"h":200} }
drawCompareCard:  { "time":"Xs", "action":"drawCompareCard",  "leftLabel":"Pros", "rightLabel":"Cons", "leftItems":["Point 1","Point 2"], "rightItems":["Point 1","Point 2"], "leftAccent":"green", "rightAccent":"red", "position":{"x":N,"y":N}, "size":{"w":360,"h":180} }
drawBadgeCard:    { "time":"Xs", "action":"drawBadgeCard",    "title":"Technologies", "badges":[{"label":"React","accent":"blue"},{"label":"Node.js","accent":"green"}], "position":{"x":N,"y":N}, "size":{"w":300,"h":110} }
drawRadialCard:   { "time":"Xs", "action":"drawRadialCard",   "label":"Metric", "value":"72%", "percent":72, "sub":"of target", "accent":"violet|green|blue|orange|teal", "position":{"x":N,"y":N}, "size":{"w":180,"h":180} }
drawGlowCard:     { "time":"Xs", "action":"drawGlowCard",     "icon":"✦", "title":"Key Insight", "body":"1-2 sentence insight or highlight with wow factor.", "accent":"violet|blue|green|orange|pink|teal", "position":{"x":N,"y":N}, "size":{"w":280,"h":150} }
drawAvatarCard:   { "time":"Xs", "action":"drawAvatarCard",   "title":"Team", "members":[{"name":"Alice","accent":"violet","emoji":"👩‍💻"},{"name":"Bob","accent":"blue","emoji":"👨‍🔬"}], "sub":"2 contributors", "position":{"x":N,"y":N}, "size":{"w":300,"h":140} }
drawPillBanner:   { "time":"Xs", "action":"drawPillBanner",   "emoji":"🚀", "text":"Announcement headline", "sub":"click to explore →", "accent":"violet|blue|green|orange|pink", "position":{"x":N,"y":N}, "size":{"w":420,"h":68} }
drawStepCircle:   { "time":"Xs", "action":"drawStepCircle",   "title":"How It Works", "steps":[{"label":"Define","icon":"🎯","accent":"violet"},{"label":"Build","icon":"🔨","accent":"blue"}], "position":{"x":N,"y":N}, "size":{"w":480,"h":160} }
drawEmojiSticker: { "time":"Xs", "action":"drawEmojiSticker", "emoji":"🚀", "caption":"optional label", "emojiSize":"sm|md|lg|xl", "accent":"violet|blue|green|orange|pink|yellow|teal", "position":{"x":N,"y":N}, "size":{"w":140,"h":140} }
drawReactionBubble:{ "time":"Xs","action":"drawReactionBubble","reactions":[{"emoji":"🔥","count":42,"accent":"orange"},{"emoji":"❤️","count":38,"accent":"red"}], "position":{"x":N,"y":N}, "size":{"w":340,"h":60} }
drawEmojiCloud:   { "time":"Xs", "action":"drawEmojiCloud",   "title":"Vibes", "items":[{"emoji":"🎯","label":"Focus","size":"lg","accent":"violet"},{"emoji":"⚡","label":"Speed","size":"md","accent":"yellow"}], "accent":"violet", "position":{"x":N,"y":N}, "size":{"w":380,"h":180} }

━━━ LANGUAGE RULE ━━━
CRITICAL: Detect the language of the user's message and respond ENTIRELY in that same language.
- If the user writes in Bengali → all text fields (title, subtitle, label, body, content, caption, step labels, voice narration) must be in Bengali.
- If the user writes in Hindi → respond in Hindi. Spanish → Spanish. French → French. And so on for every language.
- ONLY exception: JSON keys, action names, accent values, and coordinates remain in English (they are structural, not content).
- The "title" field in the final JSON output must also be in the user's language.

━━━ MANDATORY RULES ━━━
1. COORDINATES: Use ONLY the x,y values from the slots above. Do NOT invent coordinates. Each slot is reserved for exactly one action. position.x and position.y must exactly match a slot entry above.
2. Generate 12–18 actions total. First action: voice at "0s". Interleave voice and visuals. Each visual action gets a voice narration within 2s before or after it.
3. PREFER rich card actions: drawHeroCard for titles, drawFeatureCard for key points, drawStatCard for metrics/KPIs, drawRadialCard for percentage-based metrics, drawGlowCard for hero highlights or key conclusions, drawQuoteCard for quotes/insights, drawCallout for tips/warnings, drawTimelineCard for roadmaps/milestones, drawCompareCard for pros-cons/A-vs-B, drawBadgeCard for tech stacks/tags, drawAvatarCard for team/contributors, drawPillBanner for announcements/section headers, drawStepCircle for process steps with emoji icons, drawEmojiSticker for a single standout emoji with glow effect (use for emotional/story/travel layouts to add personality), drawReactionBubble for engagement metrics or audience reactions (counts with emoji), drawEmojiCloud for mood boards, topic maps, or vibe summaries (emotional/story layouts), drawCodeCard for code, drawProcessRow for multi-step flows, drawTableCard for data.
4. createNodeGraph: list nodes with id+label+sublabel, edges with from/to/label. Backend handles layout.
5. drawProcessRow steps: each step needs label, body (1 sentence), accent color, step number.
6. insertImage query: a specific real landmark, person, or object name (e.g. "Eiffel Tower Paris" not "city"). Always in English (image search query).
7. ${intent === 'math' || intent === 'finance'
    ? 'FORBIDDEN: do not use insertImage or insertVideo — use drawTableCard, drawFeatureCard, and createNodeGraph only.'
    : intent === 'story' || intent === 'emotional' || intent === 'travel'
      ? 'Use insertVideo for image slots (1–2 actions max). Use descriptive scene queries (e.g. "calm forest stream", "crowded market street"). You may also use insertImage. Prefer insertVideo over insertImage for act/emotional/travel image slots.'
      : 'Use insertImage when the topic has a strong visual subject. You may use insertVideo (max 1) in place of one insertImage for flow/comparison layouts.'}
8. Camera movement is automatic — do NOT emit panTo, zoomTo, or cameraFocus actions.
9. No two actions may share the same "time" value. Start at "0s", increment by at least 2s per action.
10. drawCodeCard lines: provide 4-8 real, meaningful lines of actual code for the topic. Not placeholder comments.

━━━ REQUIRED OUTPUT FORMAT ━━━
{"intent":"${intent}","title":"Concise Title Here","timeline":[...actions...]}`;
}

// ─── Snap AI-generated positions to the nearest declared slot ─────────────────
function snapToSlots(timeline, slots) {
  const SNAP_RADIUS = 80;  // tight — only fix clear drift, not intentional off-grid placements
  const SKIP_ACTIONS = new Set(['drawArrow', 'cameraFocus', 'voice', 'panTo', 'zoomTo', 'createNodeGraph', 'drawProcessRow', 'drawCompareCard', 'drawTimelineCard']);
  const slotList = Object.values(slots).filter(s => s && typeof s.x === 'number');
  return timeline.map(action => {
    const a = { ...action };
    if (!a.position || SKIP_ACTIONS.has(a.action)) return a;
    const best = slotList.reduce((closest, slot) => {
      const d = Math.hypot(a.position.x - slot.x, a.position.y - slot.y);
      return d < closest.d ? { d, slot } : closest;
    }, { d: Infinity, slot: null });
    if (best.d < SNAP_RADIUS && best.slot) {
      a.position = { x: best.slot.x, y: best.slot.y };
      if (best.slot.w && !a.width)  a.width  = best.slot.w;
      if (best.slot.h && !a.size)   a.size   = { w: best.slot.w || 220, h: best.slot.h };
      if (best.slot.style && !a.style) a.style = best.slot.style;
      if (best.slot.accent && !a.accent) a.accent = best.slot.accent;
    }
    return a;
  });
}

// ─── Stagger actions that share the same timestamp ────────────────────────────
function staggerDuplicateTimes(timeline) {
  const seen = {};
  return timeline.map(action => {
    const t = action.time || '0s';
    seen[t] = (seen[t] || 0) + 1;
    if (seen[t] > 1) {
      const ms = parseTimeMs(t) + (seen[t] - 1) * 200;
      return { ...action, time: `${ms / 1000}s` };
    }
    return action;
  });
}

// ─── Main handler ──────────────────────────────────────────────────────────────
async function generateCanvasTimeline(req, res) {
  const { prompt, conversationHistory } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });

  const intent = detectIntent(prompt);
  const layout = getLayout(intent);
  const systemPrompt = buildSystemPrompt(intent, layout);

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : []),
          { role: 'user', content: prompt.trim() },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'https://fynmanai.onrender.com',
          'X-Title': 'Agentic Visual Canvas',
        },
        timeout: 30000,
      }
    );

    const raw = response.data.choices?.[0]?.message?.content || '';
    const cleaned = extractJSON(raw);
    if (!cleaned) return res.status(500).json({ error: 'Failed to parse AI response', raw });

    const parsed = JSON.parse(cleaned);
    if (!parsed.timeline || !Array.isArray(parsed.timeline)) {
      return res.status(500).json({ error: 'Invalid timeline structure' });
    }

    if (intent === 'math' || intent === 'finance') {
      parsed.timeline = parsed.timeline.filter(
        a => a.action !== 'insertImage' && a.action !== 'insertVideo'
      );
    }

    parsed.timeline = parsed.timeline.map(enforceLayout);
    parsed.timeline = snapToSlots(parsed.timeline, layout.slots);
    parsed.timeline = injectCameraFocus(parsed.timeline);
    parsed.timeline = staggerDuplicateTimes(parsed.timeline);
    return res.json(parsed);

  } catch (err) {
    console.error('[Canvas API Error]', err?.response?.data || err.message);
    return res.status(500).json({
      error: 'AI generation failed',
      detail: err?.response?.data?.error?.message || err.message,
    });
  }
}

function extractJSON(text) {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function enforceLayout(action) {
  function clamp(pos) {
    if (!pos) return pos;
    return {
      x: Math.max(30,  Math.min(1370, Number(pos.x) || 30)),
      y: Math.max(30,  Math.min(1100, Number(pos.y) || 30)),
    };
  }
  const a = { ...action };
  if (a.position) a.position = clamp(a.position);
  if (a.from)     a.from     = clamp(a.from);
  if (a.to)       a.to       = clamp(a.to);
  if (a.size) {
    a.size = {
      w: Math.max(40, Math.min(1360, Number(a.size.w) || 220)),
      h: Math.max(40, Math.min(600,  Number(a.size.h) || 110)),
    };
  }
  if (a.action === 'writeText'  && !a.width) a.width = a.style === 'heading' ? 700 : 400;
  if (a.action === 'drawFormula'&& !a.width) a.width = 500;

  // Ensure lines is always an array for drawCodeCard
  if (a.action === 'drawCodeCard') {
    if (!Array.isArray(a.lines)) {
      a.lines = typeof a.lines === 'string' ? a.lines.split('\n') : ['// code here'];
    }
    if (!a.size) a.size = { w: 340, h: 220 };
  }

  // Ensure headers/rows are arrays for drawTableCard
  if (a.action === 'drawTableCard') {
    if (!Array.isArray(a.headers)) a.headers = typeof a.headers === 'string' ? a.headers.split('|') : [];
    if (!Array.isArray(a.rows))    a.rows    = [];
    if (!a.size) a.size = { w: 360, h: 220 };
  }

  // Default sizes for new card types
  if (a.action === 'drawHeroCard'     && !a.size) a.size = { w: 700, h: 120 };
  if (a.action === 'drawFeatureCard'  && !a.size) a.size = { w: 220, h: 110 };
  if (a.action === 'insertVideo'      && !a.size) a.size = { w: 320, h: 210 };
  if (a.action === 'drawStatCard'     && !a.size) a.size = { w: 220, h: 120 };
  if (a.action === 'drawQuoteCard'    && !a.size) a.size = { w: 340, h: 140 };
  if (a.action === 'drawCallout'      && !a.size) a.size = { w: 300, h:  90 };
  if (a.action === 'drawTimelineCard' && !a.size) a.size = { w: 240, h: 200 };
  if (a.action === 'drawCompareCard'  && !a.size) a.size = { w: 360, h: 180 };
  if (a.action === 'drawBadgeCard'    && !a.size) a.size = { w: 300, h: 110 };
  if (a.action === 'drawRadialCard'   && !a.size) a.size = { w: 180, h: 180 };
  if (a.action === 'drawGlowCard'     && !a.size) a.size = { w: 280, h: 150 };
  if (a.action === 'drawAvatarCard'   && !a.size) a.size = { w: 300, h: 140 };
  if (a.action === 'drawPillBanner'   && !a.size) a.size = { w: 420, h:  68 };
  if (a.action === 'drawStepCircle'   && !a.size) a.size = { w: 480, h: 160 };
  if (a.action === 'drawEmojiSticker' && !a.size) a.size = { w: 140, h: 140 };
  if (a.action === 'drawReactionBubble'&&!a.size) a.size = { w: 340, h:  60 };
  if (a.action === 'drawEmojiCloud'   && !a.size) a.size = { w: 380, h: 180 };

  // Validate reactions array for drawReactionBubble
  if (a.action === 'drawReactionBubble') {
    if (!Array.isArray(a.reactions)) a.reactions = [];
    a.reactions = a.reactions.slice(0, 8).map(r => ({
      emoji:  String(r.emoji  || '⭐'),
      count:  Number(r.count  || 0),
      accent: String(r.accent || 'violet'),
    }));
  }
  // Validate items array for drawEmojiCloud
  if (a.action === 'drawEmojiCloud') {
    if (!Array.isArray(a.items)) a.items = [];
    a.items = a.items.slice(0, 10).map(it => ({
      emoji:  String(it.emoji  || '✨'),
      label:  it.label ? String(it.label) : undefined,
      size:   ['sm','md','lg'].includes(it.size) ? it.size : 'md',
      accent: String(it.accent || 'violet'),
    }));
  }

  // Validate member arrays for drawAvatarCard
  if (a.action === 'drawAvatarCard') {
    if (!Array.isArray(a.members)) a.members = [];
    a.members = a.members.slice(0, 8).map(m => ({
      name:   String(m.name   || '?'),
      accent: String(m.accent || 'violet'),
      emoji:  m.emoji ? String(m.emoji) : undefined,
    }));
  }
  // Validate steps array for drawStepCircle
  if (a.action === 'drawStepCircle') {
    if (!Array.isArray(a.steps)) a.steps = [];
    a.steps = a.steps.slice(0, 6).map(s => ({
      label:  String(s.label  || ''),
      icon:   s.icon  ? String(s.icon)  : undefined,
      accent: String(s.accent || 'violet'),
    }));
  }

  // Validate milestones array for drawTimelineCard
  if (a.action === 'drawTimelineCard') {
    if (!Array.isArray(a.milestones)) a.milestones = [];
    a.milestones = a.milestones.slice(0, 6).map(m => ({
      date:  String(m.date  || ''),
      label: String(m.label || ''),
      done:  !!m.done,
    }));
  }
  // Validate badge arrays for drawBadgeCard
  if (a.action === 'drawBadgeCard') {
    if (!Array.isArray(a.badges)) a.badges = [];
    a.badges = a.badges.slice(0, 12).map(b => ({
      label:  String(b.label  || ''),
      accent: String(b.accent || 'violet'),
    }));
  }
  // Validate item arrays for drawCompareCard
  if (a.action === 'drawCompareCard') {
    if (!Array.isArray(a.leftItems))  a.leftItems  = [];
    if (!Array.isArray(a.rightItems)) a.rightItems = [];
    a.leftItems  = a.leftItems.slice(0, 5).map(String);
    a.rightItems = a.rightItems.slice(0, 5).map(String);
  }

  // Pre-compute BFS layout — cap to 820px so nodes never bleed into right column
  if (a.action === 'createNodeGraph' && a.nodes?.length) {
    // Cap at 6 nodes to prevent explosion; drop extras
    const trimmedNodes = a.nodes.slice(0, 6);
    const nodeIds = new Set(trimmedNodes.map(n => n.id));
    const trimmedEdges = (a.edges || []).filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    a.nodes = computeNodeLayout(trimmedNodes, trimmedEdges, 820);
    a.edges = trimmedEdges;
  }

  return a;
}

function parseTimeMs(t) {
  if (!t) return 0;
  const m = String(t).match(/^(\d+(?:\.\d+)?)(s|ms)?$/);
  if (!m) return 0;
  return parseFloat(m[1]) * (m[2] === 'ms' ? 1 : 1000);
}

function injectCameraFocus(timeline) {
  const triggers = new Set(['insertImage', 'insertVideo', 'createNodeGraph', 'createTimeline', 'drawProcessRow', 'drawTableCard']);
  const injected = [];
  timeline.forEach(action => {
    injected.push(action);
    if (triggers.has(action.action)) {
      const baseMs = parseTimeMs(action.time);
      const focusMs = baseMs + 1500;

      let focusPos, focusSize;
      if (action.action === 'createNodeGraph' && action.nodes?.length) {
        const base = action.position || { x: 200, y: 140 };
        const nodeW = 160, nodeH = 60;
        const xs = action.nodes.map(n => base.x + (n.x || 0));
        const ys = action.nodes.map(n => base.y + (n.y || 0));
        const minX = Math.min(...xs) - 20;
        const minY = Math.min(...ys) - 20;
        const maxX = Math.max(...xs) + nodeW + 20;
        const maxY = Math.max(...ys) + nodeH + 20;
        focusPos  = { x: minX, y: minY };
        focusSize = { w: maxX - minX, h: maxY - minY };
      } else if (action.action === 'createTimeline' && action.items?.length) {
        const base = action.position || { x: 100, y: 300 };
        const count = action.items.length;
        const gap = Math.min(220, Math.max(160, 900 / count));
        focusPos  = { x: base.x - 20, y: base.y - 20 };
        focusSize = { w: (count - 1) * gap + 155 + 40, h: 130 };
      } else if (action.action === 'drawProcessRow' && action.steps?.length) {
        const base  = action.position || { x: 100, y: 300 };
        const count = action.steps.length;
        const cardW = 155, gap = 50;
        focusPos  = { x: base.x - 20, y: base.y - 20 };
        focusSize = { w: count * (cardW + gap) + 20, h: 140 };
      } else if (action.action === 'drawTableCard') {
        focusPos  = action.position || { x: 200, y: 200 };
        focusSize = action.size    || { w: 360, h: 220 };
      } else {
        focusPos  = action.position || { x: 200, y: 200 };
        focusSize = action.size    || { w: 600, h: 400 };
      }

      injected.push({
        action: 'cameraFocus',
        time: `${focusMs / 1000}s`,
        position: focusPos,
        size: focusSize,
      });
    }
  });
  return injected;
}

module.exports = { generateCanvasTimeline };
