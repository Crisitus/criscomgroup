# ---------------------------------------------------------------------------
# Criscom Group — Arranque local completo (MySQL + Backend + ERP + Tienda)
# Uso:  clic derecho > "Ejecutar con PowerShell"   o   .\start-all.ps1
# Requiere: Node.js y MySQL portable en C:\Users\User\mysql (ya instalados).
# ---------------------------------------------------------------------------
$ErrorActionPreference = 'SilentlyContinue'
$root      = $PSScriptRoot
$mysqlBin  = 'C:\Users\User\mysql\mysql-8.4.0-winx64\bin'
$mysqlData = 'C:\Users\User\mysql\data'
$logDir    = Join-Path $env:TEMP 'criscom-logs'
$nodeExe   = (Get-Command node.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-Port($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Start-Svc($name, $port, $file, $serviceArgs, $wd) {
  if (Test-Port $port) {
    Write-Host ("[=] {0,-9} ya activo en :{1}" -f $name, $port) -ForegroundColor DarkGray
    return
  }
  $runId = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $argumentLine = ($serviceArgs -join ' ')
  Start-Process -FilePath $file -ArgumentList $argumentLine -WorkingDirectory $wd -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "$name-$runId.out.log") `
    -RedirectStandardError  (Join-Path $logDir "$name-$runId.err.log")
  Write-Host ("[+] {0,-9} iniciando en :{1}" -f $name, $port) -ForegroundColor Green
}

Write-Host "== Criscom Group :: arranque local ==" -ForegroundColor Cyan

# 1) MySQL
Start-Svc 'mysql' 3306 (Join-Path $mysqlBin 'mysqld.exe') `
  @("--basedir=C:\Users\User\mysql\mysql-8.4.0-winx64", "--datadir=$mysqlData", '--port=3306') $mysqlBin

# Esperar a que MySQL acepte conexiones antes de arrancar el backend
Write-Host "[..] esperando MySQL..." -ForegroundColor Yellow
for ($i=0; $i -lt 30; $i++) {
  & (Join-Path $mysqlBin 'mysqladmin.exe') --host=127.0.0.1 --port=3306 --user=root ping 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

# 2) Backend API (:3100). Ejecutar Node directamente evita que Start-Process
# pierda el proceso al intentar abrir un archivo por lotes npm.cmd en segundo plano.
Start-Svc 'backend' 3100 $nodeExe @('src/index.js') (Join-Path $root 'Backend')

# 3) ERP Frontend precompilado (:5173). Evita compilar cada módulo al pulsar un menú.
Start-Svc 'erp' 5173 $nodeExe @('node_modules/vite/bin/vite.js','preview','--host','0.0.0.0','--port','5173') (Join-Path $root 'Frontend')

# 4) Tienda Ecommerce precompilada (:3000). Evita esperas de compilación al navegar.
Start-Svc 'tienda' 3000 $nodeExe @('node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port','3000') (Join-Path $root 'Ecommerce')

# Confirmar el arranque real. No anunciar servicios sanos solo porque se creó
# el proceso: un error de configuración puede cerrarlo antes de abrir el puerto.
foreach ($service in @(
  @{ Name = 'backend'; Port = 3100 },
  @{ Name = 'erp'; Port = 5173 },
  @{ Name = 'tienda'; Port = 3000 }
)) {
  for ($i = 0; $i -lt 30 -and -not (Test-Port $service.Port); $i++) {
    Start-Sleep -Milliseconds 500
  }
  if (Test-Port $service.Port) {
    Write-Host ("[OK] {0,-9} disponible en :{1}" -f $service.Name, $service.Port) -ForegroundColor Green
  } else {
    Write-Host ("[X]  {0,-9} no abrió :{1}; revisa sus logs" -f $service.Name, $service.Port) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Entra TODO por la tienda (origen unico, ella proxya ERP y API):" -ForegroundColor Cyan
Write-Host "  Tienda   ->  http://localhost:3000"
Write-Host "  Login    ->  http://localhost:3000/iniciar-sesion"
Write-Host "  ERP      ->  http://localhost:3000/erp   (te redirige aqui tras el login)"
Write-Host "  (directo ERP en http://localhost:5173/erp/ tambien funciona)"
Write-Host ""
Write-Host "Logs en: $logDir" -ForegroundColor DarkGray
Write-Host "Para detener todo:  .\stop-all.ps1" -ForegroundColor DarkGray
