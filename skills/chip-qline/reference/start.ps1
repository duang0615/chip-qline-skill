$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonExe = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) { $pythonExe = Join-Path $env:LOCALAPPDATA 'ChipQLine/.venv/Scripts/python.exe' }
if (-not (Test-Path -LiteralPath $pythonExe)) { & (Join-Path $PSScriptRoot 'setup.ps1'); $pythonExe = Join-Path $env:LOCALAPPDATA 'ChipQLine/.venv/Scripts/python.exe' }
try {
    $existing = Invoke-RestMethod -Uri 'http://127.0.0.1:8766/api/status' -TimeoutSec 2
    if ($existing.version) { Start-Process 'http://127.0.0.1:8766'; return }
} catch {}
Start-Process -FilePath $pythonExe -ArgumentList '-m','uvicorn','server:app','--host','127.0.0.1','--port','8766' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'server-error.log')
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try { Invoke-RestMethod -Uri 'http://127.0.0.1:8766/api/status' -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 250 }
}
Start-Process 'http://127.0.0.1:8766'
