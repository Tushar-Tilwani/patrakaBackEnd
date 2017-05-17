var ObjectID = require('mongodb').ObjectID,
    _ = require('lodash'),
    Join = require('mongo-join').Join,
    moment = require('moment'),
    hash_salt = require('pwd');

CollectionDriver = function (db) {
    this.db = db;
};

CollectionDriver.prototype.getCollection = function (collectionName, callback) {
    this.db.collection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else callback(null, the_collection);
    });
};

//find all objects for a collection
CollectionDriver.prototype.findAll = function (collectionName, callback) {
    this.getCollection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else {
            the_collection.find().toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
        }
    });
};

//find a specific object
CollectionDriver.prototype.get = function (collectionName, id, callback) {
    this.getCollection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else {
            var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            if (!checkForHexRegExp.test(id)) callback({message: "invalid id"});
            else the_collection.findOne({'_id': ObjectID(id)}, function (error, doc) {
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};

//save new object
CollectionDriver.prototype.save = function (collectionName, obj, callback) {
    this.getCollection(collectionName, function (error, the_collection) { //A
        if (error) callback(error);
        else {
            obj.created_at = new Date(); //B
            the_collection.insert(obj, function () { //C
                callback(null, obj);
            });
        }
    });
};

//update a specific object
CollectionDriver.prototype.update = function (collectionName, obj, entityId, callback) {
    this.getCollection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else {
            obj._id = ObjectID(entityId);
            obj.updated_at = new Date();
            the_collection.save(obj, function (error, doc) {
                if (error) callback(error);
                else callback(null, obj);
            });
        }
    });
};


//delete a specific object
CollectionDriver.prototype.delete = function (collectionName, entityId, callback) {
    this.getCollection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else {
            the_collection.remove({'_id': ObjectID(entityId)}, function (error, doc) {
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};


CollectionDriver.prototype.batchInsert = function (collectionName, objects, callback) {
    this.getCollection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else {
            var batch = the_collection.initializeUnorderedBulkOp({useLegacyOps: true});
            // Add some operations to be executed in order
            _.forEach(objects, function (obj) {
                batch.insert(obj);
            });

            batch.execute(function (error, doc) {
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};


CollectionDriver.prototype.createTickets = function (ticketObj, callback) {
    var that = this;
    that.getCollection('shows', function (error, the_collection) {
        if (error) {
            return callback(error);
        }
        bookTicketBusinessRules(the_collection, ticketObj, function (error, result) {
            if (error) {
                return callback(error);
            }
            var ticketCount = _.toInteger(ticketObj.count);
            the_collection.update({'_id': ObjectID(ticketObj.showId)}, {
                    $inc: {
                        ticketsAvailable: (0 - ticketCount),
                        sold: ticketCount
                    }
                },
                function (error, result) {
                    if (error || !_.get(result, ['result', 'ok'])) {
                        return callback(error);
                    }
                    that.save('tickets', ticketObj, function (error, result) {
                        if (error) {
                            return callback(error);
                        }
                        callback(null, result);
                    });
                });
        });
    });
};

var bookTicketBusinessRules = function (collection, ticketObj, callback) {
    if (ticketObj.showId) {
        collection.findOne({'_id': ObjectID(ticketObj.showId)}, function (error, doc) {
            if (error) {
                callback(error);
            } else if ((doc.ticketsAvailable - ticketObj.count) > 0) {
                callback(null, doc);
            } else {
                callback({
                    message: 'Only ' + doc.ticketsAvailable + ' tickets available'
                });
            }
        });
    } else {
        callback({
            message: 'Bad Request',
            status: '404'
        });
    }
};


//find a specific object
CollectionDriver.prototype.findAllByIds = function (collectionName, ids, callback) {
    this.getCollection(collectionName, function (error, the_collection) {
        if (error) callback(error);
        else {
            var objIds = _.map(ids, function (id) {
                return ObjectID(id);
            }, {});
            console.log(objIds);
            the_collection.find({'_id': {'$in': objIds}})
                .toArray(function (error, results) {
                    if (error) callback(error);
                    else {
                        callback(null, results);
                    }
                });
        }
    });
};

CollectionDriver.prototype.getMoviesByVendor = function (vendorId, callback) {
    var that = this;
    that.getShowsByVendor(vendorId, function (error, shows) {
        if (error) callback(error);
        else {
            var movieIds = _.keys(_.groupBy(shows, 'movieId'));
            console.log(shows);
            that.findAllByIds('movies', movieIds, function (error, docs) {
                if (error) {
                    callback(error);
                }
                callback(null, docs);
            });
        }
    });


};


// CollectionDriver.prototype.getShowsByVendor = function (vendorId, callback) {
//     var that = this;
//     that.getCollection('shows', function (error, the_collection) {
//         if (error) callback(error);
//         the_collection.find({'vendorId': vendorId})
//             .toArray(function (error, results) {
//                 if (error) callback(error);
//                 else {
//                     callback(null, results);
//                 }
//             });
//     });
// };


CollectionDriver.prototype.getShowsByVendor = function (vendorId, callback) {
    var that = this;
    that.getCollection('shows', function (error, the_collection) {
        if (error) callback(error);
        else {
            var selection = {'vendorId': vendorId};
            the_collection.find(selection, function (err, cursor) {
                var join = new Join(that.db)
                    .on({
                        field: 'movieId',
                        as: 'movie',
                        to: '_id',
                        from: 'movies'
                    });

                join.toArray(cursor, function (error, joinedDocs) {
                    if (error) {
                        callback(error, joinedDocs);
                    }
                    callback(null, joinedDocs);
                })
            })
        }
    });
};


CollectionDriver.prototype.getShowsByMovie = function (movieId, callback) {
    var that = this;
    that.getCollection('shows', function (error, the_collection) {
        if (error) callback(error);
        the_collection.find({'movieId': movieId})
            .toArray(function (error, results) {
                if (error) callback(error);
                else {
                    callback(null, results);
                }
            });
    });
};

CollectionDriver.prototype.getShowsByVendorAndMovie = function (vendorId, movieId, callback) {
    var that = this;
    that.getCollection('shows', function (error, the_collection) {
        if (error) callback(error);
        the_collection.find({
            'vendorId': vendorId,
            'movieId': movieId
        }).toArray(function (error, results) {
            if (error) callback(error);
            else {
                callback(null, results);
            }
        });
    });
};


CollectionDriver.prototype.getVendorsByMovie = function (movieId, callback) {
    var that = this;
    that.getShowsByMovie(movieId, function (error, shows) {
        if (error) callback(error);
        else {
            var vendorIds = _.keys(_.groupBy(shows, 'vendorId'));
            that.findAllByIds('vendors', vendorIds, function (error, docs) {
                if (error) {
                    callback(error);
                }
                callback(null, docs);
            });
        }
    });
};

//Removes blacklisted vendors
CollectionDriver.prototype.getVendorsByMovieCorrected = function (movieId, userId, callback) {
    var that = this;
    that.getShowsByMovie(movieId, function (error, shows) {
        if (error) callback(error);
        else {
            var vendorIds = _.keys(_.groupBy(shows, 'vendorId'));

            that.getCollection('vendors', function (error, the_collection) {
                if (error) callback(error);
                else {
                    var selection = {
                        'blacklist': {
                            "$not": {
                                $elemMatch: {
                                    $eq: userId
                                }
                            }
                        }
                    };

                    the_collection.find(selection)
                        .toArray(function (error, results) {
                            if (error) callback(error);
                            else {
                                callback(null, results);
                            }
                        });
                }
            });
        }
    });
};


CollectionDriver.prototype.getMoviesByPattern = function (pattern, callback) {
    var that = this;
    that.getCollection('movies', function (error, the_collection) {
        if (error) {
            callback(error);
        }
        //console.log(pattern);
        //db.movies.findOne({'fields.title': { '$regex' : /don.*/i }})
        if (pattern === '*') {
            pattern = '';
        }
        var regex = new RegExp(pattern + '.*');
        var selection = {'fields.title': {'$regex': regex, '$options': 'i'}};
        the_collection.find(selection, {}, {'limit': 10})
            .toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
    });
};


CollectionDriver.prototype.getSortedMovies = function (pattern, field, order, pageSize, callback) {
    var that = this;
    var sortBy = {};
    field = 'fields.' + field;
    sortBy[field] = order;
    if (pattern === '*') {
        pattern = '';
    }
    var regex = new RegExp(pattern + '.*');
    var selection = {'fields.title': {'$regex': regex, '$options': 'i'}};

    that.getCollection('movies', function (error, the_collection) {
        if (error) callback(error);
        else {
            the_collection.find(selection, {}, {'limit': pageSize}).sort(sortBy)
                .toArray(function (error, result) {
                    if (error) callback(error);
                    else callback(null, result);
                });
        }
    });
};

CollectionDriver.prototype.getTicketsByUserId = function (userId, callback) {
    var selection = {'userId': userId};
    this.getTickets(selection, false, callback);

};

CollectionDriver.prototype.getTicketById = function (ticketId, callback) {
    var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    if (!checkForHexRegExp.test(ticketId)) callback({message: "invalid id"});
    var selection = {'_id': ObjectID(ticketId)};
    this.getTickets(selection, true, function (err, docs) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, _.head(docs) || '');
        }
    });
};


CollectionDriver.prototype.getTickets = function (selection, giveUser, callback) {
    var that = this;
    that.getCollection('tickets', function (error, the_collection) {
        if (error) callback(error);
        the_collection.find(selection, function (err, cursor) {
            var join = new Join(that.db)
                .on({
                    field: 'vendorId',
                    as: 'vendor',
                    to: '_id',
                    from: 'vendors'
                }).on({
                    field: 'movieId',
                    as: 'movie',
                    to: '_id',
                    from: 'movies'
                });
            if (giveUser) {
                join.on({
                    field: 'userId',
                    as: 'user',
                    to: '_id',
                    from: 'users'
                });
            }

            join.toArray(cursor, function (err, joinedDocs) {
                _.forEach(joinedDocs, function (obj) {
                    _.unset(obj, 'user.password');
                });
                callback(err, _.sortBy(joinedDocs, 'date'));
            });
        });
    });
};


CollectionDriver.prototype.getShowMetaByVendor = function (vendorId, callback) {
    var that = this;
    that.getCollection('shows', function (error, the_collection) {
        if (error) callback(error);
        else {
            var selection = {'vendorId': vendorId};
            the_collection.find(selection, function (err, cursor) {
                var join = new Join(that.db)
                    .on({
                        field: 'movieId',
                        as: 'movie',
                        to: '_id',
                        from: 'movies'
                    });

                join.toArray(cursor, function (err, joinedDocs) {
                    if (error) {
                        callback(error);
                    } else {
                        var results = [];
                        var shows = _.groupBy(joinedDocs, 'movieId');
                        _.forEach(shows, function (s, i) {
                            var showTimes = _.keys(_.groupBy(s, 'showTime'));
                            var start_date = moment(_.minBy(s, 'date').date);
                            var end_date = _.maxBy(s, 'date').date;
                            results.push({
                                showTimes: showTimes,
                                start_date: start_date,
                                end_date: end_date,
                                movie: _.head(s).movie
                            });
                        });
                        callback(null, results);
                    }
                });
            });
        }
    });
};

CollectionDriver.prototype.makeTicketInvactive = function (ticketId, callback) {
    var that = this;
    that.getCollection('tickets', function (error, the_collection) {
        if (error) callback(error);
        else {
            the_collection.update({_id: ObjectID(ticketId)}, {
                $set: {
                    status: 'inactive'
                }
            }, {upsert: true}, function (error, doc) {
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};

CollectionDriver.prototype.getUsers = function (userIds, callback) {
    var that = this;
    that.findAllByIds('users', userIds, function (error, docs) {
        if (error) {
            callback(error);
        }
        callback(null, removePassword(docs));
    });
};

CollectionDriver.prototype.addBlacklistUsers = function (vendorId, userId, callback) {
    var that = this;
    that.getCollection('vendors', function (error, the_collection) {
        if (error) callback(error);
        else {
            var selection = {'_id': ObjectID(vendorId)};
            var push = {'$addToSet': {'blacklist': userId}};
            the_collection.update(selection, push, function (error, result) {
                if (error) callback(error);
                else callback(null, result);
            });
        }
    });
};

CollectionDriver.prototype.removeBlacklistUsers = function (userId, callback) {
    var that = this;
    that.update('vendors', function (error, the_collection) {
        if (error) callback(error);
        else {
            var selection = {'_id': ObjectID(vendorId)};
            var push = {'$pull': {'blacklist': userId}};
            the_collection.update(selection, push, function (error, result) {
                if (error) callback(error);
                else callback(null, result);
            });
        }
    });
};


CollectionDriver.prototype.modifyGlobalBlacklistUsers = function (userId, flag, callback) {
    var that = this;
    that.getCollection('users', function (error, the_collection) {
        if (error) callback(error);
        else {
            var selection = {'_id': ObjectID(userId)};
            var updateVal = {'$set': {'blacklist': flag}};
            the_collection.update(selection, updateVal, function (error, result) {
                if (error) callback(error);
                else callback(null, result);
            });
        }
    });
};


CollectionDriver.prototype.getGloballyBlacklistedUsers = function (callback) {
    var that = this;
    that.getCollection('users', function (error, the_collection) {
        if (error) {
            callback(error);
        }
        var selection = {'blacklist': true};
        the_collection.find(selection, {password: 0, token: 0})
            .toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
    });
};


CollectionDriver.prototype.getUsersByPattern = function (pattern, callback) {
    var that = this;
    that.getCollection('users', function (error, the_collection) {
        if (error) {
            callback(error);
        }
        //console.log(pattern);
        //db.movies.findOne({'fields.title': { '$regex' : /don.*/i }})
        if (pattern === '*') {
            pattern = '';
        }
        var regex = new RegExp(pattern + '.*');
        var selection = {
            '$or': [
                {'first_name': {'$regex': regex, '$options': 'i'}},
                {'last_name': {'$regex': regex, '$options': 'i'}}
            ]
        };

        the_collection.find(selection, {}, {'limit': 10})
            .toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
    });
};


function checkPasswordHash(clientPassword, databasePassword, callback) {
    hash_salt.hash(clientPassword, databasePassword.salt)
        .then(function (result) {
            if (!_.isEqual(databasePassword.hash, result.hash)) {
                callback({message: 'Invalid password'});
                return;
            }
            callback(null, true);
        });
}

function assignToken(the_collection, user, token, callback) {
    the_collection.update({'_id': ObjectID(user._id)}, {
        $set: token
    }, function (error, data) {
        if (error) {
            callback(error);
        } else {
            var toSend = _.omit(_.assignIn(user, token), 'password');
            callback(null, toSend);
        }
    });
}

CollectionDriver.prototype.login = function (user_name, password, callback) {
    var that = this;
    that.getCollection('users', function (error, the_collection) {
        if (error) {
            callback(error);
        }
        var selection = {
            '$and': [
                {'user_name': user_name}
            ]
        };

        var token = {
            token: ObjectID()
        };

        the_collection.findOne(selection, function (error, user) {
            if (error || _.isEmpty(user)) {
                callback(_.assignIn(error, {message: 'Invalid Username'}));
            } else if (user.blacklist) {
                callback({message: 'You have been banned for your nefarious activities.'});
            } else {
                checkPasswordHash(password, user.password, function (error) {
                    if (error) {
                        callback(error);
                    } else {
                        assignToken(the_collection, user, token, callback)
                    }
                });
            }
        });

    });
};

CollectionDriver.prototype.getUserByToken = function (token, callback) {
    var that = this;
    that.getCollection('users', function (error, the_collection) {
        if (error || !the_collection) {
            callback(_.defaults(error, {message: 'Internal Server Error'}));
        } else {
            the_collection.findOne({token: ObjectID(token)}, {password: 0}, function (error, user) {
                if (error || _.isEmpty(user)) {
                    callback(_.defaults(error, {message: 'User not authorized'}));
                } else {
                    callback(null, user);
                }
            });
        }
    });

};

CollectionDriver.prototype.checkUserName = function (user_name, callback) {
    var that = this;
    that.getCollection('users', function (error, the_collection) {
        if (error || !the_collection) {
            callback(_.defaults(error, {message: 'Internal Server Error'}));
        } else {
            the_collection.findOne({user_name: user_name}, {password: 0}, function (error, user) {
                if (error) {
                    callback(_.defaults(error, {message: 'Some Error'}));
                } else {
                    callback(null, user);
                }
            });
        }
    });
};


CollectionDriver.prototype.registerUser = function (userObj, callback) {
    var that = this;
    hash_salt.hash(userObj.password)
        .then(function (result) {
            userObj.password = {
                salt: result.salt,
                hash: result.salt
            };
            userObj.token = ObjectID();
            that.save('users', userObj, callback);
        });
};

// CollectionDriver.prototype.authenticateUser = function (user_name, password, callback) {
//     this.getCollection('users', function (error, the_collection) {
//         if (error) callback(error);
//         else {
//             var selection = {
//                 user_name: user_name,
//                 password: md5(password)
//             };
//
//             the_collection.findOne(selection, {}, function (error, doc) { //B
//                 //console.log(doc);
//                 if (error) {
//                     callback(error)
//                 } else if (_.isEmpty(doc)) {
//                     callback({error: "User Not found!", status: 404});
//                 } else {
//                     var token = ObjectID();
//                     var selection = {
//                         _id: ObjectID(doc._id)
//                     };
//                     var toUpdate = {};
//                     toUpdate["$set"] = {
//                         token: token
//                     };
//
//                     the_collection.update(selection, toUpdate, {
//                         "upsert": true
//                     }, function (error, doc) { //B
//                         if (error) {
//                             callback(error);
//                         }
//                         else callback(null, toUpdate["$set"]);
//                     });
//                 }
//             });
//         }
//     });
// };


function removePassword(users) {
    return _.map(users, function (user) {
        return _.omit(user, 'password');
    });
}

exports.CollectionDriver = CollectionDriver;