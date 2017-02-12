//printjson(db.shows.find().limit(2));

db.shows.drop();

//db.shows_all.find().sort({'fields.rank':1}).limit(50)

db.shows_all.find().sort({'fields.rank':1}).limit(50).forEach(function(doc){
   db.shows.insert(doc);
});

var f = db.shows.findOne();

printjson(f);