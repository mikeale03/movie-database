const fs = require('fs');
function rDir(dir) {
  return new Promise(function(resolve,reject) {
    fs.readdir(dir, function(err, data) {
      if(err) 
        reject(err);
      else
        resolve(data);
    });
  });
}

module.exports = function readDir(dir,ext, cb) {
    function getFiles(dir) {
        rDir(dir).then(function(data) {
            data.forEach(function(v) {
                fs.stat(dir+'/'+v, function(err,stats) {
                    if(err) cb(err);
                    else if(stats.isDirectory()) {
                        getFiles(dir+'/'+v);
                    } else {
                        let ind = v.lastIndexOf('.');
                        if(ind > 0) {
                            let ex = v.slice(ind,v.length);
                            v = v.slice(0,ind);
                            if(ext.indexOf(ex)>0) {
                                cb(null,dir+'/'+v+ex,v,ex);
                            }
                        }
                    }
                })
            })
        }).catch(function(err) {
            console.log(err.message);
            cb(err);
        })
    }
    getFiles(dir);
}
