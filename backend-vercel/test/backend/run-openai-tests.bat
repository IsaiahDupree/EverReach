@echo off
REM Run E2E tests with OpenAI enabled
set RUN_OPENAI_TESTS=1

echo Running Screenshot Contact Linking Tests...
node test\backend\screenshot-linking-real.mjs
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo Running Voice Note Processing Tests...
node test\backend\voice-note-processing.mjs
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo Running Transcription Chunking Tests...
node test\backend\transcription-chunking.mjs
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo ========================================
echo All OpenAI-gated tests completed!
echo ========================================
