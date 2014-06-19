var fs = require('fs');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var sp = require('serialport');
var compile = require('./compile');
var uploader = require('./uploader');
var websocket = require('nodejs-websocket');

var settings = require('./settings.js');
var sketches = require('./sketches.js');
var serial = require('./serial.js');
var platform = require('./platform');

//load up standard boards
var BOARDS = require('./boards').loadBoards();
var LIBS   = require('./libraries').loadLibraries();
//standard options
var OPTIONS = {
    userlibs: settings.userlibs,
    name: 'Blink',
}

console.log('settings',settings);
console.log("options",OPTIONS);

var wslist = [];
function publishEvent(evt) {
    wslist.forEach(function(conn) {
        console.log('sending event',evt);
        conn.sendText(JSON.stringify(evt));
    });
}


var app = express();
//parse post bodies
app.use(multer({dest:'./uploads'}));

//public is the dir for static files
app.use(express.static(__dirname+'/public'));

app.get('/ports',function(req,res) {
    sp.list(function(err,list) {
        res.send(JSON.stringify(list));
        res.end();
    });
});

app.get('/boards',function(req,res) {
    res.send(JSON.stringify(BOARDS));
    res.end();
})

function makeCleanDir(outpath) {
    if(fs.existsSync(outpath)) {
        fs.readdirSync(outpath).forEach(function(file) {
            fs.unlinkSync(outpath+'/'+file);
        })
        fs.rmdirSync(outpath);
    }
    fs.mkdirSync(outpath);
    return outpath;
}

function doCompile(code,board,sketch) {
    //create output dir
    if(!fs.existsSync('build')) {
        fs.mkdirSync('build');
    }
    var outpath = makeCleanDir('build/out');
    var sketchpath = makeCleanDir("build/tmp");
    fs.writeFileSync(sketchpath+'/Blink.ino',code);

    publishEvent({ type:'compile', message:'writing to ' + sketchpath+'/Blink.ino'});

    var foundBoard = null;
    BOARDS.forEach(function(bd) {
        if(bd.id == board) foundBoard = bd;
    })
    OPTIONS.device = foundBoard;
    OPTIONS.platform = platform.getDefaultPlatform();
    compile.compile(sketchpath,outpath,OPTIONS, publishEvent,settings.usersketches+'/'+sketch);
}

app.post('/compile',function(req,res) {
    console.log("code = ",req.body.code);
    if(!req.body.board) {
        res.send(JSON.stringify({status:'missing board name'}));
        res.end();
        return;
    }
    try {
        doCompile(req.body.code,req.body.board,req.body.sketch);
        res.send(JSON.stringify({status:'okay'}));
        res.end();

    } catch(e) {
        console.log("compliation error",e);
        console.log(e.output);
        res.send(JSON.stringify({status:'error',output:e.output}));
        res.end();
    }
});

app.post('/run',function(req,res) {
    console.log("body = ",req.body.code);
    if(!req.body.board) {
        res.send(JSON.stringify({status:'missing board name'}));
        res.end();
        return;
    }
    if(!req.body.port) {
        res.send(JSON.stringify({status:'missing port name'}));
        res.end();
        return;
    }

    doCompile(req.body.code,req.body.board,req.body.sketch);
    uploader.upload('build/out/Blink.hex',req.body.port,OPTIONS);
    res.send(JSON.stringify({status:'okay'}));
    res.end();
});

app.post('/new',function(req,res) {
    console.log(req.body.name);
    if(!req.body.name) {
        res.send(JSON.stringify({status:'missing sketch name'}));
        res.end();
        return;
    }
    try {
        var sketch = req.body.name;
        sketches.makeNewSketch(sketch, function(name,content) {
            res.send(JSON.stringify({status:'okay',content:content, name:sketch}));
            res.end();
        });
    } catch(err) {
        console.log(err);
        err.printStackTrace();
        res.end(JSON.stringify({status:'error',output:err.toString()}));
    }
});

app.post('/sketches/delete', function(req,res){
    console.log(req.body.name);
    if(!req.body.name) {
        res.send(JSON.stringify({status:'missing sketch name'}));
        res.end();
        return;
    }

    try {
        sketches.deleteSketch(req.body.name,function(name) {
            res.send(JSON.stringify({status:'okay', name:name}));
            res.end();
        });
    } catch (err) {
        console.log(err);
        res.end(JSON.stringify({status:'error',output:err.toString()}));
    }
});

app.get('/sketches',function(req,res) {
    sketches.listSketches(function(list) {
        res.send(JSON.stringify(list));
        res.end();
    });
});

app.post('/save',function(req,res) {
    sketches.saveSketch(req.body.name,req.body.code,function(results) {
        res.send(JSON.stringify({status:'okay', name:req.body.name}));
        res.end();
    });
});

app.get('/sketch/:name',function(req,res) {
    sketches.getSketch(req.params.name, function(sketch) {
        res.send(sketch);
        res.end();
    });
});

app.get('/search',function(req,res){
    LIBS.search(req.query.query,function(results) {
        res.send(results);
        res.end();
    })
})

function serialOutput(data) {
    var msg = {
        type:'serial',
        data:data.toString(),
    };
    wslist.forEach(function(conn) {
        conn.sendText(JSON.stringify(msg));
    });
}

app.post('/serial/open', function(req,res) {
    if(!req.body.port) {
        res.send(JSON.stringify({status:'error', message:'missing serial port'}));
        res.end();
        return;
    }
    serial.open(req.body.port,serialOutput);
    res.end(JSON.stringify({status:'okay',message:'opened'}));
});

app.post('/serial/close', function(req,res) {
    if(!req.body.port) {
        res.send(JSON.stringify({status:'error', message:'missing serial port'}));
        res.end();
        return;
    }
    serial.close(req.body.port);
    res.end(JSON.stringify({status:'okay',message:'closed'}));
});

var server = app.listen(54329,function() {
    console.log('open your browser to http://localhost:'+server.address().port+'/');
});


var wss = websocket.createServer(function(conn) {
    console.log('web socket connected');
    wslist.push(conn);
    conn.on('message',function(message) {
        console.log("got a request");
    });
    conn.on('error',function(err){
        console.log('websocket got an error',err);
    });
    conn.on('close',function(code,reason) {
        console.log("websocket closed",code,reason);
    });
}).listen(4203);
