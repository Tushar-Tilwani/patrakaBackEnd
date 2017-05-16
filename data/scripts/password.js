load(pwd() + '/libs/md5.js');

//print(md5('dd'));

conn = new Mongo();
db = conn.getDB("patrakaDB");

db.users.find().forEach(function (doc) {
    doc.password = 'pass';
    //print(md5(doc.password));
    db.users.save(doc);
});


// db.vendors.find().forEach(function (doc) {
//     doc.blacklist = [];
//     //print(md5(doc.password));
//     db.vendors.save(doc);
// });
