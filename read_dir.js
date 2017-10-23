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
    //var filesCtr = 0;
    function getFiles(dir) {
        rDir(dir).then(function(data) {
            console.log(data.length);
            //filesCtr += data.length
            data.forEach(function(v) {
                fs.stat(dir+'/'+v, function(err,stats) {
                    //filesCtr--;
                    if(err) cb(err);
                    else if(stats.isDirectory()) {
                        getFiles(dir+'/'+v);
                    } else {
                        let ind = v.lastIndexOf('.');
                        if(ind > 0) {
                            let ex = v.slice(ind,v.length).toLowerCase();

                            v = v.slice(0,ind);
                            if(ext.indexOf(ex)>0) {
                                cb(null,dir+'/'+v+ex,v,ex);
                            }
                        }
                        //if(filesCtr === 0) done();
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
