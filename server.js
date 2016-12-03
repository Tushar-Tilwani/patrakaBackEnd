var http = require('http'),
    express = require('express'),
    bodyParser = require('body-parser'),
    path = require('path'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    CollectionDriver = require('./collectionDriver').CollectionDriver;

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


var mongoHost = 'localHost';
var mongoPort = 27017;
var mongoDb = 'patrakaDB';

// Connection URL
var url = 'mongodb://' + mongoHost + ':' + mongoPort + '/' + mongoDb;


var collectionDriver;

MongoClient.connect(url, function (err, db) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    collectionDriver = new CollectionDriver(db);
});

app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.send('<html><body><h1>Hello World</h1></body></html>');
});

app.get('/:collection', function (req, res) {
    console.log("request");
    collectionDriver.findAll(req.params.collection, function (error, objs) { //C
        if (error) {
            res.send(400, error);
        } else {
            res.set('Content-Type', 'application/json');
            res.status(200).send(objs);
        }
    });
});

app.get('/:collection/:entity', function (req, res) {
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
        collectionDriver.get(collection, entity, function (error, objs) { //J
            if (error) {
                res.send(400, error);
            } else {
                res.send(200, objs);
            } //K
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.post('/:collection', function (req, res) { //A
    var object = req.body;
    var collection = req.params.collection;
    console.log(collection);
    collectionDriver.save(collection, object, function (err, docs) {
        if (err) {
            res.send(400, err);
        } else {
            res.send(201, docs);
        } //B
    });
});


app.put('/testPUT', function (req, res) { //A
    console.log(req.body);
    var f = req.body;
    console.log(f.dates);

    res.send(200, {"value": "life is awesome in PUT"});

});

app.put('/:collection/:entity', function (req, res) { //A
    console.log(JSON.stringify(req));
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
        collectionDriver.update(collection, req.body, entity, function (error, objs) { //B
            if (error) {
                res.send(400, error);
            }
            else {
                res.send(200, objs);
            } //C
        });
    } else {
        var error = {"message": "Cannot PUT a whole collection"};
        res.send(400, error);
    }
});

app.delete('/:collection/:entity', function (req, res) { //A
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    var callback = function (err, obj) {
        if (err) {
            res.send(400, {
                "message": err
            });
        } else {
            if (entity) {
                collectionDriver.delete(collection, entity, function (error, objs) { //B
                    if (error) {
                        res.send(400, error);
                    } else {
                        if (parseInt(JSON.stringify(objs))) {
                            res.send(200, obj);
                        } else {
                            res.send(404, JSON.stringify(objs));
                        }
                    }
                });
            } else {
                var error = {
                    "message": "Cannot DELETE a whole collection"
                };
                res.send(400, error);
            }
        }
    };

    deleteTicketBusinessRules(collection, entity, callback);
});


var deleteTicketBusinessRules = function (collection, entity, callback) {
    if (entity) {
        collectionDriver.get(collection, entity, function (error, objs) {
            console.log("in deleteTicketBusinessRules");
            if (error || !objs) {
                console.log(error);
                callback("error", null);
            } else {
                console.log(JSON.stringify(objs));
                if (objs.date) {
                    console.log("in date");
                    var objDate = new Date(objs.date);
                    var today = new Date();
                    if (objDate.toDateString() == today.toDateString()) {
                        console.log("in correct date");
                        callback(null, objs)
                    } else {
                        console.log("in not today");
                        callback("Not Today", objs)
                    }
                } else {
                    callback("Date Error", objs)
                }

            }
        });
    }
};

app.use(function (req, res) {
    res.render('404', {url: req.url});
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});