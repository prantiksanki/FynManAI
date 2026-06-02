import sys
import os
import json
import uuid

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    ListFlowable, ListItem, HRFlowable,
)


# Mirrors tts_worker.py / manim_worker.py:
#   argv = [spec_path, out_dir]
#   - reads a report spec (JSON) written by the Node controller
#   - renders a styled PDF to out_dir as <uuid>.pdf
#   - prints ONLY the filename to stdout so Node can read it cleanly
#
# The spec is data only (never executable code), so there is no sandboxing
# concern here beyond reading a local JSON file.

ACCENT  = colors.HexColor("#7c6af7")
DARK    = colors.HexColor("#1a1f2e")
MUTED   = colors.HexColor("#55607a")
BORDER  = colors.HexColor("#d4d8e4")
HEADBG  = colors.HexColor("#7c6af7")


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="FynTitle", parent=styles["Title"],
        fontSize=24, leading=28, textColor=DARK, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="FynSubtitle", parent=styles["Normal"],
        fontSize=11, leading=15, textColor=MUTED, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="FynHeading", parent=styles["Heading2"],
        fontSize=14, leading=18, textColor=ACCENT, spaceBefore=14, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="FynBody", parent=styles["Normal"],
        fontSize=10.5, leading=15, textColor=DARK, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="FynBullet", parent=styles["Normal"],
        fontSize=10.5, leading=15, textColor=DARK,
    ))
    return styles


def add_stats(story, stats, styles):
    if not isinstance(stats, list) or not stats:
        return
    cells = []
    for s in stats[:4]:
        if not isinstance(s, dict):
            continue
        label = str(s.get("label", ""))
        value = str(s.get("value", ""))
        sub   = str(s.get("sub", ""))
        block = (
            f'<font size=16 color="#7c6af7"><b>{value}</b></font><br/>'
            f'<font size=8 color="#1a1f2e"><b>{label}</b></font><br/>'
            f'<font size=7 color="#55607a">{sub}</font>'
        )
        cells.append(Paragraph(block, styles["FynBody"]))
    if not cells:
        return
    table = Table([cells], colWidths=[(170 * mm) / len(cells)] * len(cells))
    table.setStyle(TableStyle([
        ("BOX",        (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID",  (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    story.append(table)
    story.append(Spacer(1, 10))


def add_table(story, tbl, styles):
    if not isinstance(tbl, dict):
        return
    headers = tbl.get("headers") or []
    rows    = tbl.get("rows") or []
    if not headers and not rows:
        return
    data = []
    if headers:
        data.append([str(h) for h in headers])
    for r in rows:
        if isinstance(r, list):
            data.append([str(c) for c in r])
    if not data:
        return
    ncols = max(len(r) for r in data)
    data = [r + [""] * (ncols - len(r)) for r in data]
    table = Table(data, colWidths=[(170 * mm) / ncols] * ncols, repeatRows=1 if headers else 0)
    style = [
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("TEXTCOLOR",  (0, 0), (-1, -1), DARK),
    ]
    if headers:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), HEADBG),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    table.setStyle(TableStyle(style))
    story.append(table)
    story.append(Spacer(1, 8))


def main():
    if len(sys.argv) < 3:
        print("Usage: report_worker.py <spec_path> <out_dir>", file=sys.stderr)
        sys.exit(1)

    spec_path = sys.argv[1]
    out_dir   = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    with open(spec_path, encoding="utf-8") as f:
        spec = json.load(f)

    filename = uuid.uuid4().hex + ".pdf"
    out_path = os.path.join(out_dir, filename)

    styles = build_styles()
    story  = []

    title = str(spec.get("title", "Report"))
    story.append(Paragraph(title, styles["FynTitle"]))
    if spec.get("subtitle"):
        story.append(Paragraph(str(spec["subtitle"]), styles["FynSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=12))

    add_stats(story, spec.get("stats"), styles)

    for section in spec.get("sections", []):
        if not isinstance(section, dict):
            continue
        if section.get("heading"):
            story.append(Paragraph(str(section["heading"]), styles["FynHeading"]))
        if section.get("body"):
            story.append(Paragraph(str(section["body"]), styles["FynBody"]))
        bullets = section.get("bullets")
        if isinstance(bullets, list) and bullets:
            items = [ListItem(Paragraph(str(b), styles["FynBullet"]), leftIndent=10)
                     for b in bullets]
            story.append(ListFlowable(items, bulletType="bullet", start="•",
                                      bulletColor=ACCENT))
            story.append(Spacer(1, 4))
        if section.get("table"):
            add_table(story, section["table"], styles)

    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=title, author="FynmanAI",
    )
    doc.build(story)

    # Print ONLY the filename to stdout so Node can read it cleanly.
    print(filename)


if __name__ == "__main__":
    main()
