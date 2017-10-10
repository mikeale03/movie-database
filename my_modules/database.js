let Datastore = require('nedb')

module.exports = class DB {
    constructor(path) {
        this.path = path
        this.data = new Datastore({ filename: path})
        this.data.loadDatabase(function (err) {    // Callback is optional1
            if(err) console.log(err.message)
            else console.log('Connected to database')        
        })
    }
    get db() {
        return this.data
    }
    deleteById(id, cb) {
        this.data.remove({ _id: 'id2' }, {}, cb);
    }
}