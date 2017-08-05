const {remote,ipcRenderer} = require('electron')
const {Menu, MenuItem, shell} = remote
const fs = require('fs');
const tmdb = require('./my_modules/tmdb');
var Datastore = require('nedb');

let db = new Datastore({ filename: `${__dirname}/myDb` });
let dir = 'D:/movies';

let ctr;
let ext = ['.mpg','.mpeg','.mkv','.mp4','.avi','.flv', '.mov','wmv','.vob'];

const baseApiUrl='https://api.themoviedb.org/3/';
const imageApiUrl = 'http://image.tmdb.org/t/p/';

db.loadDatabase(function (err) {    // Callback is optional1
  if(err) console.log(err.message);
  else console.log('Connected to database');
});

let app = new Vue({
  el: '#app',
  data: {
    movies: [],
    movieData:{title:'',cast:[]},
    input:''
  },
  methods: {
    fetchData: function (movie, index) {
      let vm = this;
      vm.index = index;
      console.log(movie.id);
      if (movie.id) {
        vm.movieData = movie;
      } else {
        tmdb.searchMovie(movie)
        .then(function (response) {
          console.log(response);
          if(response.data.results.length) {
            let data = response.data.results[0];
            data.poster_path = imageApiUrl+'w500'+data.poster_path;
            data.backdrop_path = imageApiUrl+'w500'+data.backdrop_path;
            db.update({_id:movie._id},{ $set: data },{returnUpdatedDocs:true},updateDoc.bind(vm))
          } else {
            alert("no match found!");
            vm.movieData = movie;
          }
        })
        .catch(function (error) {
          alert(error);
          vm.movieData = movie;
        });
      }
    },
    find: function(input) {
      db.loadDatabase(function (err) {    // Callback is optional1
        if(err) console.log(err.message);
        else console.log('Connected to database');
      });
      let vm = this;
      let regex = new RegExp(`${input}`,'i');
      db.find({$or:[{title:regex},{'cast.name':regex}]}).sort({date_added:-1}).exec(function(err, docs) {
        console.log(docs);
        vm.movies = docs
      });
    },
    getYear: (movie) => movie.release_date ? movie.release_date.slice(0,4):'',
    getMovieGenres: (movie) => movie.genres ? movie.genres.map(function(value) {
        return value.name;
    }).join(', '):'',

    getDirectors: (movie) => movie.directors ? movie.directors.map(function(value) {
        return value.name;
    }).join(','):'',

    getCast: (movie) => movie.cast ? movie.cast.slice(0,3).map(function(value) {
      return value.name;
    }).join(', '):'',

    showContextMenu: (movie,index,e) => {
      const menu = new Menu()
      menu.append(new MenuItem({label: 'Edit', data:movie, click(item) { 
        console.log(item);
        ipcRenderer.send('showEditMovie',movie, index);
      }}))
      e.preventDefault();
      menu.popup(remote.getCurrentWindow());
    },
    play:(movie) => {
      shell.openItem(movie.path);
    }
  },

  created: function() {
    // `this` points to the vm instance
    let vm = this;
    db.find({}).sort({date_added:-1}).exec(function(err, data) {
      if(data[0]) {
        vm.movies = data;
        vm.movieData = data[0];
      }
    /*db.find({}, function(err, data) {
      vm.movies = data;
      vm.movieData = data[0];
      vm.movieData.src = `${imageApiUrl}w500${data[0].backdrop_path}`;
    });*/
    });
  }
})

function updateDoc(err,numReplaced,doc) {
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
          console.log(val);
          return val;
        }),
        directors:getDirectors(response.credits.crew)
      }
      db.update({_id:vm.movies[vm.index]._id},{ $set: data },{returnUpdatedDocs: true},addMoreInfo.bind(vm))
    })
    .catch(function (error) {
      console.log(error);
    });
}

function addMoreInfo(err, numReplaced, doc) {
    if(err) console.log(err)
    else {
      this.movieData = doc;
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

ipcRenderer.on('readDir', (event, dir) => {
  readDir(dir)  
})

ipcRenderer.on('readFiles', (event, files) => {
  files.forEach(function(path) {
    let filename = path.slice(path.lastIndexOf('/')+1,path.length);
    let ind = filename.lastIndexOf('.');
    if(ind > 0) {
        let ex = filename.slice(ind,filename.length);
        filename = filename.slice(0,ind);
        if(ext.indexOf(ex)>0) {
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
  })
})

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
                //console.log(newDoc);
                app.movies.unshift(newDoc);
            });
            console.log('File', path, 'has been added');
          }
        }
      });
    }
  })
}
