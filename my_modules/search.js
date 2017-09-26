module.exports = class Search {
    constructor(db) {
        this.db = db;
    }
    search(input,type,skip,limit) {
        let cursor;
        let regex = new RegExp(`${input}`,'i');
        switch(type) {
            case 'title':
                cursor = db.find({title:regex}).sort({date_added:-1});
                break;
            case 'cast':
                cursor = db.find({'cast.name':regex}).sort({date_added:-1});
                break;
            case 'year':
                cursor = db.find({year:input}).sort({date_added:-1});
                break;
            case 'director': 
                cursor = db.find({'directors.name':regex}).sort({date_added:-1});
                break;
            case 'genre':
                cursor = db.find({genres:regex}).sort({date_added:-1});
                break;
            case 'language':
                cursor = db.find({language:regex}).sort({date_added:-1});
                break;
            default:
                cursor = db.find({$or:[{title:regex},{'cast.name':regex},{year:parseInt(input)},{genres:regex},{languages:regex},{'directors.name':regex}]})
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
    
