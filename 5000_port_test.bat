@echo off
echo 5000 Portunda PostgreSQL Bağlantı Testi
echo ===================================
echo.

:: 5000 portunu kullan
set DATABASE_URL=postgresql://postgres:Asshnh.13@localhost:5000/huloud
set NODE_ENV=development

echo Bağlantı URL: %DATABASE_URL%
echo.
echo Bağlantı testi başlatılıyor...
echo.

:: Klasörleri oluştur
mkdir storage 2>nul
mkdir storage\users 2>nul

:: Bağlantıyı test et
echo. > bağlantı_sonucu.txt
npx tsx -e "const { Pool } = require('@neondatabase/serverless'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { if (err) { console.error('Bağlantı hatası:', err); process.exit(1); } else { console.log('Bağlantı başarılı! Yanıt:', res.rows[0]); process.exit(0); } });" 2>&1 | find /v "Warning"

echo.
if %ERRORLEVEL% EQU 0 (
  echo [BAŞARILI] 5000 Portunda PostgreSQL veritabanına bağlanıldı!
) else (
  echo [HATA] 5000 Portunda PostgreSQL veritabanına bağlanılamadı!
)

echo.
echo Testi bitirmek için bir tuşa basın...
pause > nul