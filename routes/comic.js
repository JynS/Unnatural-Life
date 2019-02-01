/*jshint esversion: 6 */
var express = require('express');
var router = express.Router();

var winston = require('winston');
var waterfall = require('async').waterfall;
var series = require('async').series;
var cdb = require('../modules/comic-database');

// TODO: make a separate route for admin privileges so that I won't have to check if the admin is checked in all the time

router.get('/', function(req, res, next) {

    var page = parseInt(req.query.page);
    var userwarnings = "";
    var isAdmin = req.isAdmin;
    var showW;
    var showReset;
    var showComic;

    try {
        if (req.url.match(/^\/\?page=\d+$/)) {
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
                    if (req.cookies.userwarnings) {
                        userwarnings = req.cookies.userwarnings.split("_");
                        userwarnings.pop();
                        userwarnings = userwarnings.map(v => {
                            return parseInt(v);
                        });
                    }
                    if (isAdmin) {
                        // in admin mode
                        showW = true;
                        showComic = true;
                        showReset = false;
                    }
                    else {
                        // check if warnings need to be shown
                        showW = comic.warningKeys.length > 0 && showWarning(comic.warningKeys, userwarnings);
                        showReset = !showWarning(comic.warningKeys, userwarnings);
                        // check if comic should be shown
                        showComic = !showW;
                    }
                    callback(null, comic);
                },
                function(comic, callback) {
                    // render page
                    res.render('extends/comic-layout', {
                        isAdmin: isAdmin,
                        comic: comic,
                        showWarning: showW,
                        showReset: showReset,
                        showComic: showComic,
                        userwarnings: userwarnings,
                        warnings: cdb.warnings,
                        comics: cdb.comics
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

router.get('/first', function(req, res, next) {
    res.redirect(`/comic?page=1`);
});

router.get('/latest', function(req, res, next) {

    res.redirect(`/comic?page=${cdb.latest.page}`);
});

router.get('/archive', function(req, res, next) {
    res.render('archive', {
        isAdmin: req.isAdmin,
        comics: cdb.comics
    });
});

/**
* @param {Array} pw page warnings
* @param {Array String} uw user warnings
*/
function showWarning(pw, uw) {
    if (Array.isArray(uw)) {
        if (Number.isNaN(uw[0])) {
            // user chose to skip all warnings
            // skip warnings
            return false;
        }
        else {
            // user chose to be warned for certain triggers
            // check if their warnings appear on the page
            if (checkW(pw, uw)) {
                // user's warnings appear on the page
                // show warnings
                return true;
            }
            else {
                // user's warnings don't appear on the page
                // skip warnings
                return false;
            }
        }
    }
    else  {
        // user gave no warnings nor chose to skip them
        // show warnings
        return true;
    }
}

/**
* @param {Array} pw page warnings
* @param {Array} uw user warnings
*/
function checkW(pw, uw){
    for (var w of uw) {
        // user's warnings appear on the page
        if (pw.includes(w)) return true;
    }
    return false;
}

function showWarning(pw, uw) {
    if (Array.isArray(uw)) {
        if (Number.isNaN(uw[0])) return false;
        else {
            if (checkW(pw, uw)) return true;
            else return false;
        }
    }
    else return true;
}

module.exports = router;
