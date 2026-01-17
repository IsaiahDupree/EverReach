@echo off
REM Run transcription chunking test with OpenAI enabled
set RUN_OPENAI_TESTS=1

echo Running Transcription Chunking Tests...
node test\backend\transcription-chunking.mjs
