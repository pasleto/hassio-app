const { app, BrowserWindow, Menu, ipcMain, Tray, TouchBar, nativeTheme, shell } = require('electron');
const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar
const Store = require('./store.js');
const isMac = process.platform === 'darwin';
let mainWindow, localUrlWindow, remoteUrlWindow, aboutWindow, optionsWindow;
const gotTheLock = app.requestSingleInstanceLock();

const store = new Store({
  configName: 'home-assistant-app-preferences',
  defaults: {
    startLogin: false,
    startHidden: false,
    preferRemote: false,
    preferMaximized: false,
    preferTray: false,
    localUrl: 'http://hassio.local:8123/',
    remoteUrl: 'http://hassio.local:8123/'
  }
});

const appMenu = Menu.buildFromTemplate([
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { label: 'About ' + app.name, click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createAboutWindow() : null } },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : [
    {
      label: app.name,
      submenu: [
        { label: 'About ' + app.name, click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createAboutWindow() : null } },
        { role: 'quit' }
      ]
    }
  ]),
  {
    label: 'Connection',
    submenu: [
      { label: ' Connect to Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('localUrl')) } },
      { type: 'separator' },
      { label: ' Connect to Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('remoteUrl')) } }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { type: 'separator' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { label: 'Maximize / Unmaximize', click: () => { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize() } }
    ]
  },
  {
    label: 'History',
    submenu: [
      { label: 'Go Back', click: () => { mainWindow.webContents.goBack() } },
      { label: 'Go Forward', click: () => { mainWindow.webContents.goForward() } }
    ]
  },
  { label: 'Settings',
    submenu: [
      { label: ' Start Options', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createOptionsWindow() : null } },
      { type: 'separator' },
      { label: ' Change Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createLocalUrlWindow() : null } },
      { type: 'separator' },
      { label: ' Change Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createRemoteUrlWindow() : null } }
    ]
  }
]);

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
  label: store.get('preferTray') ? 'Close' : 'Quit',
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
  if (app.dock && store.get('preferTray')) app.dock.hide();  
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
    skipTaskbar: ((isMac) ? false : (store.get('preferTray') ? true : false)),
    autoHideMenuBar: ((isMac) ? false : true),
    minimizable: (store.get('preferTray') ? false : true),
    show: !store.get('startHidden')
  });
  Menu.setApplicationMenu(appMenu);
  const contextMenuWin = Menu.buildFromTemplate([
    { label: ' Connect to: ', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: ' Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('localUrl')) } },
      { label: ' Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('remoteUrl')) } }
    ]},
    { type: 'separator' },
    { label: ' Settings', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: 'About ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createAboutWindow() : null } },
      { type: 'separator' },
      { label: ' Start Options', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createOptionsWindow() : null } },
      { label: ' Change Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createLocalUrlWindow() : null } },
      { label: ' Change Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createRemoteUrlWindow() : null } }
    ] },
    { type: 'separator' },
    store.get('preferTray') ? { label: ' Show / Hide ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } } : { label: ' Minimize / Restore ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isMinimized() ? mainWindow.restore() : mainWindow.minimize() } },
    { type: 'separator' },
    { label: ' Quit ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.close() ;app.quit() } }
  ]);
  const contextMenuMac = Menu.buildFromTemplate([
    store.get('preferTray') ? { label: ' Show / Hide ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } } : { label: ' Minimize / Restore ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.isMinimized() ? mainWindow.restore() : mainWindow.minimize() } },
    { type: 'separator' },
    { label: ' Connect to: ', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: ' Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('localUrl')) } },
      { label: ' Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.loadURL(store.get('remoteUrl')) } }
    ]},
    { type: 'separator' },
    { label: ' Settings', icon: __dirname + '/assets/iconSmall.png', submenu: [
      { label: 'About ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createAboutWindow() : null } },
      { type: 'separator' },
      { label: ' Start Options', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createOptionsWindow() : null } },
      { label: ' Change Local URL', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createLocalUrlWindow() : null } },
      { label: ' Change Remote URL', icon: __dirname + '/assets/iconSmall.png', click: () => { (localUrlWindow == null && remoteUrlWindow == null && optionsWindow == null && aboutWindow == null) ? createRemoteUrlWindow() : null } }
    ] },
    { type: 'separator' },
    { label: ' Quit ' + app.name, icon: __dirname + '/assets/iconSmall.png', click: () => { mainWindow.close(); app.quit() } }
  ]);
  mainWindow.loadURL(store.get('preferRemote') ? store.get('remoteUrl') : store.get('localUrl'));
  mainWindow.setTouchBar(touchBar);
  mainWindow.webContents.on('did-finish-load', function() {
      store.get('startHidden') ? (store.get('preferTray') ? mainWindow.hide() : mainWindow.minimize() ) : mainWindow.show();
      store.get('preferMaximized') ? mainWindow.maximize() : null;
  });
  tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => {
    if(store.get('preferTray')){
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    } else {
      mainWindow.isMinimized() ? mainWindow.restore() : mainWindow.minimize();
    }
  });
  tray.on('right-click', () => {
    tray.popUpContextMenu((isMac) ? contextMenuMac : contextMenuWin)
  });
  mainWindow.on('minimize', () => {
    store.get('preferTray') ? mainWindow.hide() : mainWindow.minimize();
  })
  mainWindow.on('close', (e) => {
    if(store.get('preferTray') && mainWindow.isVisible()) {
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
  localUrlWindow.loadFile('localUrl.html');
  localUrlWindow.webContents.on('did-finish-load', function() {
    localUrlWindow.show();
    localUrlWindow.webContents.send('local:url:get', store.get('localUrl'));
    localUrlWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
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
  remoteUrlWindow.loadFile('remoteUrl.html');
  remoteUrlWindow.webContents.on('did-finish-load', function() {
    remoteUrlWindow.show();
    remoteUrlWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    remoteUrlWindow.webContents.send('remote:url:get', store.get('remoteUrl'));
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
  aboutWindow.loadFile('aboutWindow.html');
  aboutWindow.webContents.on('did-finish-load', function() {
    aboutWindow.show();
    aboutWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    aboutWindow.webContents.send('about:version', app.getVersion());
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
  optionsWindow.loadFile('startOptions.html');
  optionsWindow.webContents.on('did-finish-load', function() {
    optionsWindow.show();
    optionsWindow.webContents.send('app:is:mac:dark', (isMac && nativeTheme.shouldUseDarkColors));
    optionsWindow.webContents.send('app:settings:startMaximized', store.get('preferMaximized'));
    optionsWindow.webContents.send('app:settings:startRemote', store.get('preferRemote'));
    optionsWindow.webContents.send('app:settings:hideTray', store.get('preferTray'));
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

ipcMain.on('app:settings:hideTray:false', () => {
  store.set('preferTray', false);
});

ipcMain.on('app:settings:hideTray:true', () => {
  store.set('preferTray', true);
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