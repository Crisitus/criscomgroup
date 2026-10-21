#Requires -RunAsAdministrator
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$logPath = Join-Path $projectRoot 'install-docker-dev.log'

Start-Transcript -Path $logPath -Append
try {
    & winget list --id Microsoft.WSL --exact --accept-source-agreements | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Instalando WSL 2...'
        & winget install --id Microsoft.WSL --exact --accept-source-agreements --accept-package-agreements --silent --disable-interactivity
        if ($LASTEXITCODE -ne 0) {
            throw "La instalación de WSL terminó con código $LASTEXITCODE."
        }
    }
    else {
        Write-Host 'WSL 2 ya está instalado.'
    }

    Write-Host 'Habilitando características requeridas...'
    & dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    if ($LASTEXITCODE -notin @(0, 3010)) { throw "DISM (WSL) terminó con código $LASTEXITCODE." }
    & dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
    if ($LASTEXITCODE -notin @(0, 3010)) { throw "DISM (VirtualMachinePlatform) terminó con código $LASTEXITCODE." }

    & winget list --id Docker.DockerDesktop --exact --accept-source-agreements | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Instalando Docker Desktop...'
        & winget install --id Docker.DockerDesktop --exact --accept-source-agreements --accept-package-agreements --silent --disable-interactivity
        if ($LASTEXITCODE -ne 0) {
            throw "La instalación de Docker Desktop terminó con código $LASTEXITCODE."
        }
    }
    else {
        Write-Host 'Docker Desktop ya está instalado.'
    }

    Write-Host 'Instalación terminada. Reinicia Windows antes de ejecutar Docker Desktop.' -ForegroundColor Green
}
finally {
    Stop-Transcript
}
