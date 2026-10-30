@echo off
setlocal
title CC Switch Classic - Development
cd /d "%~dp0"

rem Explorer does not inherit Codex's development PATH. Add installed tools
rem for this launcher and its children only; do not change the system PATH.
if exist "D:\nodejs\node.exe" set "PATH=D:\nodejs;%PATH%"
if exist "D:\rust\cargo\bin\cargo.exe" set "PATH=D:\rust\cargo\bin;%PATH%"
if not defined CARGO_HOME if exist "D:\rust\cargo" set "CARGO_HOME=D:\rust\cargo"
if not defined RUSTUP_HOME if exist "D:\rust\rustup" set "RUSTUP_HOME=D:\rust\rustup"
where pnpm >nul 2>&1
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" (
    set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
  )
)

if not exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
  echo Visual Studio C++ Build Tools were not found.
  goto :failed
)
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 (
  echo Could not initialize the Windows compiler.
  goto :failed
)
where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm was not found in PATH or the installed Codex runtime.
  goto :failed
)
where node >nul 2>&1
if errorlevel 1 goto :failed
where cargo >nul 2>&1
if errorlevel 1 goto :failed
where link >nul 2>&1
if errorlevel 1 goto :failed

if /i "%~1"=="--check" (
  node --version
  if errorlevel 1 goto :failed
  call pnpm --version
  if errorlevel 1 goto :failed
  cargo --version
  if errorlevel 1 goto :failed
  rustc --version
  if errorlevel 1 goto :failed
  echo Startup environment OK.
  exit /b 0
)

set "CARGO_BUILD_JOBS=2"
echo Starting CC Switch Classic. Keep this window open while using the app.
echo The first launch compiles the desktop application and may take several minutes.
echo This uses the current Windows user's CC Switch and client configuration.
call pnpm dev
if errorlevel 1 goto :failed
endlocal
exit /b 0

:failed
echo.
echo Startup failed. Please keep the error above for troubleshooting.
if /i not "%~1"=="--check" pause
exit /b 1
