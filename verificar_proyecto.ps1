<#
============================================================
TalentIA - Verificacion local completa
Archivo: verificar_proyecto.ps1
============================================================

Ejecutar desde la raiz del proyecto:

    .\verificar_proyecto.ps1

Comprueba:
- Node y npm;
- sintaxis del backend Python;
- TypeScript de la aplicacion;
- TypeScript de las pruebas;
- tests Angular;
- build de produccion.

No inicia FastAPI y no modifica PostgreSQL.

IMPORTANTE:
Este archivo usa solamente caracteres ASCII para evitar
problemas de codificacion con Windows PowerShell 5.1.
============================================================
#>

$ErrorActionPreference = "Stop"

function Write-Step {
    param(
        [string]$Message
    )

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Stop-WithMessage {
    param(
        [string]$Message
    )

    Write-Host ""
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Write-Host ""
    exit 1
}

function Assert-LastExitCode {
    param(
        [string]$Message
    )

    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage $Message
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Frontend = Join-Path $Root "frontend"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Frontend)) {
    Stop-WithMessage "No se encontro la carpeta frontend. Coloca este archivo en la raiz de TalentIA."
}

if (-not (Test-Path $Backend)) {
    Stop-WithMessage "No se encontro la carpeta backend. Coloca este archivo en la raiz de TalentIA."
}

Write-Step "1. Entorno Node / npm"

try {
    $NodeVersion = & node --version
    Assert-LastExitCode "No fue posible ejecutar Node.js."

    $NpmVersion = & npm --version
    Assert-LastExitCode "No fue posible ejecutar npm."

    Write-Host "Node: $NodeVersion"
    Write-Host "npm:  $NpmVersion"
}
catch {
    Stop-WithMessage "Node.js o npm no estan disponibles en PATH."
}

Write-Step "2. Backend - sintaxis Python"

$PythonCommand = $null
$ProjectVenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$RootVenvPython = Join-Path $Root ".venv\Scripts\python.exe"

if (Test-Path $ProjectVenvPython) {
    $PythonCommand = $ProjectVenvPython
}
elseif (Test-Path $RootVenvPython) {
    $PythonCommand = $RootVenvPython
}
else {
    $PythonCommand = "python"
}

Push-Location $Backend

try {
    & $PythonCommand -m compileall -q app
    Assert-LastExitCode "El backend tiene errores de sintaxis Python."

    Write-Host "[OK] Backend Python compila correctamente." -ForegroundColor Green
}
finally {
    Pop-Location
}

Write-Step "3. Frontend - dependencias"

Push-Location $Frontend

try {
    if (-not (Test-Path "package.json")) {
        Stop-WithMessage "No existe frontend\package.json."
    }

    if (-not (Test-Path "node_modules")) {
        Write-Host "node_modules no existe. Ejecutando npm install..."

        & npm install
        Assert-LastExitCode "npm install fallo."
    }

    Write-Host "[OK] Dependencias disponibles." -ForegroundColor Green

    Write-Step "4. TypeScript de la aplicacion"

    & npx tsc -p tsconfig.app.json --noEmit
    Assert-LastExitCode "La aplicacion tiene errores TypeScript."

    Write-Host "[OK] TypeScript de la aplicacion." -ForegroundColor Green

    Write-Step "5. TypeScript de pruebas"

    & npx tsc -p tsconfig.spec.json --noEmit
    Assert-LastExitCode "Los archivos de prueba tienen errores TypeScript."

    Write-Host "[OK] TypeScript de pruebas." -ForegroundColor Green

    Write-Step "6. Tests Angular"

    & npm test -- --watch=false
    Assert-LastExitCode "Alguna prueba Angular fallo."

    Write-Host "[OK] Tests Angular." -ForegroundColor Green

    Write-Step "7. Build de produccion"

    & npm run build
    Assert-LastExitCode "El build de produccion fallo."

    Write-Host "[OK] Build de produccion." -ForegroundColor Green
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " TALENTIA - VERIFICACION COMPLETADA SIN ERRORES" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente prueba recomendada:"
Write-Host "  1. Iniciar FastAPI."
Write-Host "  2. Ejecutar: python backend\e2e_check.py"
Write-Host "  3. Ejecutar: python backend\e2e_check.py --full"
Write-Host ""
