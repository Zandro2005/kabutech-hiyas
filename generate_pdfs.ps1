
Write-Host "Rendering PDF: kabutech_hiyas_pure_schematic..."
Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList @(
  "--headless=new",
  "--disable-gpu",
  "--no-margins",
  "--allow-file-access-from-files",
  "--enable-local-file-accesses",
  "--virtual-time-budget=3000",
  "--print-to-pdf=C:\Users\ADMIN\Documents\kabutech-hiyas-main\firmware\assets\kabutech_hiyas_pure_schematic.pdf",
  "file:///C:/Users/ADMIN/Documents/kabutech-hiyas-main/kabutech_hiyas_pure_schematic_print.html"
) -Wait


Write-Host "Rendering PDF: kabutech_hiyas_schematic_no_text..."
Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList @(
  "--headless=new",
  "--disable-gpu",
  "--no-margins",
  "--allow-file-access-from-files",
  "--enable-local-file-accesses",
  "--virtual-time-budget=3000",
  "--print-to-pdf=C:\Users\ADMIN\Documents\kabutech-hiyas-main\firmware\assets\kabutech_hiyas_schematic_no_text.pdf",
  "file:///C:/Users/ADMIN/Documents/kabutech-hiyas-main/kabutech_hiyas_schematic_no_text_print.html"
) -Wait


Write-Host "Rendering PDF: kabutech_hiyas_schematic_proteus..."
Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList @(
  "--headless=new",
  "--disable-gpu",
  "--no-margins",
  "--allow-file-access-from-files",
  "--enable-local-file-accesses",
  "--virtual-time-budget=3000",
  "--print-to-pdf=C:\Users\ADMIN\Documents\kabutech-hiyas-main\firmware\assets\kabutech_hiyas_schematic_proteus.pdf",
  "file:///C:/Users/ADMIN/Documents/kabutech-hiyas-main/kabutech_hiyas_schematic_proteus_print.html"
) -Wait
