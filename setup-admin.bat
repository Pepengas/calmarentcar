@echo off
echo Calma Car Rental - Admin Panel Setup

echo.
echo Installing dependencies...
call npm install

echo.
echo Creating .env file template...
echo # Replace with your actual PostgreSQL connection string from Railway > .env
echo DATABASE_URL=your_postgresql_connection_string_here >> .env
echo PORT=3000 >> .env

echo.
echo Setup complete! To start the server, run:
echo npm run dev
echo.
echo Then open your browser and go to:
echo http://localhost:3000/admin-new
echo.
echo Press any key to start the server...
pause > nul

npm run dev 