@echo off
set NODE_OPTIONS=--openssl-legacy-provider

REM 安裝服務器依賴
cd server
call npm install
cd ..

REM 啟動本地模擬服務器
start cmd /k "cd server && npm start"

REM 啟動前端開發服務器
npm run start