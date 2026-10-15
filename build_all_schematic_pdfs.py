import os
import re
import subprocess
import time

WS_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(WS_DIR, "firmware", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)
ART_DIR = os.environ.get("GEMINI_ARTIFACT_DIR", "")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 1. Load the original SVG
svg_orig_path = os.path.join(ASSETS_DIR, "kabutech_hiyas_schematic.svg")
with open(svg_orig_path, "r", encoding="utf-8") as f:
    orig_svg = f.read()

# -----------------------------------------------------------------------------
# VERSION 1: Pure Clean Schematic (No <TEXT> placeholders, no verbose descriptions)
# -----------------------------------------------------------------------------
# We hide .text-placeholder and .text-desc via CSS and clean up redundant text
clean_svg = orig_svg
# Update CSS to cleanly hide placeholders and descriptions
clean_css = """
        .text-ref { font-family: 'Consolas', 'Courier New', monospace; font-size: 15px; font-weight: bold; fill: #000000; }
        .text-val { font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; font-weight: bold; fill: #004400; }
        .text-placeholder { display: none; }
        .text-pin-name { font-family: 'Arial', sans-serif; font-size: 13px; font-weight: bold; fill: #000000; }
        .text-pin-num { font-family: 'Consolas', monospace; font-size: 12px; font-weight: bold; fill: #990000; }
        .text-hdr { font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 800; fill: #102B19; letter-spacing: 0.5px; }
        .text-desc { display: none; }
"""
clean_svg = re.sub(r'\.text-ref\s*\{.*?\.text-desc\s*\{[^}]*\}', clean_css.strip(), clean_svg, flags=re.DOTALL)

# -----------------------------------------------------------------------------
# VERSION 2: Zero-Text Schematic (Pure symbols, wires, and geometry only)
# -----------------------------------------------------------------------------
notext_svg = orig_svg
notext_css = """
        text { display: none !important; }
"""
notext_svg = re.sub(r'</style>', notext_css + '\n    </style>', notext_svg)

# -----------------------------------------------------------------------------
# VERSION 3: Full Proteus ISIS Schematic (with <TEXT> placeholders preserved)
# -----------------------------------------------------------------------------
full_svg = orig_svg

versions = [
    ("kabutech_hiyas_pure_schematic", clean_svg, "Pure Clean Schematic (No <TEXT> Placeholders, No Article Texts)"),
    ("kabutech_hiyas_schematic_no_text", notext_svg, "Zero-Text Schematic (Pure Symbols & Wires Only)"),
    ("kabutech_hiyas_schematic_proteus", full_svg, "Original Proteus ISIS Schematic (Full Annotations)"),
]

# Generate SVGs and print HTML files
print_jobs = []
for name, svg_str, desc in versions:
    # Save SVG in assets
    ws_svg = os.path.join(ASSETS_DIR, f"{name}.svg")
    with open(ws_svg, "w", encoding="utf-8") as f:
        f.write(svg_str)

    if ART_DIR and os.path.isdir(ART_DIR):
        art_svg = os.path.join(ART_DIR, f"{name}.svg")
        with open(art_svg, "w", encoding="utf-8") as f:
            f.write(svg_str)


    # HTML wrapper for Edge print
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{desc}</title>
<style>
  @page {{
    size: 2860px 1720px;
    margin: 0;
  }}
  html, body {{
    margin: 0;
    padding: 0;
    width: 2860px;
    height: 1720px;
    background-color: #DFE5D5;
    overflow: hidden;
  }}
  svg {{
    display: block;
    width: 2860px;
    height: 1720px;
  }}
</style>
</head>
<body>
{svg_str}
</body>
</html>"""
    
    html_file = os.path.join(WS_DIR, f"{name}_print.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    ws_pdf = os.path.join(ASSETS_DIR, f"{name}.pdf")
    art_pdf = os.path.join(ART_DIR, f"{name}.pdf") if (ART_DIR and os.path.isdir(ART_DIR)) else None
    print_jobs.append((name, html_file, ws_pdf, art_pdf))

# Build powershell batch print script
ps_commands = []
for name, html_file, ws_pdf, art_pdf in print_jobs:
    url = f"file:///{html_file.replace(os.sep, '/')}"
    copy_cmd = f'\nif (Test-Path "{os.path.dirname(art_pdf)}") {{ Copy-Item "{ws_pdf}" "{art_pdf}" -Force }}' if art_pdf else ""
    ps_commands.append(f"""
Write-Host "Rendering PDF: {name}..."
Start-Process -FilePath "{EDGE_PATH}" -ArgumentList @(
  "--headless=new",
  "--disable-gpu",
  "--no-margins",
  "--allow-file-access-from-files",
  "--enable-local-file-accesses",
  "--virtual-time-budget=3000",
  "--print-to-pdf={ws_pdf}",
  "{url}"
) -Wait{copy_cmd}
""")

ps_script_path = os.path.join(WS_DIR, "generate_pdfs.ps1")
with open(ps_script_path, "w", encoding="utf-8") as f:
    f.write("\n".join(ps_commands))

print("PDF generation script prepared successfully.")

