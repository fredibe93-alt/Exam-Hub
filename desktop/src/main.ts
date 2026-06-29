import { app, BrowserWindow, shell, Menu } from 'electron';
import path from 'path';
import { startServer } from './server/index';

const PORT = 13337;

let mainWindow: BrowserWindow | null = null;

function getWebDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'web');
  return path.join(__dirname, '..', 'web');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'ExamHub',
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'ExamHub',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => { const wc = mainWindow?.webContents; if (wc) wc.setZoomFactor(wc.getZoomFactor() + 0.1); } },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => { const wc = mainWindow?.webContents; if (wc) wc.setZoomFactor(Math.max(0.5, wc.getZoomFactor() - 0.1)); } },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.setZoomFactor(1) },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', click: () => mainWindow?.setFullScreen(!mainWindow?.isFullScreen()) },
      ],
    },
  ]));

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  const dataDir = app.getPath('userData');
  const webDir = getWebDir();

  try {
    await startServer(PORT, dataDir, webDir);
    console.log(`[ExamHub] Server running at http://127.0.0.1:${PORT}`);
  } catch (err) {
    console.error('[ExamHub] Failed to start server:', err);
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
