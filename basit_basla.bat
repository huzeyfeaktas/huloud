@echo off
echo Basit Başlatma Scripti - Hata Teşhisi
echo ===================================
echo.

:: Değişkenleri ayarla
set DATABASE_URL=postgresql://postgres:Asshnh.13@localhost:5000/huloud
set NODE_ENV=development

echo Veritabanı bağlantısı: %DATABASE_URL%
echo Mod: %NODE_ENV%
echo.
echo Uygulama başlatılıyor...
echo.

:: Klasörleri oluştur
mkdir storage 2>nul
mkdir storage\users 2>nul

:: Uygulamayı başlat ve tüm çıktıyı göster
npx tsx server/index.ts

echo.
echo İşlem tamamlandı. Çıkmak için bir tuşa basın...
pause > nul