const {remote,ipcRenderer} = require('electron')
const {Menu, MenuItem, shell} = remote
const fs = require('fs');
const tmdb = require('./my_modules/tmdb');
const omdb = require('./my_modules/omdb');

//var Datastore = require('nedb');
let dir = __dirname.replace(/\\/g, "/");
let database = require('./my_modules/database');
let db = new database(`${__dirname}/database/myDb`).db;

/*fs.writeFile('server.dat', `${dir}/database/myDb`, function (err) {
  if (err) throw err;
  console.log('server.dat was made!');
});*/

let app = new Vue({
  el: '#app',
  data: {
    movies: [],
    movieData:{title:'',cast:[]},
    input:'',
    type:'all',
    show:false,
    movieIndex:null
  },
  methods: {
    fetchData: function (movie, index) {
      let vm = this;
      vm.movieIndex = index;
      console.log(movie);

      if (movie.isFetch) {
        vm.movieData = Object.assign({},movie);
        console.log(movie);
      } else {

        let selectedMovie = vm.movies[index];
        tmdb.searchMovie(movie)
        .then(function (response) {
          console.log(response);
          if(response.data.results.length) {
            let data = response.data.results[0];
            data.isFetch = true;
            data.poster_path = tmdb.imageApiUrl+'w500'+data.poster_path;
            data.backdrop_path = tmdb.imageApiUrl+'w500'+data.backdrop_path;

            const download = require('image-downloader')
            //const download2 = require('image-downloader')

            let ind = movie.path.lastIndexOf('/');
            let moviePath = movie.path.slice(0,ind);
            
            let image1 = {
              url: data.poster_path, 
              dest: moviePath+'/'+movie.title+data.id+'-poster.jpg'        
            }

            let image2 = {
              url:  data.backdrop_path, 
              dest: moviePath+'/'+movie.title+data.id+'-backdrop.jpg'       
            }
            
            download.image(image1)
              .then(({ filename, image }) => {
                db.update({_id:movie._id},{ $set: {poster_path:filename} },{returnUpdatedDocs: true},function(err, numReplaced, doc) {
                  if(err) alert(err);
                  else
                    selectedMovie = Object.assign({},selectedMovie,{poster_path:filename});
                    console.log(selectedMovie);
                });
                console.log('File saved to', filename)
                return download.image(image2)
              })
              .then(({ filename, image }) => {
                db.update({_id:movie._id},{ $set: {backdrop_path:filename}}, {returnUpdatedDocs: true},function(err, numReplaced, doc) {
                  if(err) alert(err);
                  else
                    //vm.movieData = Object.assign({}, vm.movieData, doc);
                    
                    //selectedMovie = Object.assign({},selectedMovie,{backdrop_path:filename});
                    vm.movies.splice(index,1,Object.assign({},selectedMovie,{backdrop_path:filename}));
                    console.log(selectedMovie);
                });
                console.log('File saved to', filename)
              })
              .catch((err) => {
                throw err
            })
            
            data.year = parseInt(data.release_date.slice(0,4));
            vm.movieData = Object.assign({}, movie, data);
            selectedMovie = Object.assign({},vm.movieData);
            return tmdb.getMovieDetails(data.id);
            //db.update({_id:movie._id},{ $set: data },{returnUpdatedDocs:true},updateDoc.bind(vm))
          } else {

            alert("no match found!");
            movie.isFetch = true;
            vm.movieData = movie;
            vm.movies.splice(index,1,movie);
            db.update({_id:movie._id},movie);
          }
        })

        .then( (response) => {
          //console.log(response);
          if(response) {
            response = response.data;
            let data = {
              genres:response.genres.map( value => value.name ),
              imdb_id:response.imdb_id,
              languages: response.spoken_languages.map( value => value.name ),
              runtime : require('./my_modules/time').minToHourFormat(response.runtime),
              cast:getCast(response.credits.cast,15).map(function(val) {
                val.profile_path = val.profile_path ? tmdb.imageApiUrl+'w92'+val.profile_path:'images/noImage.png';
                return val;
              }),
              directors:getDirectors(response.credits.crew)
            }
            selectedMovie = Object.assign({},selectedMovie,data);
            //vm.movies[index] = Object.assign({},vm.movieData,data);
            vm.movieData = Object.assign({},selectedMovie,data);
            //delete selectedMovie._id;
            db.update({_id:movie._id}, selectedMovie, {returnUpdatedDocs: true},addMoreInfo.bind(vm))
            return omdb.searchMovieId(data.imdb_id);
          }
        })
        .then((response) => {
          if(response) {
            let data = {imdbRating:response.data.imdbRating}
            vm.movieData = Object.assign({},selectedMovie,data);
            db.update({_id:movie._id},{ $set: data }, {returnUpdatedDocs: true},function(err, numReplaced, doc) {
              console.log(numReplaced);
              if(err) alert(err);
              else
                vm.movies.splice(index,1,doc); 
            });
          }
        }) 
        .catch(function (error) {
          vm.movieData = Object.assign({},movie);
          alert(`Api Error: ${error.message}`);

        })
      }
    },
    find: function(input,type,skip,limit) {
      let vm = this;
      let Search = require('./my_modules/search');
      let searcher = new Search(db);
      searcher.search(input,type,skip,limit).exec((err,docs) => {
        if(err) alert(err);
        else {
          vm.movies = docs;
          console.log(docs);
          vm.movieData = vm.movies[0]||vm.movieData;
        }
      })
    },

    debounceFind: require('./my_modules/debounce') ( function() {
      this.find(this.input,this.type);
      console.log(this.type);
    },500),

    displayTitle: (movie) =>  movie.year ? movie.title +" ("+movie.year+")" :movie.title,
    displayYear: (movie) => movie.year ? "("+movie.year+")" :'',
    getGenres: (movie) => movie.genres ? movie.genres.map(function(value) {
        return value.name;
    }).join(', '):'',

    getDirector: (movie) => movie.directors ? movie.directors.map(function(value) {
        return value.name;
    }).join(', '):'',

    getCast: (movie) => movie.cast ? movie.cast.slice(0,3).map(function(value) {
      return value.name;
    }).join(', '):'',

    imageError: function(event) {
      console.log(event);
      event.srcElement.src = "images/noImage.png";
    },
    getLanguages: (movie) => movie.languages ? movie.languages.join(', ').split(' '):[],

    showContextMenu: function(movie,index,e) {
      let vm = this;
      const menu = new Menu()
      menu.append(new MenuItem({label: 'Edit', click(item) { 
        console.log(movie);
        ipcRenderer.send('showEditMovie',movie, index);
      }}))
      menu.append(new MenuItem({label: 'Delete', click() {
        db.remove({_id:movie._id},{}, function(err, numRemoved) {
          console.log("data removed: "+numRemoved);
          vm.movies.splice(index,1);
        });
      }}))
      menu.append(new MenuItem({label: 'Show in directory', click() {
        shell.showItemInFolder('file:'+movie.path);
      }}))
      e.preventDefault();
      menu.popup(remote.getCurrentWindow());
    },
    play:(movie) => {
      console.log(movie.path);
      //shell.openItem('file:'+movie.path) || alert('File error!');
      const { exec } = require('child_process');
      exec('cd release & WindowsFormsApp1.exe "'+movie.path+'"', (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
      });
      
    }
  },

  created: function() {
    // `this` points to the vm instance
    let vm = this;
    
    db.find({}).sort({release_date:-1}).exec(function(err, data) {
      if(data[0]) {
        vm.movies = data;
        vm.movieData = data[0];
        vm.movieIndex = 0;
      }
    /*db.find({}, function(err, data) {
      vm.movies = data;
      vm.movieData = data[0];
      vm.movieData.src = `${imageApiUrl}w500${data[0].backdrop_path}`;
    });*/
    });
  },
  mounted: function() {
    this.show = true;
  }
})

/*function updateDoc(err,numReplaced,doc) {
    let vm = this;
    vm.movieData = doc;
    vm.movies[vm.index] = doc;
    vm.movieData.src = `${imageApiUrl}/w500${doc.backdrop_path}`;
    tmdb.getMovieDetails(doc.id)
    .then(function (response) {
      console.log(response);
      response = response.data;
      
      let data = {
        genres:response.genres,
        imdb_id:response.imdb_id,
        cast:getCast(response.credits.cast,10).map(function(val) {
          val.profile_path = val.profile_path ? imageApiUrl+'w92'+val.profile_path:'images/noImage.png';
          return val;
        }),
        directors:getDirectors(response.credits.crew)
      }
      db.update({_id:vm.movies[vm.index]._id},{ $set: data },{returnUpdatedDocs: true}, function(err, numReplaced, doc) {
        if(err) console.log(err)
        else {
          //this.movieData = doc;
          selectedMovie = doc;
          console.log(doc);
        }
      })
    })
    .catch(function (error) {
      console.log(error);
    });
}*/

function addMoreInfo(err, numReplaced, doc) {
    if(err) console.log(err)
    else {
      //this.movieData = doc;
      this.movies[this.index] = doc;
      console.log(doc);
    }
}

function getCast(cast,limit) {
  return cast.slice(0,limit);
}

function getDirectors(crew) {
  return crew.filter(function(item) {
    return item.job === 'Director';
  })
}

ipcRenderer.on('updateMovie', (event, movie, ind) => {
  Vue.set(app.movies, ind, movie);
  db.update({_id:movie._id},movie,function(err, numReplaced) {
    if(err) console.log(err);
    else console.log(numReplaced);
  });
  console.log(movie);
  console.log(app.movies[ind]);
});

ipcRenderer.on('addLib', (event,dir) => {
  let id = dir.replace(/ /g,"_");
  lib.find({_id:id}, function(err, docs) {
    if(err) {
      console.log(err);
    } else if(docs.length === 0) {
      let data = {
        _id: id,
        path: dir,
        name: dir.slice(dir.lastIndexOf('/')+1,dir.length)
      };
      lib.insert(data, function (err, newDoc)  {  // Callback is optional
        if(err) console.log(err.message);
        else 
          console.log(newDoc);
      });
    }
  })
  readDir(dir);
})

ipcRenderer.on('readDir', (event, dir) => {
  readDir(dir)  
})

ipcRenderer.on('readFiles', (event, files) => {
  let ext = ['.avi','.mp4', '.mkv', '.mpeg', '.wmv', '.mpg', '.flv','.webm']
  let valid = true;
  files.forEach(function(path) {
    if(valid == true && (path.charAt(0) !=='/' || path.charAt(1) !=='/') ) {
      valid = false;
      alert("Add a file in a shared network directory!")
    }
    if(valid) {
      let filename = path.slice(path.lastIndexOf('/')+1,path.length);
      let ind = filename.lastIndexOf('.');
      if(ind > 0) {
          let ex = filename.slice(ind,filename.length);
          filename = filename.slice(0,ind);
          if(ext.indexOf(ex)>(-1)) {
            let id = path.replace(/ /g,"_");
            db.find({_id:id}, function(err, docs) {
              if(err) {
                console.log(err);
              } else if(docs.length === 0) {
                let movie = {
                  _id: id,
                  title: filename,
                  path: path,
                  ext: ex,
                  date_added: new Date().toISOString()
                };
                db.insert(movie, function (err, newDoc) {   // Callback is optional
                  if(err) console.log(err.message);
                  else 
                    //console.log(newDoc);
                    app.movies.unshift(newDoc);
                });
                console.log('File', path, 'has been added');
              }
            });
          }
      }
    }
  })
})

function readDir(dir) {
  if(dir.charAt(0)==='/' && dir.charAt(1)==='/') {
    let readDir = require('./read_dir');
    let ext = ['.avi','.mp4', '.mkv', '.mpeg', '.wmv', '.mpg', '.flv','.webm']
    readDir(dir, ext, function(err,path,filename,ext) {
      if(err) console.log(err);
      else {
        let id = (path.replace(/ /g,"_")).toLowerCase();
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
                  //console.log(newDoc);
                  app.movies.unshift(newDoc);
              });
              console.log('File', path, 'has been added');
            }
          }
        });
      } 
    })
  } else {
    alert("Add a shared network directory!")
  }
}
