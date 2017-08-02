const {remote,ipcRenderer} = require('electron')
const {Menu, MenuItem} = remote
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
    movieData:{cast:[]},
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
      db.find({$or:[{title:regex},{'cast.name':regex}]}, function(err, docs) {
        console.log(docs);
        vm.movies = docs
      });
    },

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
    }
  },
  created: function () {
    // `this` points to the vm instance
    let vm = this;
    db.find({}, function(err, data) {
      vm.movies = data;
      vm.movieData = data[0];
      vm.movieData.src = `${imageApiUrl}w500${data[0].backdrop_path}`;
    });
  }
});

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
          val.profile_path = imageApiUrl+'w92'+val.profile_path;
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