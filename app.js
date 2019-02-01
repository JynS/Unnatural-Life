/*jshint esversion: 6 */
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var winston = require('winston');
var passport = require('passport');
var session = require('express-session');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require("bcrypt-nodejs");
var mongoose = require('mongoose');
var flash = require('connect-flash');
var memwatch = require('memwatch-next');

var routes = require('./routes/index');
var comic = require('./routes/comic');
var admin = require('./routes/admin');
var update = require('./routes/update');
var newC = require('./routes/new');
var deleteC = require('./routes/delete');

var cdb = require('./modules/comic-database');
var Comics = require('./schema/comicSchema');

var User = require("./schema/userSchema");
var RSSFeed = require('./schema/rssSchema');

var app = express();
app.disable("x-powered-by");

// ---------- memory leak finder ---------- \\
memwatch.on('leak', function(info) {
    winston.info(info);
});

// ---------- authentication ---------- \\

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use('login', new LocalStrategy({
    passReqToCallback : true
},
function(req, username, password, done) {
    // check in mongo if a user with username exists or not
    User.findOne({ 'username' :  username },
    function(err, user) {
        // In case of any error, return using the done method
        if (err)
        return done(err);
        // Username does not exist, log error & redirect back
        if (!user){
            console.log('User Not Found with username '+username);
            return done(null, false,
                flash('message', 'User Not found.'));
            }
            // User exists but wrong password, log the error
            if (!isValidPassword(user, password)){
                console.log('Invalid Password');
                return done(null, false,
                    flash('message', 'Invalid Password'));
                }
                // User and password both match, return user from
                // done method which will be treated like success
                return done(null, user);
            }
        );
    })
);

var isValidPassword = function(user, password){
    return bcrypt.compareSync(password, user.password);
};

var createHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
};

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.

passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {

    User.findById(id, function(err, user) {
        cb(err, user);
    });

});

// ---------- routing, view engine, and middleware ---------- \\

// view engine setup
// NOTE: might make nginx take over
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('keyboard cat', {
    cookie: {
        httpOnly: true,
        secure: true
    }
}));
app.use(session({secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

function isAdmin(req, res, next) {
    if (req.user) {
        User.findById(req.user, (err, user) => {
            if (err) {
                winston.log('error', err);
                next(err);
            }

            if (user) req.isAdmin = true;
            else req.isAdmin = false;

            next();
        });
    }
    else {
        req.isAdmin = false;
        next();
    }

}

function canEdit(req, res, next) {
    if (req.isAdmin) {
        next();
    }
    else {
        var error = new Error("Not Authorized");
        error.status = 403;
        next(error);
    }
}
var opt = {
    user: "main-user",
    pass: process.env.MONGO_PASSWORD,
    auth: {
        authdb: 'user-data'
    },
    config: { autoIndex: false }
};

mongoose.connect("localhost", "unnaturallife", "27017", opt);

cdb.init();

// Comics.update({page: 16}, {prevPage: 15}, err => {
//   if (err) {
//     console.log(err);
//     throw err;
//   }
//   console.log("success");
//   Comics.find({page: 16}).exec((err, pg) => {
//   	if (err) {
//   		console.log('error', err);
//   		if (next) next(err);
//   		else throw err;
//   	}
//     console.log(pg);
//   });
// });

app.use('/', isAdmin, routes);
app.use('/comic', isAdmin, comic);
app.use('/admin', isAdmin, admin);
app.use('/update', isAdmin, canEdit, update);
app.use('/new', isAdmin, canEdit, newC);
app.use('/delete', isAdmin, canEdit, deleteC);
// app.use('/rss.xml', rss);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// ---------- error handlers ---------- \\

// cofigure winston
winston.cli();
winston.configure({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: true,
            handleExceptions: true,
            prettyPrint: true
        })
    ]
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        var status = err.status || 500;
        res.status(status);
        res.render('error', {
            message: err.message,
            error: err,
            isDev: true,
            status: status,
            isAdmin: req.isAdmin
        });
        winston.log('error','%s, pid=%d', err.stack, process.pid);
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    var status = err.status || 500;
    res.status(status);
    res.render('error', {
        message: err.message,
        error: {},
        isDev: false,
        status: status,
        isAdmin: req.isAdmin
    });
    winston.log('error','%s, pid=%d', err.stack, process.pid);
});


module.exports = app;
