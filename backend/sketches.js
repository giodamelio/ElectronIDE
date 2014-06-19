var fs = require('fs');

var settings = require('./settings.js');

exports.makeNewSketch = function(name,cb) {
    var dir = settings.usersketches+'/'+name;
    if(fs.existsSync(dir)) {
        if(cb)cb(null);
        return;
    }
    fs.mkdirSync(dir);
    var example = fs.readFileSync(settings.sketchtemplate).toString();
    fs.writeFileSync(settings.usersketches+'/'+name+'/'+name+'.ino',example);
    if(cb) cb(name,example);
}

exports.deleteSketch = function(name, cb) {
    var dir = settings.usersketches+'/'+name;
    fs.readdirSync(dir).forEach(function(file) {
        console.log("deleting file = ",file);
        fs.unlinkSync(dir+'/'+file);
    });
    fs.rmdirSync(dir);
    if(cb) cb(name);
}

exports.listSketches = function(cb) {
    var list = fs.readdirSync(settings.usersketches);
    list = list.filter(function(file) {
        if(file.toLowerCase() == 'libraries') return false;
        if(file.toLowerCase() == '.ds_store') return false;
        return true;
    });
    if(cb) cb(list);
}

exports.getSketch = function(name, cb) {
    var dir = settings.usersketches + '/' + name;
    var obj = {
        name:name,
        files:[]
    };
    fs.readdirSync(dir).forEach(function(filename) {
        //skip hidden files
        if(filename.indexOf('.')==0) return;
        var file = fs.readFileSync(dir+'/'+filename);
        //console.log("file",filename);
        if(filename.toLowerCase() == 'info.json') {
            console.log("info file");
            obj.info = JSON.parse(file.toString());
            console.log("info = ",obj.info);
            return;
        }
        obj.files.push({
            filename:filename,
            content:file.toString(),
        });
    });
    if(cb) cb(obj);


}

exports.saveSketch = function(name, code, cb) {
    console.log("saving to ",name);
    var dir = settings.usersketches + '/' + name;
    console.log("dir = ",dir);
    var file = dir+'/'+name+'.ino';
    console.log("file = ",file);
    fs.writeFileSync(file,code);
    if(cb)cb();
}
