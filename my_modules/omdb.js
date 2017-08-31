const axios = require('axios')

module.exports = {
    apiKey : '16adc1ae',
    baseApiUrl:'http://www.omdbapi.com/',
    searchMovie(title, year) {
        let query = `${this.baseApiUrl}?apikey=${this.apiKey}&t=${title}`
        query += year ? `&y=${year}`:''
        return axios.get(query)
    },
    searchMovieId(id) {
        let query = `${this.baseApiUrl}?apikey=${this.apiKey}&i=${id}`
        return axios.get(query)
    },
    searchTv(title, season, ep) {
        let query = `${this.baseApiUrl}?apikey=${this.apiKey}&t=${title}&Season=${season}&Episode=${ep}`
        return axios.get(query)
    }
}