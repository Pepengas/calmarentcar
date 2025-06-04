@echo off
echo Calma Car Rental - Commit Changes

echo.
echo Adding files to Git...
git add admin-new.html
git add admin-new.js
git add server-new.js
git add package.json
git add .env
git add ADMIN-PANEL-README.md
git add setup-admin.bat
git add RAILWAY-DATABASE-SETUP.md

echo.
echo Committing changes...
git commit -m "Add new admin panel with PostgreSQL database integration"

echo.
echo Pushing to GitHub...
git push

echo.
echo Done!
echo.
pause 