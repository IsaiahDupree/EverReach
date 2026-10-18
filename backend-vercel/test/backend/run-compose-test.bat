@echo off
REM Run compose smart test with OpenAI enabled
set RUN_OPENAI_TESTS=1

echo Running Compose Smart E2E Tests...
node test\backend\compose-smart.mjs
