# ---------------------------------------------------------------------------
# Criscom Group — Detener el stack local (Backend, ERP, Tienda y MySQL).
# ---------------------------------------------------------------------------
$ErrorActionPreference = 'SilentlyContinue'

function Stop-Port($name, $port) {
  $procs = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
  if (-not $procs) { Write-Host ("[=] {0,-9} :{1} no estaba activo" -f $name, $port) -ForegroundColor DarkGray; return }
  foreach ($p in $procs) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
  Write-Host ("[x] {0,-9} :{1} detenido" -f $name, $port) -ForegroundColor Yellow
}

Write-Host "== Deteniendo Criscom Group ==" -ForegroundColor Cyan
Stop-Port 'tienda'  3000
Stop-Port 'erp'     5173
Stop-Port 'backend' 3100

# MySQL: apagado limpio
& 'C:\Users\User\mysql\mysql-8.4.0-winx64\bin\mysqladmin.exe' --host=127.0.0.1 --port=3306 --user=root shutdown 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "[x] mysql     :3306 detenido (shutdown limpio)" -ForegroundColor Yellow }
else { Stop-Port 'mysql' 3306 }

Write-Host "Listo." -ForegroundColor Green
