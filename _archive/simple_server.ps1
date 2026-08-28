# Simple .NET HTTP Server for PowerShell
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:8000/")
try {
    $listener.Start()
    Write-Host "Server started on http://127.0.0.1:8000/"
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        # Strip leading slash for Join-Path
        $relPath = $localPath.TrimStart("/")
        $filePath = Join-Path $pwd.Path $relPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $contentType = "text/plain"
            if ($filePath.EndsWith(".html")) { $contentType = "text/html" }
            elseif ($filePath.EndsWith(".css")) { $contentType = "text/css" }
            elseif ($filePath.EndsWith(".js")) { $contentType = "application/javascript" }
            elseif ($filePath.EndsWith(".png")) { $contentType = "image/png" }
            elseif ($filePath.EndsWith(".svg")) { $contentType = "image/svg+xml" }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $response.ContentType = "text/plain"
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
}
catch {
    Write-Error $_
}
finally {
    $listener.Close()
}
