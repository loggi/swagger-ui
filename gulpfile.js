'use strict';

var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var es = require('event-stream');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var less = require('gulp-less');
var handlebars = require('gulp-handlebars');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var header = require('gulp-header');
var pkg = require('./package.json');
var order = require('gulp-order');
var jshint = require('gulp-jshint');
var through2 = require('through2');
var jsyaml = require('js-yaml');
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

var outputFolder = process.env.OUTPUT_PATH || ".";
var inputFolder = process.env.INPUT_PATH || ".";
var distFolder = path.join(outputFolder, ".", "dist");
var inputFile = path.join(inputFolder, process.env.INPUT_FILE || "swagger.yaml");

/**
 * Convert YAML to JSON
 */

var yamlToJSON = function(){
    return through2.obj(function (file, enc, cb) {
        var yaml = jsyaml.load(file.contents);
        var contents = JSON.stringify(yaml);
        file.contents = new Buffer(contents);
        file.path = file.path.replace(".yaml", ".json");
        cb(null, file);
    });
};

gulp.task('yaml-to-json', function() {
    if(!fs.existsSync(inputFile)){
        console.warn("No input file ['"+inputFile+"'] was found");
        return;
    }
    return gulp.src(inputFile)
        .pipe(yamlToJSON())
        .pipe(gulp.dest(distFolder));
});

/**
 * Clean ups ./dist folder
 */
gulp.task('clean', function() {
  return gulp
    .src(distFolder, {read: false})
    .pipe(clean({force: true}))
    .on('error', log);
});

/**
 * Processes Handlebars templates
 */
function templates() {
  return gulp
    .src(['./src/main/template/**/*'])
    .pipe(handlebars())
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'Handlebars.templates',
      noRedeclare: true, // Avoid duplicate declarations
    }))
    .on('error', log);
}

/**
 * JShint all *.js files
 */
gulp.task('lint', function () {
  return gulp.src('./src/main/javascript/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

/**
 * Build a distribution
 */
gulp.task('dist', ['clean','lint'], function() {

  return es.merge(
      gulp.src([
        './src/main/javascript/**/*.js',
        './node_modules/swagger-client/browser/swagger-client.js'
      ]),
      templates()
    )
    .pipe(order(['scripts.js', 'templates.js']))
    .pipe(concat('swagger-ui.js'))
    .pipe(wrap('(function(){<%= contents %>}).call(this);'))
    .pipe(header(banner, { pkg: pkg } ))
    .pipe(gulp.dest(distFolder))
    .pipe(uglify())
    .on('error', log)
    .pipe(rename({extname: '.min.js'}))
    .on('error', log)
    .pipe(gulp.dest(distFolder))
    .pipe(connect.reload());
});

/**
 * Processes less files into CSS files
 */
gulp.task('less', ['clean'], function() {

  return gulp
    .src([
      './src/main/less/screen.less',
      './src/main/less/print.less',
      './src/main/less/reset.less',
      './src/main/less/style.less'
    ])
    .pipe(less())
    .on('error', log)
    .pipe(gulp.dest('./src/main/html/css/'))
    .pipe(connect.reload());
});


/**
 * Copy lib and html folders
 */
gulp.task('copy', ['less'], function() {

  // copy JavaScript files inside lib folder
  gulp
    .src(['./lib/**/*.{js,map}'])
    .pipe(gulp.dest(path.join(distFolder, 'lib')))
    .on('error', log);

  // copy `lang` for translations
  gulp
    .src(['./lang/**/*.js'])
    .pipe(gulp.dest(path.join(distFolder, 'lang')))
    .on('error', log);

  // copy all files inside html folder
  gulp
    .src(['./src/main/html/**/*'])
    .pipe(gulp.dest(distFolder))
    .on('error', log);
});

/**
 * Watch for changes and recompile
 */
gulp.task('watch', function() {
  return watch(['./src/**/*.{js,less,handlebars}'], function() {
    gulp.start('default');
  });
});

/**
 * Live reload web server of `dist`
 */
gulp.task('connect', function() {
  connect.server({
    root: distFolder,
    livereload: true
  });
});

function log(error) {
  console.error(error.toString && error.toString());
}


gulp.task('default', ['dist', 'copy']);
gulp.task('serve', ['connect', 'watch']);
