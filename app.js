const {remote,ipcRenderer} = require('electron')
const {Menu, MenuItem, shell} = remote
const fs = require('fs');
const tmdb = require('./my_modules/tmdb');
const omdb = require('./my_modules/omdb');
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
      console.log(movie);
      if (movie.isFetch) {
        vm.movieData = movie;
        console.log(movie);
      } else {

        /*omdb.searchMovie(movie.Title)
        .then( (res) => {
          if(res.data.Response) {
            console.log(res);
            res.data.isFetch = true;
            vm.movieData = res.data;
            vm.movies[vm.index] = res.data;
            //return tmdb.findImdbId(response.imdbID);
          } else {
            console.log(res);
          }
        })*/
          
        tmdb.searchMovie(movie)
        .then(function (response) {
          console.log(response);
          if(response.data.results.length) {
            let data = response.data.results[0];
            data.isFetch = true;
            data.poster_path = imageApiUrl+'w500'+data.poster_path;
            data.backdrop_path = imageApiUrl+'w500'+data.backdrop_path;
            vm.movieData = Object.assign({},vm.movieData, data);
            vm.movies[index] = vm.movieData;
            return tmdb.getMovieDetails(data.id);
            //db.update({_id:movie._id},{ $set: data },{returnUpdatedDocs:true},updateDoc.bind(vm))
          } else {
            alert("no match found!");
            let data = {isFetch:true};
            vm.movieData = movie;
            vm.movies[index] = Object.assign({},vm.movieData, data);
            db.update({_id:movie._id},{ $set: data })
          }
        })
        .then( (response) => {
          console.log(response);
          response = response.data;
          let data = {
            genres:response.genres,
            imdb_id:response.imdb_id,
            languages: response.spoken_languages.map( value => value.name ),
            runtime : require('./my_modules/time').minToHourFormat(response.runtime),
            cast:getCast(response.credits.cast,15).map(function(val) {
              val.profile_path = val.profile_path ? imageApiUrl+'w92'+val.profile_path:'images/noImage.png';
              return val;
            }),
            directors:getDirectors(response.credits.crew)
          }
          let newData = Object.assign({},vm.movieData,data);
          vm.movieData = Object.assign({},newData,data);
          vm.movies[index] = vm.movieData;
          delete newData._id;
          db.update({_id:movie._id}, newData, {returnUpdatedDocs: true},addMoreInfo.bind(vm))
          return omdb.searchMovieId(data.imdb_id);
    
        })
        .then((response) => {
          let data = {imdbRating:response.data.imdbRating}
          vm.movieData = Object.assign({},vm.movieData,data);
          vm.movies[index] = vm.movieData;
          db.update({_id:movie._id},{ $set: data });
        }) 
        .catch(function (error) {
          console.log(error);          
        })
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
    getGenres: (movie) => movie.genres ? movie.genres.map(function(value) {
        return value.name;
    }).join(', '):'',

    getDirector: (movie) => movie.directors ? movie.directors.map(function(value) {
        return value.name;
    }).join(','):'',

    getCast: (movie) => movie.cast ? movie.cast.slice(0,3).map(function(value) {
      return value.name;
    }).join(', '):'',

    getLanguages: (movie) => movie.languages ? movie.languages.join(', '):'',

    showContextMenu: function(movie,index,e) {
      let vm = this;
      const menu = new Menu()
      menu.append(new MenuItem({label: 'Edit', click(item) { 
        console.log(item);
        ipcRenderer.send('showEditMovie',movie, index);
      }}))
      menu.append(new MenuItem({label: 'Delete', click() {
        vm.movies.splice(index,1);
      }}))
      menu.append(new MenuItem({label: 'Show in directory', click() {
        shell.showItemInFolder(movie.path);
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
      //this.movieData = doc;
      //this.movies[this.index] = doc;
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
