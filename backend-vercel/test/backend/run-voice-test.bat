@echo off
REM Run voice note test with OpenAI enabled
set RUN_OPENAI_TESTS=1

echo Running Voice Note Processing Tests...
node test\backend\voice-note-processing.mjs
