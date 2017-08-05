const {app, BrowserWindow, Menu, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let editWin

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

if (shouldQuit) {
  app.quit()
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})
  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  win.webContents.openDevTools()
  win.setAutoHideMenuBar(true) 
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  editWin = new BrowserWindow({width: 800, height: 600,show: false, parent: win})
  // and load the index.html of the app.
  editWin.loadURL(url.format({
    pathname: path.join(__dirname, 'edit_movie.html'),
    protocol: 'file:',
    slashes: true
  }))

  editWin.onbeforeunload = function(e) {
    console.log("hide");
    return false;
  }
  editWin.on('close', (e) => {

      /* the user only tried to close the window */
      console.log("hide");
      e.preventDefault();
      editWin.hide();
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

let ctr = 0;
var Datastore = require('nedb');
let db = new Datastore({ filename: `${__dirname}/myDb` });
const ext = ['.mpg','.mpeg','.mkv','.mp4','.avi','.flv', '.mov','wmv','.vob'];


db.loadDatabase(function (err) {    // Callback is optional1
  if(err) console.log(err.message);
  else console.log('Connected to database');
});

function StartWatcher(path){
      var chokidar = require("chokidar");

      var watcher = chokidar.watch(path, {
          ignored: /[\/\\]\./,
          persistent: true
      });

      function onWatcherReady(){
          console.info('From here can you check for real changes, the initial scan has been completed.');
          console.log(ctr);
      }
            
      // Declare the listeners of the watcher
      watcher
      .on('add', function(path) {
        let id = path.replace(/ /g,"_");
        db.find({_id:id}, function(err, docs) {
            if(err) {
              console.log(err);
            } else {
              if(docs.length === 0) {
                let p = path.split('');
                let i = p.lastIndexOf('.');
                let ex = p.splice(i,p.length).join('');
                i = p.lastIndexOf('\\');
                let filename = p.splice(i+1,p.length).join('');
                let movie = {
                  _id: id,
                  title: filename,
                  path: path,
                  ext: ex,
                  dateAdded: new Date().toISOString()
                };
                db.insert(movie, function (err, newDoc) {   // Callback is optional
                  if(err) console.log(err.message);
                  else console.log(newDoc);
                });
                console.log('File', path, 'has been added');
                ctr++;
              }
            }
        });
      })

      .on('addDir', function(path) {
            console.log('Directory', path, 'has been added');
      })
      .on('change', function(path) {
           console.log('File', path, 'has been changed');
      })
      .on('unlink', function(path) {
           console.log('File', path, 'has been removed');
      })
      .on('unlinkDir', function(path) {
           console.log('Directory', path, 'has been removed');
      })
      .on('error', function(error) {
           console.log('Error happened', error);
      })
      .on('ready', onWatcherReady)
      .on('raw', function(event, path, details) {
           // This event should be triggered everytime something happens.
           console.log('Raw event info:', event, path, details);
      });
}

//StartWatcher('D:/movies/new');

function readDir(dir) {
  let readDir = require('./read_dir');
  readDir(dir, ext, function(err,path,filename,ext) {
    if(err) console.log(err);
    else {
      let id = path.replace(/ /g,"_");
      db.find({_id:id}, function(err, docs) {
        if(err) {
          console.log(err);
        } else {
          if(docs.length === 0) {
            let movie = {
              _id: id,
              title: filename,
              path: path,
              ext: ext,
              date_added: new Date().toISOString()
            };
            db.insert(movie, function (err, newDoc) {   // Callback is optional
              if(err) console.log(err.message);
              else 
                console.log(newDoc);
            });
            console.log('File', path, 'has been added');
          }
        }
      });
    }
  })
}
//readDir('D:/movies');


const template = [
   {
      label: 'File',
      submenu: [
         {
            label: 'Add File',
            click: function() {
              const {dialog} = require('electron')
              let files = dialog.showOpenDialog({properties: ['openFile','multiSelections']})
              if(files) {
                files = files.map(function(val) {
                    return val.replace(/\\/g,'/')
                })
              }
              win.webContents.send('readFiles', files)
            }
         },
         {
            label: 'Add Directory',
             click: function() {
              const {dialog} = require('electron')
              let dir = dialog.showOpenDialog({properties: ['openDirectory']})
              if(dir) {
                dir = dir[0].replace(/\\/g,'/')
                win.webContents.send('readDir', dir)              
              }
            }
         }
      ]
   }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

//exports.editData = function()
ipcMain.on('showEditMovie', function(event,movie,ind) {
  console.log(ind);
  editWin.show();
  editWin.webContents.send('movieData',movie, ind);
});

ipcMain.on('saveEdit', (event, movie, ind) => {
  win.webContents.send('updateMovie', movie, ind);
});