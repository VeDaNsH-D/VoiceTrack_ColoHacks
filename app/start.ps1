$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$VenvDir = Join-Path $ScriptDir 'venv'
$RequirementsPath = Join-Path $ScriptDir 'requirements.txt'
$Port = if ($env:PORT) { $env:PORT } else { '8001' }

function Ensure-Ffmpeg {
  $wingetLinkDir = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links'
  if ((Test-Path $wingetLinkDir) -and -not ($env:PATH -split ';' | Where-Object { $_ -eq $wingetLinkDir })) {
    $env:PATH = "$wingetLinkDir;$env:PATH"
  }

  if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
    Write-Host 'ffmpeg found on PATH'
    return
  }

  Write-Host 'ffmpeg not found. Installing prerequisite...'

  $installed = $false

  if (Get-Command winget -ErrorAction SilentlyContinue) {
    try {
      winget install --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements -e
      $installed = $true
    } catch {
      Write-Host 'winget ffmpeg install failed, trying Chocolatey...'
    }
  }

  if (-not $installed -and (Get-Command choco -ErrorAction SilentlyContinue)) {
    try {
      choco install ffmpeg -y
      $installed = $true
    } catch {
      Write-Host 'Chocolatey ffmpeg install failed.'
    }
  }

  if (-not $installed) {
    throw 'Could not auto-install ffmpeg. Install it manually (winget/choco) and re-run start.ps1.'
  }

  $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ffmpeg) {
    if ((Test-Path $wingetLinkDir) -and (Test-Path (Join-Path $wingetLinkDir 'ffmpeg.exe'))) {
      $env:PATH = "$wingetLinkDir;$env:PATH"
      $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    }
  }

  if (-not $ffmpeg) {
    throw 'ffmpeg installation completed but ffmpeg is still not available in this shell. Restart terminal and run start.ps1 again.'
  }
}

Ensure-Ffmpeg

if (-not (Test-Path $VenvDir)) {
  Write-Host "Creating virtual environment in $VenvDir"
  if (Get-Command py -ErrorAction SilentlyContinue) {
    py -3 -m venv $VenvDir
  } elseif (Get-Command python -ErrorAction SilentlyContinue) {
    python -m venv $VenvDir
  } else {
    throw 'Python was not found. Install Python 3 and re-run start.ps1.'
  }
}

$PythonExe = Join-Path $VenvDir 'Scripts\python.exe'
if (-not (Test-Path $PythonExe)) {
  throw "Python executable not found in venv: $PythonExe"
}

& $PythonExe -m pip install --upgrade pip | Out-Null
& $PythonExe -m pip install -r $RequirementsPath

Set-Location $RepoRoot
& $PythonExe -m uvicorn app.main:app --reload --host 0.0.0.0 --port $Port
