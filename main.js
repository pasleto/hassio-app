const { app, BrowserWindow, Menu, ipcMain, Tray, TouchBar, nativeTheme, shell } = require('electron');
const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar
const Store = require('./assets/store.js');
const isMac = process.platform === 'darwin';
let mainWindow, localUrlWindow, remoteUrlWindow, aboutWindow, optionsWindow;
const gotTheLock = app.requestSingleInstanceLock();

if (app.dock) app.dock.hide(); 

const store = new Store({
  configName: 'home-assistant-app-preferences',
  defaults: {
    startLogin: false,
    startHidden: false,
    preferRemote: false,
    preferMaximized: false,
    localUrl: 'http://hassio.local:8123/',
    remoteUrl: 'http://hassio.local:8123/'
  }
});

const homeAssistant = new TouchBarLabel();
homeAssistant.label = app.name;
homeAssistant.textColor = '#54c1f1';

const localButton = new TouchBarButton({
  label: 'Local',
  icon: __dirname + '/assets/iconSmall.png',
  iconPosition: 'left',
  click: () => { mainWindow.loadURL(store.get('localUrl')) }
});

const remoteButton = new TouchBarButton({
  label: 'Remote',
  icon: __dirname + '/assets/iconSmall.png',
  iconPosition: 'left',
  click: () => { mainWindow.loadURL(store.get('remoteUrl')) }
});

const closeButton = new TouchBarButton({
  label: 'Close',
  icon: __dirname + '/assets/iconSmall.png',
  iconPosition: 'left',
  click: () => { app.quit() }
});

const fullscreenButton = new TouchBarButton({
  label: 'Fullscreen',
  icon: __dirname + '/assets/iconSmall.png',
  iconPosition: 'left',
  click: () => { mainWindow.isFullScreen() ? mainWindow.setFullScreen(false) : mainWindow.setFullScreen(true) }
});

const touchBar = new TouchBar({
  items: [
    new TouchBarSpacer({ size: 'large' }),
    homeAssistant,
    new TouchBarSpacer({ size: 'large' }),
    localButton,
    new TouchBarSpacer({ size: 'small' }),
    remoteButton,
    new TouchBarSpacer({ size: 'flexible' }),
    fullscreenButton,
    new TouchBarSpacer({ size: 'small' }),
    closeButton,
    new TouchBarSpacer({ size: 'large' }),
  ]
});

function createMainWindow () { 
  tray = new Tray(__dirname + '/assets/iconSmall.png');
  tray.setToolTip('Home Assistant');
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 300,
    minHeight: 300,
    title: 'Home Assistant',
    icon: __dirname + '/assets/icon.ico',
    webPreferences: { nodeIntegration: true },
    skipTaskbar: ((isMac) ? false : true),
    autoHideMenuBar: ((isMac) ? false : true),
    minimizable: false,
    show: false
  });
  const contextMenuWin = Menu.buildFromTemplate([
    { label: ' Settings', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: 'About ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createAboutWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createAboutWindow()) } },
      { type: 'separator' },
      { label: ' Start Options', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createOptionsWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createOptionsWindow()) } },
      { label: ' Change Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createLocalUrlWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createLocalUrlWindow()) } },
      { label: ' Change Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createRemoteUrlWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createRemoteUrlWindow()) } }
    ] },
    { type: 'separator' },
    { label: ' History', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: 'Go Back', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.webContents.goBack() } },
      { label: 'Go Forward', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.webContents.goForward() } }
    ] },
    { type: 'separator' },
    { label: ' Window', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { role: 'reload', icon: __dirname + '/assets/iconSmall.png' },
      { role: 'forceReload', icon: __dirname + '/assets/iconSmall.png' },
      { role: 'toggleDevTools', icon: __dirname + '/assets/iconSmall.png' }
    ] },
    { type: 'separator' },
    { label: ' Connect to: ', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: ' Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('localUrl')) } },
      { label: ' Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('remoteUrl')) } }
    ]},
    { type: 'separator' },
    { label: ' Show / Hide ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? mainWindow.hide() : (store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()) } },
    { type: 'separator' },
    { label: ' Quit ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.close() ;app.quit() } }
  ]);
  const contextMenuMac = Menu.buildFromTemplate([
    { label: ' Show / Hide ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? mainWindow.hide() : (store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()) } },
    { type: 'separator' },
    { label: ' Connect to: ', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: ' Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('localUrl')) } },
      { label: ' Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('remoteUrl')) } }
    ]},
    { type: 'separator' },
    { label: ' Window', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { role: 'reload', icon: __dirname + '/assets/iconSmall.png' },
      { role: 'forceReload', icon: __dirname + '/assets/iconSmall.png' },
      { role: 'toggleDevTools', icon: __dirname + '/assets/iconSmall.png' }
    ] },
    { type: 'separator' },
    { label: ' History', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: 'Go Back', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.webContents.goBack() } },
      { label: 'Go Forward', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.webContents.goForward() } }
    ] },
    { type: 'separator' },
    { label: ' Settings', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: 'About ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createAboutWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createAboutWindow()) } },
      { type: 'separator' },
      { label: ' Start Options', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createOptionsWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createOptionsWindow()) } },
      { label: ' Change Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createLocalUrlWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createLocalUrlWindow()) } },
      { label: ' Change Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? ((localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createRemoteUrlWindow() : null) : ((store.get('preferMaximized') ? (mainWindow.maximize(),mainWindow.show()) : mainWindow.show()),createRemoteUrlWindow()) } }
    ] },
    { type: 'separator' },
    { label: ' Quit ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.close(); app.quit() } }
  ]);
  mainWindow.loadURL(store.get('preferRemote') ? store.get('remoteUrl') : store.get('localUrl'));
  if(!store.get('startHidden') && store.get('preferMaximized')) {
    mainWindow.maximize();
    mainWindow.show();
  }
  if(!store.get('startHidden') && !store.get('preferMaximized')) {
    mainWindow.show();
  }
  mainWindow.removeMenu();
  mainWindow.setTouchBar(touchBar);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => {
    if(mainWindow.isVisible()) {
      mainWindow.hide();
    } else if(store.get('preferMaximized')) {
      mainWindow.maximize();
      mainWindow.show();
    } else {
      mainWindow.show();
    }
  });
  tray.on('right-click', () => {
    tray.popUpContextMenu((isMac) ? contextMenuMac : contextMenuWin)
  });
  mainWindow.on('close', (e) => {
    if(mainWindow.isVisible()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', function () {
    mainWindow == null;
  });
};

function createLocalUrlWindow () {
  localUrlWindow = new BrowserWindow({
    width: 400,
    height: 200,
    parent: mainWindow,
    modal: true,
    maximizable: false,
    minimizable: false,
    resizable: false,
    title: 'Home Assistant - Local URL',
    icon: __dirname + '/assets/icon.ico',
    webPreferences: { nodeIntegration: true },
    autoHideMenuBar: true,
    frame: isMac ? true : false
  });
  localUrlWindow.loadFile('assets/localUrl.html');
  localUrlWindow.webContents.on('did-finish-load', function() {
    localUrlWindow.show();
    localUrlWindow.webContents.send('local:url:get', store.get('localUrl'));
    localUrlWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    localUrlWindow.focus();
  });
  localUrlWindow.on('closed', function () {
    localUrlWindow = null;
  })
};

function createRemoteUrlWindow () {
  remoteUrlWindow = new BrowserWindow({
    width: 400,
    height: 200,
    parent: mainWindow,
    modal: true,
    maximizable: false,
    minimizable: false,
    resizable: false,
    title: 'Home Assistant - Local URL',
    icon: __dirname + '/assets/icon.ico',
    webPreferences: { nodeIntegration: true },
    autoHideMenuBar: true,
    frame: isMac ? true : false
  });
  remoteUrlWindow.loadFile('assets/remoteUrl.html');
  remoteUrlWindow.webContents.on('did-finish-load', function() {
    remoteUrlWindow.show();
    remoteUrlWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    remoteUrlWindow.webContents.send('remote:url:get', store.get('remoteUrl'));
    remoteUrlWindow.focus();
  });
  remoteUrlWindow.on('closed', function () {
    remoteUrlWindow = null;
  })
};

function createAboutWindow () {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 230,
    parent: mainWindow,
    maximizable: false,
    minimizable: false,
    resizable: false,
    movable: false,
    modal: true,
    title: 'About',
    icon: __dirname + '/assets/icon.ico',
    webPreferences: { nodeIntegration: true },
    autoHideMenuBar: true,
    frame: isMac ? true : false
  });
  aboutWindow.loadFile('assets/aboutWindow.html');
  aboutWindow.webContents.on('did-finish-load', function() {
    aboutWindow.show();
    aboutWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    aboutWindow.webContents.send('about:version', app.getVersion());
    aboutWindow.focus();
  });
  aboutWindow.on('closed', function () {
    aboutWindow = null;
  });
};

function createOptionsWindow () {
  optionsWindow = new BrowserWindow({
    width: 300,
    height: 350,
    parent: mainWindow,
    maximizable: false,
    minimizable: false,
    resizable: false,
    movable: false,
    modal: true,
    title: 'Start Options',
    icon: __dirname + '/assets/icon.ico',
    webPreferences: { nodeIntegration: true },
    autoHideMenuBar: true,
    frame: isMac ? true : false
  });
  optionsWindow.loadFile('assets/startOptions.html');
  optionsWindow.webContents.on('did-finish-load', function() {
    optionsWindow.show();
    optionsWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    optionsWindow.webContents.send('app:settings:startMaximized', store.get('preferMaximized'));
    optionsWindow.webContents.send('app:settings:startRemote', store.get('preferRemote'));
    optionsWindow.webContents.send('app:settings:startLogin', store.get('startLogin'));
    optionsWindow.webContents.send('app:settings:startHidden', store.get('startHidden'));
    optionsWindow.focus();
  });
  optionsWindow.on('closed', function () {
    optionsWindow = null;
  })
};

ipcMain.on('local:url:set', (e,value) => {
  store.set('localUrl', value);
  localUrlWindow.close();
});

ipcMain.on('remote:url:set', (e,value) => {
  store.set('remoteUrl', value);
  remoteUrlWindow.close();
});

ipcMain.on('app:settings:startMaximized:false', () => {
  store.set('preferMaximized', false);
});

ipcMain.on('app:settings:startMaximized:true', () => {
  store.set('preferMaximized', true);
});

ipcMain.on('app:settings:startRemote:false', () => {
  store.set('preferRemote', false);
});

ipcMain.on('app:settings:startRemote:true', () => {
  store.set('preferRemote', true);
});

ipcMain.on('app:settings:startLogin:false', () => {
  store.set('startLogin', false);
});

ipcMain.on('app:settings:startLogin:true', () => {
  store.set('startLogin', true);
});

ipcMain.on('app:settings:startHidden:false', () => {
  store.set('startHidden', false);
});

ipcMain.on('app:settings:startHidden:true', () => {
  store.set('startHidden', true);
});

ipcMain.on('app:settings:app:restart', () => {
  optionsWindow.close();
  mainWindow.close();
  app.quit();
  app.relaunch();
});

ipcMain.on('app:about:github', (e, value) => {
  shell.openExternal(value);
  aboutWindow.close();
});

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
      if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
      }
  });
  app.on('ready', createMainWindow);
};

app.setLoginItemSettings({
  openAtLogin: store.get('startLogin')
});

app.on('window-all-closed', function () {
  app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createMainWindow();
});