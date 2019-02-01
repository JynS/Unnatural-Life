/*jshint esversion: 6 */
var waterfall = require('async').waterfall;
var series = require('async').series;
var winston = require('winston');
var RSS = require('rss');
var fs = require('fs');

var Characters = require('../../schema/characterSchema');
var Organizations = require('../../schema/organizationSchema');
var Warnings = require('../../schema/warningSchema');
var Comics = require('../../schema/comicSchema');
var Statics = require('../../schema/staticSchema');
var RSSFeed = require('../../schema/rssSchema');

var cdb = {

    /*
        Property variables
    */
    cast: '',
    comics: '',
    organizations: '',
    statics: '',
    warnings: '',
    latest: '',
    about: '',
    goodArtBlog: '',
    theOtherWhiteMeat: '',
    rss: '',

    /*
        Helper functions
    */
    addToCollection: function(fields, cb, next) {
        this.addNew(fields, cb, next);
    },
    updateCollection: function(id, values, cb, next) {
        // this.update(query, values, cb, next);
        this.upDate(id, values, cb, next);
    },
    getAllInCollection: function(order, cb, next) {
        this.getAllSorted(order, cb, next);
    },
    findInCollection: function(query, cb, next) {
        this.find(query).exec(cb);
    },
    deleteInCollection: function(id, cb, next) {
        // this.findByIdAndRemove(id, cb);
        this.delete(id, cb, next);
    },
    changeAndUpdate: function(collection, changeParams, changeFn, updateProp, updateFn, cb, next) {
        var self = this;

        series([
            function(callback) {
                // add to changeParams
                changeParams.push(
                    // the standard call back
                    function(err) {
                        if (err) {
                            winston.log('error', err);
                            if (next) next(err);
                            else throw err;
                        }

                        callback(null);
                    }
                );
                changeParams.push(next);
                // make change to database
                self[changeFn].apply(collection, changeParams);
            },
            function(callback) {
                // update appropriate property
                self[updateFn]((err, result) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    self[updateProp] = result[0];

                    callback(null);
                }, next);
            },
            function(callback) {
                if (collection === Comics) {
                    // Comic collection was changed
                    // update latest to reflect changes
                    self.setLatest((err, latest) => {
                        if (err) {
                            winston.log('error', err);
                            if (next) next(err);
                            else throw err;
                        }

                        self.latest = latest;
                        callback(null);
                    }, next);
                }
                else callback(null);
            }
        ], cb);
    },
    addAndUpdate: function(collection, fields, updateProp, updateFn, cb, next) {
        this.changeAndUpdate(collection, [fields], 'addToCollection', updateProp, updateFn, cb, next);
    },
    updateAndUpdate: function(collection, id, values, updateProp, updateFn, cb, next) {
        var params = [id, values];
        this.changeAndUpdate(collection, params, 'updateCollection', updateProp, updateFn, cb, next);
    },
    deleteAndUpdate: function(collection, id, updateProp, updateFn, cb, next) {
        this.changeAndUpdate(collection, [id], 'deleteInCollection', updateProp, updateFn, cb, next);
    },

    /*
        main functions
    */
    // add
    addCharacter: function(fields, cb, next) {
        this.addAndUpdate(Characters, fields, 'cast', 'getAllCharacters', cb, next);
    },
    addComic: function(fields, cb, next) {
        this.addAndUpdate(Comics, fields, 'comics', 'getAllComics', cb, next);
    },
    addOrganization: function(fields, cb, next) {
        this.addAndUpdate(Organizations, fields, 'organizations', 'getAllOrganizations', cb, next);
    },
    addRSSItem: function(fields, cb, next) {

        var self = this;

        waterfall([
            function(callback) {
                // TODO: add item to self.rss

                var item = {
                    title: fields.title,
                    description: '<a href="https://unnaturallife.com">New update</a>.<br/>' + fields.artistComments,
                    date: new Date()
                };

                callback(null, item);
            },
            function(item, callback) {
                // get feed

                RSSFeed.findOne({title: 'Unnatural Life'}, (err, feed) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null, feed, item);
                });
            },
            function(feed, item, callback) {
                // TODO: add item to RSSFeed

                var items = feed.items;
                items.unshift(item);

                RSSFeed.update(
                    {_id: feed.id},
                    { items: items },
                    err => {
                        if (err) {
                            winston.log('error', err);
                            if (next) next(err);
                            else throw err;

                        }

                        callback(null, feed);
                    }
                )
            },
            function(feed, callback) {
                // get feed again now that it has the new item

                RSSFeed.findOne({title: 'Unnatural Life'}, (err, feed) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null, feed);
                });
            },
            function(feed, callback) {
                self.rss.items = [];
                feed.items.forEach((v, i) => {
                    self.rss.item(v);
                });

                callback(null);
            },
            function(callback) {
                // write to file

                fs.writeFile("rss.xml", self.rss.xml(), function(err) {
                    if(err) {
                        return console.log(err);
                    }

                    console.log("The file was saved!");
                });
            }
        ], cb)

    },

    // update
    updateCharacter: function(id, values, cb, next) {
        this.updateAndUpdate(Characters, id, values, 'cast', 'getAllCharacters', cb, next);
    },
    updateComic: function(id, values, cb, next) {
        this.updateAndUpdate(Comics, id, values, 'comics', 'getAllComics', cb, next);
    },
    updateOrganization: function(id, values, cb, next) {
        this.updateAndUpdate(Organizations, id, values, 'organizations', 'getAllOrganizations', cb, next);
    },
    updateAbout: function(id, values, cb, next) {
        this.updateAndUpdate(Statics, id, values, 'about', 'setAbout', cb, next);
    },
    updateGoodArtBlog: function(id, values, cb, next) {
        this.updateAndUpdate(Statics, id, values, 'goodArtBlog', 'setGoodArtBlog', cb, next);
    },
    updateTheOtherWhiteMeat: function(id, values, cb, next) {
        this.updateAndUpdate(Statics, id, values, 'theOtherWhiteMeat', 'setTheOtherWhiteMeat', cb, next);
    },

    // delete
    deleteCharacter: function(id, cb, next) {
        this.deleteAndUpdate(Characters, id, 'cast', 'getAllCharacters', cb, next);
    },
    deleteOrganization: function(id, cb, next) {
        this.deleteAndUpdate(Organizations, id, 'organizations', 'getAllOrganizations', cb, next);
    },
    deleteComic: function(id, cb, next) {
        this.deleteAndUpdate(Comics, id, 'comics', 'getAllComics', cb, next);
    },

    // get all
    getAllCharacters: function(cb, next) {
        this.getAllInCollection.call(Characters, 'order', cb, next);
    },
    getAllComics: function(cb, next) {
        this.getAllInCollection.call(Comics, 'page', cb, next);
    },
    getAllOrganizations: function(cb, next) {
        this.getAllInCollection.call(Organizations, 'order', cb, next);
    },
    getAllWarnings: function(cb, next) {
        this.getAllInCollection.call(Warnings, '-level', cb, next);
    },

    // find
    findComic: function(query, cb, next) {
        this.findInCollection.call(Comics, query, cb, next);
    },
    findCharacter: function(query, cb, next) {
        this.findInCollection.call(Characters, query, cb, next);
    },
    findOrganization: function(query, cb, next) {
        this.findInCollection.call(Organizations, query, cb, next);
    },

    // set properties
    setCharacters: function(cb, next) {
        this.getAllCharacters(cb, next);
    },
    setComics: function(cb, next) {
        this.getAllComics(cb, next);
    },
    setOrganizations: function(cb, next) {
        this.getAllOrganizations(cb, next);
    },
    setWarnings: function(cb, next) {
        this.getAllWarnings(cb, next);
    },
    setLatest: function(cb, next) {
        Comics.getLatest(cb, next);
    },
    setAbout: function(cb) {
        Statics.find({name: 'About'}, cb);
    },
    setGoodArtBlog: function(cb) {
        Statics.find({name: 'Good Art Blog'}, cb);
    },
    setTheOtherWhiteMeat: function(cb) {
        Statics.find({name: 'The Other White Meat'}, cb);
    },
    setRSS: function(cb) {
        RSSFeed.findOne({title: 'Unnatural Life'}, cb);
    },

    // init
    init: function() {
        // set the values

        var self = this;

        waterfall([
            function(callback) {

                self.setComics(function(err, comics) {
                    if (err) throw err;

                    callback(null, comics);
                });
            },
            function(comics, callback) {

                self.setCharacters(function(err, cast) {
                    if (err) throw err;

                    callback(null, comics, cast);
                });
            },
            function(comics, cast, callback) {

                self.setOrganizations(function(err, orgs) {
                    if (err) throw err;

                    callback(null, comics, cast, orgs);
                });
            },
            function(comics, cast, orgs, callback) {

                self.setWarnings(function(err, warnings) {
                    if (err) throw err;

                    callback(null, comics, cast, orgs, warnings);
                });
            },
            function(comics, cast, orgs, warnings, callback) {

                self.setLatest(function(err, latest) {
                    if (err) throw err;

                    callback(null, comics, cast, orgs, warnings, latest);
                });
            },
            function(comics, cast, orgs, warnings, latest, callback) {

                self.setAbout(function(err, about) {
                    if (err) throw err;

                    callback(null, comics, cast, orgs, warnings, latest, about[0]);
                });
            },
            function(comics, cast, orgs, warnings, latest, about, callback) {

                self.setGoodArtBlog(function(err, goodArtBlog) {
                    if (err) throw err;

                    callback(null, comics, cast, orgs, warnings, latest, about, goodArtBlog[0]);
                });
            },
            function(comics, cast, orgs, warnings, latest, about, goodArtBlog, callback) {

                self.setTheOtherWhiteMeat(function(err, theOtherWhiteMeat) {
                    if (err) throw err;

                    callback(null, comics, cast, orgs, warnings, latest, about, goodArtBlog, theOtherWhiteMeat[0]);
                });
            },
            function(comics, cast, orgs, warnings, latest, about, goodArtBlog, theOtherWhiteMeat, callback) {

                self.setRSS(function(err, rss) {
                    if (err) throw err;

                    // buid rss object
                    var feed = new RSS({
                        title: rss.title,
                        description: rss.description,
                        site_url: rss.site_url
                    });

                    // add all items if any
                    if (rss.items) {
                        rss.items.forEach((v, i) => {
                            feed.item(v);
                        })
                    }

                    callback(null, comics, cast, orgs, warnings, latest, about, goodArtBlog, theOtherWhiteMeat, feed);
                });
            }
        ],
        function(err, comics, cast, orgs, warnings, latest, about, goodArtBlog, theOtherWhiteMeat, rss) {
            if (err) throw err;

            self.comics = comics[0];
            self.cast = cast[0];
            self.organizations = orgs[0];
            self.warnings = warnings[0];
            self.latest = latest;
            self.about = about;
            self.goodArtBlog = goodArtBlog;
            self.theOtherWhiteMeat = theOtherWhiteMeat;
            self.rss = rss;
        });
    },

};

module.exports = cdb;
