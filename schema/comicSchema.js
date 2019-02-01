/*jshint esversion: 6 */
var mongoose = require('mongoose');
var winston = require('winston');
var waterfall = require('async').waterfall;
var series = require('async').series;

var Schema = mongoose.Schema;

var comicSchema = new Schema({
    page: Number,
    prevPage: Number,
    nextPage: Number,
    arc: String,
    title: String,
    summary: String,
    transcript: String,
    artistComments: String,
    warningKeys: [Number],
    warningText: [String],
    image: String
});

mongoose.Promise = global.Promise;

comicSchema.static('upDate', function(id, values, cb, next) {

    this.update({_id: id}, values, cb);
});

comicSchema.static('getAllSorted', function(order, cb, next) {

    var self = this;

    series([
        function(callback) {
            // get all the comics in order

            self.find({}).sort(order).exec((err, comics) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, comics);
            });
        }
    ], cb);

});

comicSchema.static('getLatest', function(cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            // find the latest page
            self.findOne({nextPage: -1}).exec((err, latest) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, latest);
            });
        }
    ], cb);

});

comicSchema.static('addNew', function(fields, cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            self.getLatest(function(err, latest) {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, latest);
            }, next);
        },
        function(latest, callback) {

            try {
                var page;
                var prevPage;
                if (latest) {
                    // collection is not empty
                    page = latest.page + 1;
                    prevPage = latest.page;
                }
                else {
                    // collection is empty
                    page = 1;
                    prevPage = -1;
                }
                callback(null, page, prevPage);

            }
            catch(e) {
                winston.log('error', e);
                if (next) next(e);
                else throw e;
            }
        },
        function(page, prevPage, callback) {
            try {

                // save new card
                var comic = self({
                    page: page,
                    prevPage: prevPage,
                    nextPage: -1,
                    arc: fields.arc,
                    title: fields.title,
                    summary: fields.summary,
                    transcript: fields.transcript,
                    artistComments: fields.comments,
                    warningKeys: fields.warningKeys,
                    warningText: fields.warningText,
                    image: fields.image
                });

                comic.save(err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    winston.info('comic saved');
                    callback(null, page, prevPage);
                });
            }
            catch(e) {
                winston.log('error', e);
                if (next) next(e);
                else throw e;
            }
        },
        function(page, prevPage, callback) {
            try {
                // update nextPage on the previous comic
                if (prevPage !== -1) {
                    // previous page exists
                    self.update(
                        {page: prevPage},
                        {
                            nextPage: page
                        },
                        err => {
                            if (err) {
                                winston.log('error', err);
                                if (next) next(err);
                                else throw err;
                            }

                            winston.info('previous page updated');
                            callback(null);
                        }
                    );
                }
                else {
                    callback(null);
                    // FIXME: make sure duplicates don't occur
                }
            }
            catch(e) {
                winston.log('error', e);
                if (next) next(e);
                else throw e;
            }
        }
    ], cb);


});

comicSchema.static('delete', function(id, cb, next) {

    var self = this;

    waterfall([
        function(callback) {
            // get page and next page to be deleted
            self.findById(id).exec((err, ch) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                let page = ch.page;
                let nextPage = ch.nextPage;
                callback(null, page, nextPage);
            });
        },
        function(page, nextPage, callback) {
            // delete page
            self.findByIdAndRemove(id).exec(err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, page, nextPage);
            });
        },
        function(page, nextPage, callback) {
            // get latest page
            try {
                self.find({nextPage: -1}).exec((err, ch) => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    var latest = ch[0].page;
                    callback(null, nextPage, latest); // 3, 4
                });
            }
            catch(e) {
                winston.log('error', e);
                if (next) next(e);
                else throw e;
            }
        },
        function(nextPage, latest, callback) {
            // update page numbers of succeeding pages
            try {
                if (nextPage !== -1) {
                    whilst(
                        function() { return nextPage <= latest; },
                        function(callback) {
                            self.update(
                                {page: nextPage},
                                {
                                    page: nextPage - 1,
                                    prevPage: nextPage - 2,
                                    nextPage: nextPage === latest ? -1 : nextPage
                                },
                                err => {
                                    if (err) {
                                        winston.log('error', err);
                                        if (next) next(err);
                                        else throw err;
                                    }

                                    nextPage += 1;
                                    callback(null);
                                }
                            )
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
                }
                else {
                    self.update(
                        {page: latest},
                        {
                            nextPage: -1
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
                }
            }
            catch(e) {
                winston.log('error', e);
                if (next) next(e);
                else throw e;
            }
        }
    ], cb);
});

var Comic = mongoose.model('Comic', comicSchema);

module.exports = Comic;
