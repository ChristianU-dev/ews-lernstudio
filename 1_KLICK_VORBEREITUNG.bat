@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================================
echo   EWS-Lernstudio - 1-Klick-Vorbereitung (KEIN API-Key erforderlich!)
echo ============================================================================
echo.
echo Pruefe Basis-Werkzeuge (Git, Node.js LTS, Python 3.12)...

where git >nul 2>&1 || (
    echo [1/3] Installiere Git via winget...
    winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
)
where node >nul 2>&1 || (
    echo [2/3] Installiere Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
)
where python >nul 2>&1 || (
    echo [3/3] Installiere Python 3.12 via winget...
    winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements
)

echo.
echo [OK] Alle Basis-Werkzeuge bereit! Es wird KEIN API-Key benoetigt.
echo Oeffne jetzt genau diesen Ordner in Antigravity, stelle Terminal auf Turbo
echo und fuege den Start-Prompt ein!
echo ============================================================================
pause
