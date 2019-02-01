/*jshint esversion: 6 */
var express = require('express');
var router = express.Router();
var winston = require('winston');
var waterfall = require('async').waterfall;
var fs = require('fs');

var cdb = require('../modules/comic-database');

/* GET home page. */
router.delete('/', function(req, res, next) {

    try {
        var target = req.body.target;
        var key = getKey(target.split('-'));
        var cb = function(err) {
            if (err) {
                winston.log('error', err);
                if (next) next(err);
                else throw err;
            }

            winston.info('%s deleted', key.collection);

            if (key.collection === "comic") {
                res.redirect(303, "/comic/latest");
            }
            else {
                backURL=req.header('Referer') || '/';
                res.redirect(303, backURL);
            }
        };

        switch(key.collection) {

            case 'character':
                deleteImage('findCharacter', 'deleteCharacter', 'icon', '/../images/cast/', key.id, cb, next);
                break;

            case 'organization':
                cdb.deleteOrganization(key.id, cb, next);
                break;

            case 'comic':
                deleteImage('findComic', 'deleteComic', 'image', '/../images/chapters/', key.id, cb, next);
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

function deleteImage(getFn, deleteFn, prop, deletePath, id, cb, next) {

    waterfall([
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
            cdb[deleteFn]({_id: id}, err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null, oldFile);
            }, next);
        },
        function(oldFile, callback) {
            // delete image
            fs.unlink(__dirname + deletePath + oldFile, err => {
                if (err) {
                    winston.log('error', err);
                    if (next) next(err);
                    else throw err;
                }

                callback(null);
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
