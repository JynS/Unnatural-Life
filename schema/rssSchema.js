/*jshint esversion: 6 */
var mongoose = require('mongoose');
var waterfall = require('async').waterfall;

var Schema = mongoose.Schema;

var rssSchema = new Schema({
    title: String,
    description: String,
    site_url: String,
    items: [
        {
            title: String,
            description: String,
            date: Date
        }
    ]
});


var Rss = mongoose.model('Rss', rssSchema);

rssSchema.static('upDate', function(id, items, cb, next) {

    this.update({_id: id}, values, cb);
});

module.exports = Rss;
