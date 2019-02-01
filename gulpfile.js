var gulp = require('gulp');
var del = require('del');
var concat = require('gulp-concat');
var prefix = require('gulp-autoprefixer');
var mincss = require('gulp-clean-css');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var compass = require('gulp-compass');
var livereload = require('gulp-livereload');
var assetRev = require('gulp-rev');


// gulp.task('default', ['watch']);

gulp.task('build', [
    'clean',
    'css:pro',
    'scripts:pro'
]);

// clean .tmp and dist directories
gulp.task('clean', function() {

    return del([
        'dist/js/vendor/*.js',
        'dist/js/*.js',
        'dist/styles/vendor/*.css',
        'dist/styles/*.css'
    ]);
});

// production scripts tasks
gulp.task('scripts:pro vendor', function() {

    return gulp.src('public/js/vendor/trumbowyg.min.js')
        .pipe(concat('trumbowyg.min.js'))
        .pipe(babel({presets: ['es2015']}))
        .pipe(uglify())
        .pipe(assetRev())
        .pipe(gulp.dest('dist/js/vendor/'));
});
gulp.task('scripts:pro app', function() {

    return gulp.src('public/js/app.js')
        .pipe(concat('app.js'))
        .pipe(babel({presets: ['es2015']}))
        .pipe(uglify())
        .pipe(assetRev())
        .pipe(gulp.dest('dist/js/'));
});
gulp.task('scripts:pro admin', function() {

    return gulp.src('public/js/admin.js')
        .pipe(concat('admin.js'))
        .pipe(babel({presets: ['es2015']}))
        .pipe(uglify())
        .pipe(assetRev())
        .pipe(gulp.dest('dist/js/'));
});
gulp.task('scripts:pro', [
    'scripts:pro vendor',
    'scripts:pro admin',
    'scripts:pro app'
]);

// development scripts tasks
gulp.task('scripts:dev', function() {

    return gulp.src('public/js/*.js')
        .pipe(livereload());
});

// production css tasks
gulp.task('css:pro vendor', function() {

    return gulp.src('public/styles/vendor/trumbowyg.min.css')
        .pipe(concat('trumbowyg.min.css'))
        .pipe(assetRev())
        .pipe(gulp.dest('dist/styles/vendor/'));
});

gulp.task('css:pro style', function() {

    return gulp.src('public/styles/*.scss')
        .pipe(compass({
            css: 'dist/styles',
            sass: 'public/styles'
        }))
        .pipe(prefix({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(mincss({compatibility: 'ie8'}))
        .pipe(assetRev())
        .pipe(gulp.dest('dist/styles/'));
});

gulp.task('css:pro', [
    'css:pro vendor',
    'css:pro style'
]);

// development css tasks
gulp.task('css:dev', function() {

    return gulp.src('public/styles/*.scss')
        .pipe(compass({
            css: 'public/styles',
            sass: 'public/styles'
        }))
        .pipe(livereload());
});

// livereload
gulp.task('watch:dev', function () {

    livereload.listen();
    gulp.watch('public/styles/*.scss', ['css:dev']);
    // gulp.watch('public/js/*.js', ['scripts:dev']);
});
