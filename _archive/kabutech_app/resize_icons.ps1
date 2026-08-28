Add-Type -AssemblyName System.Drawing

$src = 'c:\Users\zguin\OneDrive\Desktop\Kabutech\assets\logo.png'
$base = 'C:\Users\zguin\OneDrive\Desktop\Kabutech\kabutech_app\android\app\src\main\res'

$sizes = @{
    'mipmap-mdpi'    = 48
    'mipmap-hdpi'    = 72
    'mipmap-xhdpi'   = 96
    'mipmap-xxhdpi'  = 144
    'mipmap-xxxhdpi' = 192
}

$img = [System.Drawing.Image]::FromFile($src)

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $dest = [System.IO.Path]::Combine($base, $folder, 'ic_launcher.png')
    
    # Create high quality scaled image
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    
    # Force delete existing to avoid lock issues
    if (Test-Path $dest) { Remove-Item $dest -Force }
    
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Written: $dest"
}
$img.Dispose()
Write-Host "All mushroom icons written successfully!"
