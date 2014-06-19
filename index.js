var app = require("app");
var BrowserWindow = require("browser-window");
var Menu = require("menu");

// Report crashes to our server.
require("crash-reporter").start();

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on("window-all-closed", function() {
    if (process.platform != "darwin") {
        app.quit();
    }
});

app.on("ready", function() {
    mainWindow = new BrowserWindow({width: 800, height: 600});

    mainWindow.loadUrl("file://" + __dirname + "/index.html");

    // Make simple menu
    var menuTemplate = [
        {
            label: "File",
            submenu: [
                {
                    label: "Quit",
                    accelerator: "CmdOrCtrl+q",
                    click: function() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Tools",
            submenu: [
                {
                    label: "Open Developer Tools",
                    accelerator: "F12",
                    click: function() {
                        mainWindow.openDevTools();
                    }
                }
            ]
        }
    ];
    var mainMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on("closed", function() {
        mainWindow = null;
    });
});
