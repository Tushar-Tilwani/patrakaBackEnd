var ObjectID = require('mongodb').ObjectID,
    _ = require('lodash');

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
            if (!checkForHexRegExp.test(id)) callback({error: "invalid id"});
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

            batch.execute(function (err, doc) {
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};


CollectionDriver.prototype.updateTickets = function (obj, callback) {
    var that = this;
    that.getCollection('showrel', function (error, the_collection) {
        if (error) {
            return callback(error);
        }
        bookTicketBusinessRules(the_collection, obj, function (error, result) {
            if (error) {
                return callback(error);
            }
            the_collection.update({'_id': ObjectID(obj.showrelId)}, {$inc: {ticketAvailable: (0 - _.toInteger(obj.noOfTickets))}},
                function (error, result) {
                    if (error || !_.get(result, ['result', 'ok'])) {
                        return callback(error);
                    }
                    that.save('tickets', obj, function (error, result) {
                        if (error) {
                            return callback(error);
                        }
                        callback(null, result);
                    });
                });
        });

    });
};

var bookTicketBusinessRules = function (collection, obj, callback) {
    if (obj.showrelId) {
        collection.findOne({'_id': ObjectID(obj.showrelId)}, function (error, doc) {
            if (error) {
                callback(error);
            } else if ((doc.ticketAvailable - obj.noOfTickets) > 0) {
                callback(null, doc);
            } else {
                callback({
                    message: 'Only ' + doc.ticketAvailable + ' tickets available'
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


CollectionDriver.prototype.getShowsById = function (obj, callback) {
    var that = this;
    that.getCollection('showrel', function (error, the_collection) {
        if (error) {
            return callback(error);
        }
        bookTicketBusinessRules(the_collection, obj, function (error, result) {
            if (error) {
                return callback(error);
            }
            the_collection.update({'_id': ObjectID(obj.showrelId)}, {$inc: {ticketAvailable: (0 - _.toInteger(obj.noOfTickets))}},
                function (error, result) {
                    if (error || !_.get(result, ['result', 'ok'])) {
                        return callback(error);
                    }
                    that.save('tickets', obj, function (error, result) {
                        if (error) {
                            return callback(error);
                        }
                        callback(null, result);
                    });
                });
        });

    });
};

exports.CollectionDriver = CollectionDriver;