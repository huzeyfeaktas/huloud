@echo off
color 0A
title Huloud Cloud - Bellek İçi Depolama Modu
echo Huloud Cloud - Bellek İçi Depolama Modu
echo ===================================
echo.

echo Bu mod veritabanı bağlantısı gerektirmez ve hemen çalışır.
echo Not: Uygulama kapatıldığında tüm veriler silinir.
echo.

:: Node modüllerinin varlığını kontrol et
if not exist "node_modules" (
    echo Node.js modülleri bulunamadı. Yükleniyor...
    echo Bu işlem biraz zaman alabilir, lütfen bekleyin...
    call npm install
    echo.
    echo Node.js modülleri yüklendi!
    echo.
)

:: Klasörleri oluştur
mkdir storage 2>nul
mkdir storage\\users 2>nul

:: Bellek içi depolama kullanıyoruz, veritabanı bağlantısı gerekmez
set NODE_ENV=development

:: Uygulamayı başlat
echo.
echo Huloud Cloud başlatılıyor...
echo.
echo Uygulama başarıyla başlatıldığında tarayıcınızı açın ve
echo http://localhost:3000 adresini ziyaret edin.
echo.
echo Admin kullanıcı bilgileri:
echo Kullanıcı Adı: huzeyfeakt
echo Şifre: Asshnh.13
echo.
echo Uygulamayı durdurmak için bu pencereyi kapatın.
echo.
npx tsx server/index.ts

pause