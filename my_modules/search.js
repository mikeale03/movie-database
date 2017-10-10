module.exports = class Search {
    constructor(db) {
        this.db = db;
    }
    search(input,type,skip,limit) {
        let cursor;
        let regex = new RegExp(`${input}`,'i');
        switch(type) {
            case 'title':
                cursor = db.find({title:regex}).sort({release_date:-1});
                break;
            case 'cast':
                cursor = db.find({'cast.name':regex}).sort({release_date:-1});
                break;
            case 'year':
                cursor = db.find({year:input}).sort({release_date:-1});
                break;
            case 'director': 
                cursor = db.find({'directors.name':regex}).sort({release_date:-1});
                break;
            case 'genre':
                cursor = db.find({genres:regex}).sort({release_date:-1});
                break;
            case 'language':
                cursor = db.find({languages:regex}).sort({release_date:-1});
                break;
            case 'recent-added':
                cursor = db.find({}).sort({date_added:-1});
                break;
            case 'top-rated':
                cursor = db.find({}).sort({imdbRating:-1});
                break;
            default:
                cursor = db.find({$or:[{title:regex},{'cast.name':regex},{year:parseInt(input)},{genres:regex},{languages:regex},{'directors.name':regex}]}).sort({release_date:-1});
        }
        console.log(regex);
        if(skip) cursor.skip(skip);
        if(limit) cursor.limit(limit);
        return cursor;
    }
    searchByYear(year,skip,limit,cb) {
        let cursor = db.find({year:year}).sort({year:-1});
        if(skip) cursor.skip(skip);
        if(limit) cursor.limit(limit);
        cursor.exec(cb);
    }
    searchByCast(cast,skip,limit,cb) {
        let regex = new RegExp(`${cast}`,'i');
        let cursor = db.find({'cast.name':regex}).sort({year:-1});
        if(skip) cursor.skip(skip);
        if(limit) cursor.limit(limit);
        cursor.exec(cb);
    }
    searchByDirector(director,skip,limit,cb) {
        let regex = new RegExp(`${director}`,'i');
        let cursor = db.find({'director.name':regex}).sort({year:-1});
        if(skip) cursor.skip(skip);
        if(limit) cursor.limit(limit);
        cursor.exec(cb);
    }
} 
    
