@echo off
echo PostgreSQL Port Kontrol Aracı
echo ============================
echo.

echo PostgreSQL bağlantı bilgileri kontrol ediliyor...
echo.

echo 1. Aktif bağlantılar kontrol ediliyor (5432 portu - standart)...
netstat -ano | findstr ":5432" | findstr "LISTENING"
if %ERRORLEVEL% EQU 0 (
  echo [BULUNDU] PostgreSQL standart portta (5432) çalışıyor
) else (
  echo [BULUNAMADI] PostgreSQL 5432 portunda çalışmıyor
)
echo.

echo 2. Aktif bağlantılar kontrol ediliyor (5000 portu - özel)...
netstat -ano | findstr ":5000" | findstr "LISTENING"
if %ERRORLEVEL% EQU 0 (
  echo [BULUNDU] 5000 portunda çalışan bir servis bulundu
) else (
  echo [BULUNAMADI] 5000 portunda çalışan bir servis yok
)
echo.

echo 3. PostgreSQL servis durumu...
sc query postgresql | findstr "STATE"
if %ERRORLEVEL% EQU 0 (
  echo [BULUNDU] PostgreSQL servisi yüklü ve durumu yukarıda gösteriliyor
) else (
  echo [BULUNAMADI] PostgreSQL servisi bulunamadı
  echo PostgreSQL farklı bir isimle kurulmuş olabilir...
  echo.
  echo Mevcut servisler: (Postgresql ile ilgili olanları arayın)
  sc query | findstr "SERVICE_NAME"
)
echo.

echo 4. PgAdmin bağlantı testi...
echo [Bilgi] Bu testi PgAdmin'de manuel olarak gerçekleştirmeniz gerekiyor
echo - PgAdmin'i açın
echo - Sunucuya sağ tıklayın
echo - Properties seçin
echo - Connection sekmesine tıklayın
echo - Host: localhost, Port: 5432 (veya kendi özel portunuz)
echo - Save butonuna tıklayarak test edin
echo.

echo Bağlantı dizesini 5432 portu ile test etmek için (varsayılan):
echo postgresql://postgres:Asshnh.13@localhost:5432/huloud
echo.
echo Bağlantı dizesini 5000 portu ile test etmek için (özel):
echo postgresql://postgres:Asshnh.13@localhost:5000/huloud
echo.

pause