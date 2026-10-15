import os
import subprocess

svg_path = r"c:\Users\ADMIN\Documents\kabutech-hiyas-main\firmware\assets\kabutech_hiyas_schematic.svg"
with open(svg_path, "r", encoding="utf-8") as f:
    svg_content = f.read()

html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
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
{svg_content}
</body>
</html>"""

html_path = r"c:\Users\ADMIN\Documents\kabutech-hiyas-main\schematic_print.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

pdf_out = r"c:\Users\ADMIN\Documents\kabutech-hiyas-main\test_page_sized.pdf"
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

args = [
    f'Start-Process -FilePath "{edge_path}" -ArgumentList @(',
    '  "--headless=new",',
    '  "--disable-gpu",',
    '  "--no-margins",',
    '  "--allow-file-access-from-files",',
    '  "--enable-local-file-accesses",',
    '  "--virtual-time-budget=3000",',
    f'  "--print-to-pdf={pdf_out}",',
    f'  "file:///{html_path.replace(os.sep, "/")}"',
    ') -Wait'
]
ps_cmd = "\n".join(args)

ps_file = r"c:\Users\ADMIN\Documents\kabutech-hiyas-main\run_print.ps1"
with open(ps_file, "w", encoding="utf-8") as f:
    f.write(ps_cmd)

print("Generated print script.")
