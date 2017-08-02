const axios = require('axios')

module.exports = {
    apiKey : 'e0cd722a80d8420b6c9ce28e0a86ac8f',
    baseApiUrl:'https://api.themoviedb.org/3/',
    imageApiUrl : 'http://image.tmdb.org/t/p/',
    searchMovie(movie) {
        let query = `${this.baseApiUrl}search/movie?api_key=${this.apiKey}&language=en-US&query=${movie.title}&page=1&include_adult=false`
        query += movie.release_date ? `&year=${movie.release_date.slice(0,4)}`:''
        return axios.get(query)
    },
    getMovieDetails(id) {
        let query = `${this.baseApiUrl}movie/${id}}?api_key=${this.apiKey}&language=en-US&append_to_response=credits`
        return axios.get(query)
    }
}

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
      this.movieData.src = `${imageApiUrl}/w500${doc.backdrop_path}`;
      console.log(doc);
    }
}
  