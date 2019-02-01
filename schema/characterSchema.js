/*jshint esversion: 6 */
var mongoose = require('mongoose');
var winston = require('winston');
var waterfall = require('async').waterfall;
var series = require('async').series;
var whilst = require('async').whilst;
var each = require('async').each;

var Schema = mongoose.Schema;

var characterSchema = new Schema({
    name: String,
    icon: String,
    description: String,
    order: Number
});

characterSchema.static('getAllSorted', function(order, cb, next) {

    var self = this;

    series([
        function(callback) {
            // get all the characters in order

            self.find({}).sort(order).exec((err, cast) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, cast);
            });
        }
    ], cb);

});

characterSchema.static('delete', function(id, cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            // get order of page to be deleted
            self.findById(id).exec((err, character) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                var order = character.order;
                callback(null, order);
            });
        },
        function(order, callback) {
            // delete character
            self.findByIdAndRemove(id).exec(err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, order);
            });
        },
        function(order, callback) {
            // update order of succeeding characters
            self.updateOrder(order+1, -1, "-", err =>{
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null);
            }, next);
        }
    ], cb);
});

characterSchema.static('upDate', function(id, values, cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            var newPos;
            var oldPos;
            // check if the order has changed
            if (values.order) {
                newPos = values.order;

                // get oldPos
                self.findById(id).exec((err, character) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    oldPos = character.order;
                    callback(null, oldPos, newPos);
                });
            }
            else {
                // order not changed
                callback(null, oldPos, newPos);
            }
        },
        function(oldPos, newPos, callback) {
            if (values.order) {
                // changing order

                // set to negative in order to retrieve and update it later
                values.order *= -1;
            }

            // update character
            self.update({_id: id}, values, err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, oldPos, newPos);
            });
        },
        function(oldPos, newPos, callback) {
            if (values.order) {
                // update order for other characters

                if (oldPos < newPos) {
                    start = oldPos;
                    end = newPos;
                    dir = "-";
                }
                else {
                    start = newPos;
                    end = oldPos;
                    dir = "+";
                }
                self.updateOrder(start, end, dir, err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null, newPos);
                }, next);
            }
            else {
                // no change in order
                callback(null, newPos);
            }
        },
        function(newPos, callback) {
            if (values.order) {
                // order changed

                // make negative order positive
                self.update({_id: id}, {order: newPos}, err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null);
                });
            }
            else {
                // no change in order
                // we're done
                callback(null);
            }
        }
    ], cb);
});


characterSchema.static('updateOrder', function(start, end, direction, cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            if (end === -1) {
                // going to the end
                self.find({}).sort('-order').exec((err, cast) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null, cast[0].order);
                });
            }
            else {
                callback(null, end);
            }
        },
        function(last, callback) {
            whilst(
                function() { return start <= last; },
                function(callback) {
                    self.update(
                        {order: start},
                        // TODO: DON'T ALLOW POSITON 1
                    direction === "+" ?
                    {order: (start+1) * -1} :
                    {order: (start-1) * -1},
                        err => {
                            if (err) {
                                winston.log('error', err);
                                if (next) next(err);
                                else throw err;
                            }
                            start += 1;
                            callback(null, start);
                        }
                    );
                },
                err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null);
                }
            );
        },
        function(callback) {
            // get all flagged characters
            self.find({}).where('order').lt(0).exec((err, characters) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, characters);
            });
        },
        function(characters, callback) {
            //  and set their order to positive
            each(characters, function(character, callback) {
                self.update(
                    {_id: character.id},
                    {order: character.order * -1},
                    err => {
                        if (err) {
                            winston.log('error', err);
                            if (next) next(err);
                            else throw err;
                        }

                        callback();
                    }
                );
            }, err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null);
            });
        }
    ], cb);
});

characterSchema.static('addNew', function(fields, cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            // find last in order
            var order;
            if (fields.order) {
                order = fields.order;
                callback(null, order * -1);
            }
            else {
                self.find({}).sort('-order').exec((err, cast) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    var order;
                    if (cast.length === 0) order = 1;
                    else order = cast[0].order + 1;

                    callback(null, order);
                });
            }
        },
        function(order, callback) {
            // build and save card
            try {
                var character = self({
                    name: fields.name,
                    icon: fields.icon,
                    description: fields.description,
                    order: order
                });

                character.save(err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null, order);
                });
            }
            catch(e) {
                winston.log('error', e);
                if (next) next(e);
                else throw e;
            }

        },
        function(order, callback) {

            if (fields.order) {
                // admin set the order
                // update the order of the succeeding characters
                self.updateOrder(order * -1, -1, "+", err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null);
                }, next);
            }
            else callback(null);
        }
        // function(order, callback) {
        //
        //     if (fields.order) {
        //         self.update(
        //             {order: order},
        //             {order: order * -1},
        //             err => {
        //                 if (err) {
        //                     winston.log('error', err);
        //                     if (next) next(err);
        //                     else throw err;
        //                 }
        //
        //                 callback(null);
        //             }
        //         );
        //     }
        //     else {
        //         callback(null);
        //     }
        // }
    ], cb);
});


var Character = mongoose.model('Character', characterSchema);

module.exports = Character;
