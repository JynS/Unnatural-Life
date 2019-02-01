var express = require('express');
var router = express.Router();
var winston = require('winston');
var passport = require('passport');


router.get('/', function(req, res, next) {

    if (req.isAdmin) {
        res.redirect('/comic/latest');
    }
    else {
        res.render('login');
    }
});

// authenticates or rejects the user
router.post('/', passport.authenticate('login', { failureFlash: true, successRedirect: '/comic/latest' }), function(req, res) {

});

// logs user out
router.get('/logout', function(req, res) {
    if (req.isAdmin) {
        req.logout();
        res.redirect('/comic/latest');
    }
    else {
        res.redirect('/admin');
    }
});

module.exports = router;
