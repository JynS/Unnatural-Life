/*jshint esversion: 6 */
var express = require('express');
var router = express.Router();
var winston = require('winston');
var multer = require('multer');
var cdb = require('../modules/comic-database');
var waterfall = require('async').waterfall;
var fs = require('fs');
var revHash = require('rev-hash');
var tinify = require("tinify");
tinify.key = "fma2mlhuqgii00XofW7VLfP0jMuZyeRQ";

var comic_storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + "/../images/chapters");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
var character_storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + "/../images/cast");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

var comic_upload = multer({ storage: comic_storage });
var character_upload = multer({ storage: character_storage });

router.get('/comic', function(req, res, next) {
    if (req.isAdmin) {
        res.render('new-page', {
            warnings: cdb.warnings,
            isAdmin: true
        });
    }
    else {
        res.redirect('/comic/latest');
    }
});

router.post('/comic', comic_upload.single('image'), function(req, res, next) {

    try {
        var data = JSON.parse(req.body.data);
        data.image = req.file.filename;

        waterfall([
            function(callback) {
                // add hash to image
                revImage(req.file.destination, req.file.filename, next, (err, newPath, newImage) => {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    data.image = newImage;

                    callback(null, newPath);
                });
            },
            function(newPath, callback) {
                // minimize image
                var s = tinify.fromFile(newPath);

                s.toFile(newPath, function(err) {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    winston.info("Compressions this month: %d out of 500", tinify.compressionCount);

                    callback(null);
                });
            },
            function(callback) {
                // add to database
                cdb.addComic(data, function(err) {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    winston.info('comic added');
                    res.redirect('/comic/latest');
                    callback(null);
                }, next);
            },
            function(callback) {
                // update RSS feed
                cdb.addRSSItem(data, function(err) {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    winston.info('rss updated');
                }, next)
            }
        ]);

    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }


});

router.post('/character', character_upload.single('image'), function(req, res, next) {

    try {
        var data = JSON.parse(req.body.data);

        waterfall([
            function(callback) {
                // add hash to image
                revImage(req.file.destination, req.file.filename, next, (err, newPath, newImage) => {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    data.icon = newImage;

                    callback(null, newPath);
                });
            },
            function(newPath, callback) {
                // minimize image
                var s = tinify.fromFile(newPath);

                s.toFile(newPath, function(err) {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    winston.info("Compressions this month: %d out of 500", tinify.compressionCount);

                    callback(null);
                });
            },
            function(callback) {

                cdb.addCharacter(data, function(err) {
                    if (err) {
                        winston.log('error', err);
                        next(err);
                    }

                    winston.info('character saved');
                    res.redirect('/characters');
                }, next);
            }
        ]);

    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }

});

router.post('/organization', function(req, res, next) {


    try {
        var data = JSON.parse(req.body.data);

        cdb.addOrganization(data, function(err) {
            if (err) {
                winston.log('error', err);
                next(err);
            }

            winston.info('organization saved');
            res.redirect('/characters');
        }, next);
    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }

});

function revImage(path, image, next, cb) {
    waterfall([
        function(callback) {
            // get buffer of new file
            winston.info(path + image);
            fs.readFile(path + "/" + image, (err, file) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, file);
            });
        },
        function(file, callback) {
            var arr = image.split('.');
            var newImage = arr[0] + '-' + revHash(file) + '.' + arr[1];
            var newPath = path +  "/" + newImage;

            fs.rename(path + "/" + image, newPath, err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, newPath, newImage);
            });
        }
    ], cb);
}

module.exports = router;
