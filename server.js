var http = require('http'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    path = require('path'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    CollectionDriver = require('./collectionDriver').CollectionDriver,
    _ = require('lodash'),
    moment = require('moment'),
    Utils = require('./utils').Utils,
    ObjectID = require('mongodb').ObjectID;

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
//app.use(bodyParser.raw());
//app.use(bodyParser.text());


var mongoHost = 'localHost';
var mongoPort = 27017;
var mongoDb = 'patrakaDB';

// Connection URL
var url = 'mongodb://' + mongoHost + ':' + mongoPort + '/' + mongoDb;

var collectionDriver;
var sockets = {};

MongoClient.connect(url, function (err, db) {
    assert.equal(null, err);
    console.log('Connected successfully to server');
    collectionDriver = new CollectionDriver(db);
});

app.use('/static', express.static(path.join(__dirname, 'public')));

app.use(cors());

app.use('/*', function (req, res, next) {
    var token = req.query.token;
    //console.log(token);
    return next();
});

app.get('', function (req, res) {
    res.send('<html><body><h1>Hello World</h1></body></html>');
});

app.get('/movies/filter/:pattern/field/:field/order/:order/pageSize/:pageSize', function (req, res) {
    var params = req.params;
    var pageSize = _.toInteger(params.pageSize) || 10;
    var order = params.order === 'asc' ? 1 : -1;
    var field = params.field;
    var pattern = params.pattern;
    collectionDriver.getSortedMovies(pattern, field, order, pageSize, function (error, objs) { //J
        if (error) {
            res.send(400, error);
        } else {
            res.send(200, objs);
        }
    });
});

app.get('/movies/filter/:pattern', function (req, res) {
    var pattern = req.params.pattern;
    if (pattern) {
        collectionDriver.getMoviesByPattern(pattern, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/vendors/:vendorId/movies', function (req, res) {
    var vendorId = req.params.vendorId;
    console.log(vendorId);
    if (vendorId) {
        collectionDriver.getMoviesByVendor(vendorId, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/vendors/:vendorId/shows', function (req, res) {
    var vendorId = req.params.vendorId;
    if (vendorId) {
        collectionDriver.getShowsByVendor(vendorId, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/vendors/:vendorId/movies/:movieId/shows', function (req, res) {
    var vendorId = req.params.vendorId;
    var movieId = req.params.movieId;
    if (vendorId) {
        collectionDriver.getShowsByVendorAndMovie(vendorId, movieId, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/movies/:movieId/vendors', function (req, res) {
    var movieId = req.params.movieId;
    if (movieId) {
        collectionDriver.getVendorsByMovie(movieId, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/tickets/:ticketId', function (req, res) {
    var ticketId = req.params.ticketId;
    if (ticketId) {
        collectionDriver.getTicketById(ticketId, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/tickets/user/:userId', function (req, res) {
    var userId = req.params.userId;
    if (userId) {
        collectionDriver.getTicketsByUserId(userId, function (error, objs) {
            if (error) {
                res.send(400, error);
            }
            res.send(200, objs);
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.get('/:collection', function (req, res) {
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
            }
        });
    } else {
        res.send(400, {error: 'bad url', url: req.url});
    }
});

app.post('/shows', function (req, res) {
    var resData = req.body;
    var collection = 'shows';
    var objects = [];

    _.times(_.toInteger(resData.noOfDays) + 1, function (i) {
        _.forEach(resData.showsTimes, function (seconds) {
            objects.push({
                date: moment(resData.startDate, 'LL').add(i, 'd').add(seconds, 's').unix(),
                price: _.toNumber(resData.price),
                movieId: ObjectID(resData.movieId),
                vendorId: ObjectID(resData.vendorId),
                ticketsAvailable: resData.ticketsAvailable,
                theaterNumber: resData.theaterNumber,
                showTime: seconds
            });

        });
    });

    collectionDriver.batchInsert(collection, objects, function (err, docs) {
        if (err) {
            res.send(400, err);
        } else {
            res.send(201, docs);
        }
    });

});

app.post('/tickets', function (req, res) {
    var object = req.body;
    collectionDriver.createTickets(object, function (err, docs) {
        if (err) {
            res.send(400, err);
        } else {
            res.send(201, docs);
        }
    });
});

var currentResponse;
app.post('/useTicket/:ticketId', function (req, res) {
    var ticketId = req.params.ticketId;
    currentResponse = res;
    function sendRes(flag) {
        return flag ? currentResponse.send(201, {flag: true}) : currentResponse.send(400, {message: 'Please see an agent.'});
    }

    collectionDriver.getTicketById(ticketId, function (err, doc) {
        if (err) {
            res.send(400, err);
        } else {
            var socket = sockets[doc.vendorId];
            if (!socket) {
                res.send(400, {message: 'Vendor not present.'});
            } else {
                sockets[doc.vendorId].emit('validate', doc);

            }
        }
    });
});

app.post('/:collection', function (req, res) {
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

app.put('/testPUT', function (req, res) {
    console.log(req.body);
    var f = req.body;
    console.log(f.dates);
    res.send(200, {'value': 'life is awesome in PUT'});
});

app.put('/vendors/:vendorId/movie/:movieId', function (req, res) {
    var movieId = req.params.movieId;
    var vendorId = req.params.vendorId;

    if (movieId && vendorId) {
        collectionDriver.addMovieToVendor(vendorId, movieId, function (error, objs) { //B
            if (error) {
                res.send(400, error);
            }
            else {
                res.send(200, objs);
            }
        });
    } else {
        var error = {'message': 'error'};
        res.send(400, error);
    }
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
            }
        });
    } else {
        var error = {'message': 'Cannot PUT a whole collection'};
        res.send(400, error);
    }
});

app.delete('/:collection/:entity', function (req, res) {
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

app.delete('/vendors/:vendorId/movie/:movieId', function (req, res) {
    var movieId = req.params.movieId;
    var vendorId = req.params.vendorId;

    if (movieId && vendorId) {
        collectionDriver.removeMovieFromVendor(vendorId, movieId, function (error, objs) { //B
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

var server = http.createServer(app);

var io = require('socket.io')(server);

io.on('connection', function (socket) {
    console.log(socket.handshake.query);
    var query = socket.handshake.query;

    sockets[query.id] = socket;
    socket.emit('connId', query.id);

    socket.on('validateTicket', function (data) {
        console.log(data);
        var ticketId = data.ticketId;
        collectionDriver.getTicketById(ticketId, function (err, doc) {
            //console.log(doc);
            if (err) {
                socket.emit('validatedTicketResult', {flag: false, message: 'Invalid Ticket!'});
            } else {
                var vendorSocket = sockets[doc.vendorId];
                console.log(vendorSocket && vendorSocket.connected);
                if (vendorSocket && vendorSocket.connected) {
                    vendorSocket.emit('validateTicket', _.assignIn(doc, data));
                } else {
                    socket.emit('validatedTicketResult', {flag: false, message: 'Vendor not present.'});
                }
            }
        });
    });

    socket.on('validatedTicketResult', function (result) {
        //console.log(result);
        sockets[result.userId].emit('validatedTicketResult', result);
    });

    socket.on('end', function (id) {
        socket.disconnect();
        sockets[id] = null;
    });


});

server.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});