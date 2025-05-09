@echo off
color 0A
title Huloud - Kurulum ve Başlatma
echo Huloud Kurulum ve Başlatma
echo =========================
echo.

echo NPM paketleri yükleniyor...
call npm install

echo.
echo Paketler yüklendi, uygulama başlatılıyor...
echo.

:: Uygulama klasörleri oluştur
mkdir storage 2>nul
mkdir storage\users 2>nul

:: Geliştirme modunda çalıştır
set NODE_ENV=development

npx tsx server/index.ts

pause