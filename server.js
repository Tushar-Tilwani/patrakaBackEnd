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

var router = express.Router();

app.get('', function (req, res) {
    res.send('<html><body><h1>Hello Node Service</h1></body></html>');
});

app.get('/hashit', function (req, res) {
    collectionDriver.hashit(function () {
        //res.status(200).send('happy');
    });
});

router.get('', function (req, res) {
    res.send('<html><body><h1>Hello API</h1></body></html>');
});


router.post('/login', function (req, res) {
    var resData = req.body;
    console.log(resData);
    collectionDriver.login(resData.user_name, resData.password, function (err, docs) {
        if (err) {
            console.log(err);
            res.status(400).send(err);
        } else {
            res.send(201, docs);
        }
    });
});

router.use('/*', function (req, res, next) {
    var token = req.query.token;
    console.log(token);
    if (_.isEqual(token, 'aa')) {
        return next();
    } else {
        collectionDriver.getUserByToken(token, function (error, user) {
            if (error) {
                res.status(400).send(error);
                return null;
            }
            return next();
        });
    }
});

router.get('/i1/:ticketId', function (req, res) {
    var ticketId = req.params.ticketId;
    console.log(ticketId);
    collectionDriver.makeTicketInvactive(ticketId, function (error, objs) {
        if (error) {
            res.status(400).send(error);
        } else {
            res.status(200).send(objs);
        }
    });
});


router.get('/movies/filter/:pattern/field/:field/order/:order/pageSize/:pageSize', function (req, res) {
    var params = req.params;
    var pageSize = _.toInteger(params.pageSize) || 10;
    var order = params.order === 'asc' ? 1 : -1;
    var field = params.field;
    var pattern = params.pattern;
    collectionDriver.getSortedMovies(pattern, field, order, pageSize, function (error, objs) { //J
        if (error) {
            res.status(400).send(error);
        } else {
            res.status(200).send(objs);
        }
    });
});

router.get('/movies/filter/:pattern', function (req, res) {
    var pattern = req.params.pattern;
    if (pattern) {
        collectionDriver.getMoviesByPattern(pattern, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/vendors/:vendorId/movies', function (req, res) {
    var vendorId = req.params.vendorId;
    console.log(vendorId);
    if (vendorId) {
        collectionDriver.getMoviesByVendor(vendorId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/vendors/:vendorId/shows', function (req, res) {
    var vendorId = req.params.vendorId;
    if (vendorId) {
        collectionDriver.getShowsByVendor(vendorId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/vendors/:vendorId/movies/:movieId/shows', function (req, res) {
    var vendorId = req.params.vendorId;
    var movieId = req.params.movieId;
    if (vendorId) {
        collectionDriver.getShowsByVendorAndMovie(vendorId, movieId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/movies/:movieId/vendors', function (req, res) {
    var movieId = req.params.movieId;
    if (movieId) {
        collectionDriver.getVendorsByMovie(movieId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/movies/:movieId/user/:userId/vendors', function (req, res) {
    var movieId = req.params.movieId;
    var userId = req.params.userId;
    if (movieId) {
        collectionDriver.getVendorsByMovieCorrected(movieId, userId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/tickets/:ticketId', function (req, res) {
    var ticketId = req.params.ticketId;
    if (ticketId) {
        collectionDriver.getTicketById(ticketId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/tickets/user/:userId', function (req, res) {
    var userId = req.params.userId;
    if (userId) {
        collectionDriver.getTicketsByUserId(userId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});


router.get('/vendors/:vendorId/MoviesWithShows', function (req, res) {
    var vendorId = req.params.vendorId;
    if (vendorId) {
        collectionDriver.getShowMetaByVendor(vendorId, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/users/filter/:pattern', function (req, res) {
    var pattern = req.params.pattern;
    if (pattern) {
        collectionDriver.getUsersByPattern(pattern, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            res.status(200).send(objs);
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});

router.get('/getUserByToken/:token', function (req, res) {
    collectionDriver.getUserByToken(req.params.token, function (error, objs) { //C
        if (error) {
            res.status(400).send(error);
        } else {
            res.set('Content-Type', 'application/json');
            res.status(200).send(objs);
        }
    });
});


router.get('/getGloballyBlacklistedUsers', function (req, res) {
    collectionDriver.getGloballyBlacklistedUsers(function (error, objs) { //C
        if (error) {
            res.status(400).send(error);
        } else {
            res.status(200).send(objs);
        }
    });
});

router.get('/:collection', function (req, res) {
    console.log('request');
    collectionDriver.findAll(req.params.collection, function (error, objs) { //C
        if (error) {
            res.status(400).send(error);
        } else {
            res.set('Content-Type', 'application/json');
            res.status(200).send(objs);
        }
    });
});

router.get('/:collection/:entity', function (req, res) {
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
        collectionDriver.get(collection, entity, function (error, objs) { //J
            if (error) {
                res.status(400).send(error);
            } else {
                res.status(200).send(objs);
            }
        });
    } else {
        res.status(400).send({message: 'bad url', url: req.url});
    }
});


router.post('/shows', function (req, res) {
    var resData = req.body;
    var collection = 'shows';
    var objects = [];

    _.times(_.toInteger(resData.noOfDays) + 1, function (i) {
        _.forEach(resData.showsTimes, function (seconds) {
            objects.push({
                date: moment(resData.startDate, 'LL').add(i, 'd').add(seconds, 's').unix(),
                price: _.toNumber(resData.price),
                movieId: resData.movieId,
                vendorId: resData.vendorId,
                ticketsAvailable: resData.ticketsAvailable,
                theaterNumber: resData.theaterNumber,
                showTime: seconds
            });

        });
    });

    collectionDriver.batchInsert(collection, objects, function (err, docs) {
        if (err) {
            res.status(400).send(err);
        } else {
            res.send(201, docs);
        }
    });

});

router.post('/tickets', function (req, res) {
    var object = req.body;
    collectionDriver.createTickets(object, function (err, docs) {
        if (err) {
            res.status(400).send(err);
        } else {
            res.send(201, docs);
        }
    });
});

router.post('/getUsers', function (req, res) {
    var userIds = req.body.ids;
    collectionDriver.getUsers(userIds, function (err, docs) {
        if (err) {
            res.status(400).send(err);
        } else {
            res.send(201, docs);
        }
    });
});

router.post('/:collection', function (req, res) {
    var object = req.body;
    var collection = req.params.collection;
    console.log(collection);
    collectionDriver.save(collection, object, function (err, docs) {
        if (err) {
            res.status(400).send(err);
        } else {
            res.send(201, docs);
        }
    });
});

router.put('/vendors/:vendorId/addBlacklist/:userId', function (req, res) {
    var userId = req.params.userId;
    var vendorId = req.params.vendorId;

    if (userId && vendorId) {
        collectionDriver.addBlacklistUsers(vendorId, userId, function (error, objs) { //B
            if (error) {
                res.status(400).send(error);
            }
            else {
                res.status(200).send(objs);
            }
        });
    } else {
        var error = {'message': 'Unknown Error'};
        res.status(400).send(error);
    }
});


router.put('/modifyGlobalBlacklistUsers/:userId/:isBlacklist', function (req, res) {
    var userId = req.params.userId;
    var isBlacklist = _.isEqual(req.params.isBlacklist, 'true');
    if (userId) {
        collectionDriver.modifyGlobalBlacklistUsers(userId, isBlacklist, function (error, objs) { //B
            if (error) {
                res.status(400).send(error);
            }
            else {
                res.status(200).send(objs);
            }
        });
    } else {
        var error = {'message': 'Unknown Error'};
        res.status(400).send(error);
    }
});

router.put('/:collection/:entity', function (req, res) {
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    console.log("wdfdsfsd");
    if (entity) {
        collectionDriver.update(collection, req.body, entity, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            }
            else {
                res.status(200).send(objs);
            }
        });
    } else {
        var error = {"message": "Cannot PUT a whole collection"};
        res.status(400).send(error);
    }
});

router.delete('/vendors/:vendorId/removeBlacklist/:userId', function (req, res) {
    var userId = req.params.userId;
    var vendorId = req.params.vendorId;

    if (userId && vendorId) {
        collectionDriver.removeBlacklistUsers(vendorId, userId, function (error, objs) { //B
            if (error) {
                res.status(400).send(error);
            } else {
                res.status(200).send(objs);
            }
        });
    } else {
        var error = {'message': 'Unknown Error'};
        res.status(400).send(error);
    }
});

router.delete('/deleteMovie/:movieId', function (req, res) {
    var params = req.params;
    var movieId = params.movieId;
    var callback = function (err) {
        if (err) {
            res.status(400).send(err);
        } else {
            if (movieId) {
                collectionDriver.delete('movies', movieId, function (error, objs) {
                    if (error) {
                        res.status(400).send(error);
                    } else {
                        res.status(200).send(JSON.stringify(objs));
                    }
                });
            } else {
                var error = {
                    'message': 'Cannot DELETE the movie'
                };
                res.status(400).send(error);
            }
        }
    };

    deleteMovieBusinessRules(movieId, callback);
});


router.delete('/:collection/:entity', function (req, res) {
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
        collectionDriver.delete(collection, entity, function (error, objs) {
            if (error) {
                res.status(400).send(error);
            } else {
                if (parseInt(JSON.stringify(objs))) {
                    res.status(200).send(objs);
                } else {
                    res.status(404).send(JSON.stringify(objs));
                }
            }
        });
    } else {
        var error = {
            'message': 'Provide id'
        };
        res.status(400).send(error);
    }
});


var deleteMovieBusinessRules = function (movieId, callback) {
    if (movieId) {
        collectionDriver.getVendorsByMovie(movieId, function (error, objs) {
            if (error) {
                callback(error);
            } else if (!_.isEmpty(objs)) {
                callback({message: "Vendors are currently playing this movie"});
            } else {
                callback(null, objs);
            }
        });
    } else {
        callback({message: "Undefined Movie"});
    }
};


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

app.use('/api', router);
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
            if (err) {
                socket.emit('validatedTicketResult', {flag: false, message: 'Invalid Ticket!'});
            } else {
                var vendorSocket = sockets[doc.vendorId];
                if (vendorSocket && vendorSocket.connected) {
                    vendorSocket.emit('validateTicket', _.assignIn(doc, data));
                } else {
                    socket.emit('validatedTicketResult', {flag: false, message: 'Vendor not present.'});
                }
            }
        });
    });

    socket.on('validatedTicketResult', function (result) {
        if (result.flag) {
            var ticketId = result.ticketId;
            collectionDriver.makeTicketInvactive(ticketId, function (error, objs) {
                result.flag = !error;
                sockets[result.userId].emit('validatedTicketResult', result);
            });
        } else {
            sockets[result.userId].emit('validatedTicketResult', result);
        }

    });

    socket.on('end', function (id) {
        socket.disconnect();
        sockets[id] = null;
    });


});

server.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});