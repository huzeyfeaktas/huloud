@echo off
color 0A
title Huloud Başlatma Aracı v1.0
echo Huloud - Genişletilmiş Başlatıcı
echo ===========================
echo.

:: Yapılandırma dosyaları için klasörleri oluştur
echo Depolama dizinleri hazırlanıyor...
mkdir storage 2>nul
mkdir storage\users 2>nul
echo Depolama dizinleri hazır.
echo.

:: PostgreSQL port seçimi
set pg_port=5432
echo PostgreSQL port seçenekleri:
echo 1) Standart port (5432)
echo 2) Özel port (5000)
echo 3) Farklı bir port gir
set /p port_choice=Seçiminiz (1-3): 

if "%port_choice%"=="1" (
  set pg_port=5432
  echo Standart port (5432) seçildi.
) else if "%port_choice%"=="2" (
  set pg_port=5000
  echo Özel port (5000) seçildi.
) else if "%port_choice%"=="3" (
  set /p pg_port=Port numarasını girin: 
  echo %pg_port% portu seçildi.
) else (
  echo Geçersiz seçim, standart port (5432) kullanılacak.
  set pg_port=5432
)
echo.

:: Veritabanı ismi
set db_name=huloud
echo Veritabanı ismi [%db_name%]: 
set /p db_name_input=Değiştirmek için yeni isim girin veya varsayılan için ENTER tuşuna basın: 
if not "%db_name_input%"=="" set db_name=%db_name_input%
echo.

:: Veritabanı kullanıcı adı
set db_user=postgres
echo Veritabanı kullanıcı adı [%db_user%]: 
set /p db_user_input=Değiştirmek için yeni kullanıcı adı girin veya varsayılan için ENTER tuşuna basın: 
if not "%db_user_input%"=="" set db_user=%db_user_input%
echo.

:: Veritabanı şifresi
set db_password=Asshnh.13
echo Veritabanı şifresi [%db_password%]: 
set /p db_password_input=Değiştirmek için yeni şifre girin veya varsayılan için ENTER tuşuna basın: 
if not "%db_password_input%"=="" set db_password=%db_password_input%
echo.

:: Bağlantı dizesi oluştur
set DATABASE_URL=postgresql://%db_user%:%db_password%@localhost:%pg_port%/%db_name%
echo Veritabanı bağlantı dizesi:
echo %DATABASE_URL%
echo.

:: Çalıştırma modu
set NODE_ENV=development
echo Çalıştırma modu [%NODE_ENV%]:
echo 1) Geliştirme (development) 
echo 2) Üretim (production)
set /p mode_choice=Seçiminiz (1-2): 

if "%mode_choice%"=="1" (
  set NODE_ENV=development
  echo Geliştirme modu seçildi.
) else if "%mode_choice%"=="2" (
  set NODE_ENV=production
  echo Üretim modu seçildi.
) else (
  echo Geçersiz seçim, geliştirme modu kullanılacak.
  set NODE_ENV=development
)
echo.

:: Port seçimi
set app_port=3000
echo Uygulama port seçimi [%app_port%]:
set /p app_port_input=Değiştirmek için yeni port numarası girin veya varsayılan için ENTER tuşuna basın: 
if not "%app_port_input%"=="" set app_port=%app_port_input%
set PORT=%app_port%
echo.

echo Özet Bilgiler:
echo --------------
echo PostgreSQL Port: %pg_port%
echo Veritabanı Adı: %db_name% 
echo Kullanıcı Adı: %db_user%
echo Şifre: %db_password%
echo Çalıştırma Modu: %NODE_ENV%
echo Uygulama Portu: %app_port%
echo.

echo Uygulamayı başlatmak için ENTER tuşuna basın, iptal etmek için CTRL+C tuşlarına basın...
pause > nul

echo.
echo Huloud uygulaması başlatılıyor...
echo.
npx tsx server/index.ts

pause