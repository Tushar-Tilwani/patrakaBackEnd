var http = require('http'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    path = require('path'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    CollectionDriver = require('./collectionDriver').CollectionDriver,
    _ = require('lodash'),
    moment = require('moment');

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.text());


var mongoHost = 'localHost';
var mongoPort = 27017;
var mongoDb = 'patrakaDB';

// Connection URL
var url = 'mongodb://' + mongoHost + ':' + mongoPort + '/' + mongoDb;


var collectionDriver;

MongoClient.connect(url, function (err, db) {
    assert.equal(null, err);
    console.log('Connected successfully to server');
    collectionDriver = new CollectionDriver(db);
});

app.use('/:token/static', express.static(path.join(__dirname, 'public')));

app.use(cors());

app.use('/:token/*', function (req, res, next) {
    var token = req.params.token;
    var token1 = req.query.token;
    console.log(token1);
    return next();
});

app.get('/:token', function (req, res) {
    res.send('<html><body><h1>Hello World</h1></body></html>');
});

app.get('/:token/:collection', function (req, res) {
    console.log('request');
    collectionDriver.findAll(req.params.collection, function (error, objs) { //C
        if (error) {
            res.send(400, error);
        } else {
            res.set('Content-Type', 'application/json');
            res.status(200).send(objs);
        }
    });
});

app.get('/:token/:collection/:entity', function (req, res) {
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
        collectionDriver.get(collection, entity, function (error, objs) { //J
            if (error) {
                res.send(400, error);
            } else {
                res.send(200, objs);
            }
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.post('/:token/showrel', function (req, res) {
    var resData = JSON.parse(req.body);
    var collection = 'showrel';

    /*var obj = {
     showsTimes: <Array<Integer>> Secs,
     price: <Float>,
     startDate: <Date>,'12-25-1995'
     noOfDays: Integer,
     showId:<String>,
     vendorId:<String>,
     ticketAvailable:<Integer>
     };*/


    console.log(resData.showTimes.length);

    var objects = [];

    _.times(_.toInteger(resData.noOfDays), function (i) {
        _.forEach(resData.showTimes, function (minuteOfTheDay) {
            objects.push({
                date: moment(resData.startDate, 'MM-DD-YYYY').add(i, 'd').add(minuteOfTheDay, 'm').unix(),
                price: _.toNumber(resData.price),
                showId: resData.showId,
                vendorId: resData.vendorId,
                ticketAvailable: resData.ticketAvailable
            });
        });
    });

    console.log(resData);


    collectionDriver.batchInsert(collection, objects, function (err, docs) {
        if (err) {
            res.send(400, err);
        } else {
            res.send(201, docs);
        }
    });
});

app.post('/:token/tickets', function (req, res) {
    var object = req.body || {};

    object.showrelId = '584e552b123c0b9a2f1f8b95';
    object.noOfTickets = 3;

    console.log("tickets");

    collectionDriver.updateTickets(object, function (err, docs) {
        if (err) {
            res.send(400, err);
        } else {
            res.send(201, docs);
        }
    });
});


app.post('/:token/:collection', function (req, res) {
    var object = req.body;
    var collection = req.params.collection;
    console.log(collection);
    collectionDriver.save(collection, object, function (err, docs) {
        if (err) {
            res.send(400, err);
        } else {
            res.send(201, docs);
        }
    });
});

app.put('/:token/testPUT', function (req, res) {
    console.log(req.body);
    var f = req.body;
    console.log(f.dates);
    res.send(200, {'value': 'life is awesome in PUT'});
});

app.put('/:token/:collection/:entity', function (req, res) { //A
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
            }
        });
    } else {
        var error = {'message': 'Cannot PUT a whole collection'};
        res.send(400, error);
    }
});

app.delete('/:token/:collection/:entity', function (req, res) {
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    var callback = function (err, obj) {
        if (err) {
            res.send(400, {
                'message': err
            });
        } else {
            if (entity) {
                collectionDriver.delete(collection, entity, function (error, objs) {
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
                    'message': 'Cannot DELETE a whole collection'
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
            console.log('in deleteTicketBusinessRules');
            if (error || !objs) {
                console.log(error);
                callback('error', null);
            } else {
                console.log(JSON.stringify(objs));
                if (objs.date) {
                    console.log('in date');
                    var objDate = new Date(objs.date);
                    var today = new Date();
                    if (objDate.toDateString() == today.toDateString()) {
                        console.log('in correct date');
                        callback(null, objs)
                    } else {
                        console.log('in not today');
                        callback('Not Today', objs)
                    }
                } else {
                    callback('Date Error', objs)
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