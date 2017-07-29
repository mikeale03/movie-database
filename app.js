const fs = require('fs');
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

const key = 'e0cd722a80d8420b6c9ce28e0a86ac8f'

let app = new Vue({
  el: '#app',
  data: {
    movies: [],
    movieData:{cast:['ada','asdsa']},
    input:''
  },
  methods: {
    fetchData: function (movie, index) {
      let vm = this;
      vm.index = index;
      console.log(movie.id);
      if (movie.id) {
        vm.movieData = movie;
        vm.movieData.src = `${imageApiUrl}w500${movie.backdrop_path}`;
      } else {
        axios.get(`${baseApiUrl}search/movie?api_key=${key}&language=en-US&query=${movie.title}&page=1&include_adult=false`)
        .then(function (response) {
          console.log(response);
          if(response.data.results.length) {
            let data = response.data.results[0];
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
      db.find({$or:[{title:regex},{'credits.cast.name':regex}]}, function(err, docs) {
      //db.find({title:regex}, function(err, docs) {
        console.log(docs);
        vm.movies = docs
      });
    },

    getPoster: (movie) => movie.poster_path ? imageApiUrl+'w500'+movie.poster_path:'',
    getBackdrop: (movie) => movie.backdrop_path ? imageApiUrl+'w500'+movie.backdrop_path:'',
    getMovieGenres: (movie) => movie.genres ? movie.genres.map(function(value) {
        return value.name;
    }).join(', '):'',
    getDirectors: (movie) => movie.directors ? movie.directors.map(function(value) {
        return value.name;
    }).join(','):'',
    getCast: (movie) => movie.cast ? movie.cast.slice(0,3).map(function(value) {
      return value.name;
    }).join(', '):'',
    getProfPic: (cast) => imageApiUrl+'w92'+cast.profile_path
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
    axios.get(`${baseApiUrl}movie/${doc.id}}?api_key=${key}&language=en-US&append_to_response=credits`)
    .then(function (response) {
      console.log(response);
      response = response.data;
      
      data = {
        genres:response.genres,
        imdb_id:response.imdb_id,
        cast:getCast(response.credits.cast,10),
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
      this.movieData.src = `${imageApiUrl}/w500${doc.backdrop_path}`;
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


const {remote} = require('electron')
const {Menu, MenuItem} = remote

const menu = new Menu()
menu.append(new MenuItem({label: 'MenuItem1', click() { console.log('item 1 clicked') }}))
menu.append(new MenuItem({type: 'separator'}))
menu.append(new MenuItem({label: 'MenuItem2', type: 'checkbox', checked: true}))

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  menu.popup(remote.getCurrentWindow())
}, false)
