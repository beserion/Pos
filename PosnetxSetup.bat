@echo off
SETLOCAL EnableDelayedExpansion

echo [1/4] PM2 kuresel olarak kuruluyor...
call npm install pm2 -g

echo [2/4] PM2 Windows Startup servisi kuruluyor...
call npm install pm2-windows-startup -g

echo [3/4] Startup kaydi olusturuluyor...
call pm2-startup install

echo [4/4] Ecosystem dosyasi baslatiliyor...
if exist "ecosystem.config.js" (
    call pm2 start ecosystem.config.js
    call pm2 save
    echo Islem basariyla tamamlandi.
) else (
    echo HATA: Bulunulan dizinde ecosystem.config.js dosyasi bulunamadi!
)

pause