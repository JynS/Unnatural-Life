/*jshint esversion: 6 */
var mongoose = require('mongoose');
var series = require('async').series;

var Schema = mongoose.Schema;

var warningSchema = new Schema({
    name: String,
    freq: String,
    val: Number,
    level: Number
});

warningSchema.static('getAllSorted', function(order, cb, next) {

    var self = this;

    series([
        function(callback) {
            // get all the warnings in order

            self.find({}).sort(order).exec((err, warnings) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, warnings);
            });
        }
    ], cb);

});


var Warning = mongoose.model('Warning', warningSchema);

module.exports = Warning;
