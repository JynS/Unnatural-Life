/*jshint esversion: 6 */
var express = require('express');
var router = express.Router();
var winston = require('winston');

var cdb = require('../modules/comic-database');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.redirect('/comic/latest');
});

router.get('/characters', function(req, res, next) {

    res.render('characters', {
        isAdmin: req.isAdmin,
        cast: cdb.cast,
        organizations: cdb.organizations
    });

});

router.get('/about', function(req, res, next) {
    res.render('about', {
        isAdmin: req.isAdmin,
        about: cdb.about
    });
});

router.get('/links', function(req, res, next) {
    res.render('links', {
        isAdmin: req.isAdmin,
        goodArtBlog: cdb.goodArtBlog,
        theOtherWhiteMeat: cdb.theOtherWhiteMeat
    });
});

module.exports = router;
