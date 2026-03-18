const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true, // Hata ayıklama için açık bırakıyoruz
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'POSAPP - Restoran Otomasyonu',
  });

  win.webContents.openDevTools(); // Açılışta console'u açar

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    // Standalone server'ı başlat
    // Paketlendiğinde __dirname resources/app/electron olur
    const serverPath = app.isPackaged
      ? path.join(path.dirname(app.getPath('exe')), 'server/server.js')
      : path.join(__dirname, '../.next/standalone/server.js');

    // ... serverPath tanımlamasından sonra ...
    serverProcess = spawn('node', [serverPath], {
      cwd: path.dirname(serverPath), // Çalışma dizinini server klasörü yapalım
      env: {
        ...process.env,
        PORT: '3001',
        HOSTNAME: '149.34.201.35', // localhost yerine 127.0.0.1
        NODE_ENV: 'production'
      }
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      if (data.toString().includes('Listening on port 3001')) {
        win.loadURL('http://localhost:3001/tr/login'); // Varsayılan olarak TR login
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
    });

    // Timeout fallback
    setTimeout(() => {
      if (!win.webContents.getURL()) {
        win.loadURL('http://localhost:3001/tr/login');
      }
    }, 5000);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('quit', () => {
  if (serverProcess) serverProcess.kill();
});
