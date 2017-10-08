var gulp = require("gulp");
var ts = require("gulp-typescript");

gulp.task("build-compiler", function() {
    var tsProject = ts.createProject("src/tsconfig.json");
    return tsProject.src()
        .pipe(tsProject())
        .pipe(gulp.dest("./src"));
});

gulp.task("build-webapp", ["build-compiler"], function() {
    var tsProject = ts.createProject("webapp/tsconfig.json");
    return tsProject.src()
        .pipe(tsProject())
        .pipe(gulp.dest("./webapp"));
});

gulp.task("build-tests", ["build-compiler"], function() {
    var tsProject = ts.createProject("test/tsconfig.json");
    return tsProject.src()
        .pipe(tsProject())
        .pipe(gulp.dest("./test"));
});

gulp.task("copy-to-dist", function() {
    var paths = {
        pages: ["./lib/*.js", "./webapp/*.html", "./test/*.html", "./node_modules/mocha/mocha.js", "./node_modules/mocha/mocha.css", "./node_modules/chai/chai.js"]
    };
    return gulp.src(paths.pages)
        .pipe(gulp.dest("./dist"));
});

gulp.task("default", ["build-compiler", "build-webapp", "build-tests", "copy-to-dist"]);
