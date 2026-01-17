@echo off
REM AI Goal Inference Tests Runner with Environment Variables
REM Run from backend-vercel directory

echo Setting up test environment...

set SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
set NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04
set BACKEND_BASE=https://ever-reach-be.vercel.app
set TEST_ORIGIN=https://everreach.app
set TEST_EMAIL=isaiahdupree33@gmail.com
set TEST_PASSWORD=frogger12
set CLEANUP=true

echo.
echo Running AI Goal Inference Tests...
echo.

node test/ai/run-all.mjs

echo.
echo Tests complete!
