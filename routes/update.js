/*jshint esversion: 6 */
var express = require('express');
var router = express.Router();
var winston = require('winston');
var multer = require('multer');
var waterfall = require('async').waterfall;
var fs = require('fs');
var revHash = require('rev-hash');
var cdb = require('../modules/comic-database');
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
    try {
        var page = parseInt(req.query.page);
        if (req.url.match(/^\/comic\?page=\d+$/)) {
            // valid url

            waterfall([
                function(callback) {
                    // get chapter and page
                    cdb.findComic({page: page}, (err, result) => {
                        if (err) {
                            winston.log('error', err);
                            next(err);
                        }

                        if (result.length === 0) {
                            // page doesn't exist
                            var error = new Error('Not Found');
                            error.status = 404;
                            next(error);
                        }
                        callback(null, result[0]);
                    }, next);
                },
                function(comic, callback) {
                    // render page
                    res.render('edit-page', {
                        isAdmin: req.isAdmin,
                        comic: comic,
                        retPage: page,
                        warnings: cdb.warnings
                    });
                }
            ]);
        }
        else {
            var error = new Error("Not found");
            error.status = 404;
            next(error);
        }
    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }
});

router.put('/comic', comic_upload.single('image'), function(req, res, next) {

    try {
        var data = JSON.parse(req.body.data);
        var target = req.body.target;
        var cb = function(err) {
            if (err) {
                winston.log('error', err);
                if (next) next(err);
                else throw err;
            }

            winston.info('image saved');
            res.redirect(303, req.body.ret);
        };

        if (req.file) {
            waterfall([
                function(callback) {
                    revImage(req.file.destination, req.file.filename, next, (err, newPath, newImage) => {
                        if (err) {
                            winston.log('error', err);
                            if (next) next(err);
                            else throw err;
                        }

                        data.image = newImage;

                        updateImage(newPath, 'findComic', 'updateComic', data, 'image', data.image, "/../images/chapters/", target, cb, next);

                        callback(null, data)
                    });
                },
                function(data, callback) {

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
        else {
            cdb.updateComic(target, data, cb, next);
        }
    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }
});

router.put('/', function(req, res, next) {

    try {
        var target = req.body.target;
        var key = getKey(target.split('-'));
        var data = JSON.parse(req.body.data);
        if (data.order) data.order = Number.parseInt(data.order);
        var cb = function(err) {
            if (err) {
                winston.log('error', err);
                if (next) next(err);
                else throw err;
            }

            winston.info('%s saved', key.collection);
            backURL=req.header('Referer') || '/';
            res.redirect(303, backURL);
        };

        switch(key.collection) {

            case "comic":
                cdb.updateComic(key.id, data, cb, next);
                break;

            case "character":
                cdb.updateCharacter(key.id, data, cb, next);
                break;

            case "organization":
                cdb.updateOrganization(key.id, data, cb, next);
                break;

            case "about":
                cdb.updateAbout(key.id, data, cb, next);
                break;

            case "goodArtBlog":
                cdb.updateGoodArtBlog(key.id, data, cb, next);
                break;

            case "theOtherWhiteMeat":
                cdb.updateTheOtherWhiteMeat(key.id, data, cb, next);
                break;

            default:
                var error = new Error('Non valid collection');
                error.status = 500;
                next(error);
        }
    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }
});

router.put('/image/:type', character_upload.single('image'), function(req, res, next) {

    try {
        var image = req.file.originalname;
        var target = req.body.target;
        var key = getKey(target.split('-'));
        var cb = function(err) {
            if (err) {
                winston.log('error', err);
                if (next) next(err);
                else throw err;
            }

            winston.info('image saved');
            backURL=req.header('Referer') || '/';
            res.redirect(303, backURL);
        };

        revImage(req.file.destination, image, next, (err, newPath, newImage) => {
            if (err) {
                winston.log('error', err);
                if (next) next(err);
                else throw err;
            }

            updateImage(newPath, 'findCharacter', 'updateCharacter', {icon: newImage}, 'icon', newImage, "/../images/cast/", key.id, cb, next);
        });
    }
    catch(e) {
        winston.log('error', e);
        next(e);
    }

});

function updateImage(path, getFn, updateFn, values, prop, newFile, deletePath, id, cb, next) {

    waterfall([
        function(callback) {
            // minimize image
            var s = tinify.fromFile(path);

            s.toFile(path, function(err) {
                if (err) {
                    winston.log('error', err);
                    next(err);
                }

                winston.info("Compressions this month: %d out of 500", tinify.compressionCount);

                callback(null);
            });
        },
        function(callback) {
            // get old filename
            cdb[getFn]({_id: id}, (err, result) => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, result[0][prop]);
            }, next);
        },
        function(oldFile, callback) {
            cdb[updateFn](id, values, err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, oldFile);
            }, next);
        },
        function(oldFile, callback) {
            if (oldFile === newFile) {
                // image has already been replaced
                // exit
                callback(null);
            }
            else {
                // need to delete old image
                fs.unlink(__dirname + deletePath + oldFile, err => {
                    if (err) {
                        winston.log('error', err);
                        if (next) next(err);
                        else throw err;
                    }

                    callback(null);
                });
            }
        }
    ], cb);

}

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

function getKey(targetArr) {
    return {
        collection: targetArr[0],
        property: targetArr[1],
        id: targetArr[2]
    };
}

module.exports = router;
