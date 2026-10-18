@echo off
REM Run screenshot linking test with OpenAI enabled
set RUN_OPENAI_TESTS=1

echo Running Screenshot Contact Linking Tests...
node test\backend\screenshot-linking-real.mjs
