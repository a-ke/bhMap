/*
 * @Author: a-ke
 * @Date: 2019-02-25 19:03:32
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-02-28 14:02:38
 *
 * @description: gulp配置文件
 * npm run build 运行打包
 */
const gulp = require("gulp");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");
const gutil = require('gulp-util'); // 打印日志 log
const clean = require('gulp-clean'); // 清空文件夹
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');

const produ_src = "dist"; //发布的路径

//复制js文件
gulp.task("copyjs", function() {
  return gulp.src('src/js/*.js')
    .pipe(gulp.dest(produ_src + "/js"));
});

//复制html文件
gulp.task("copyHtml", function() {
  return gulp.src('src/*.html')
    .pipe(gulp.dest(produ_src));
});

//复制font文件
gulp.task("copyFont", function() {
  return gulp.src("src/font/*")
    .pipe(gulp.dest(produ_src + "/font"));
});

//压缩js文件
gulp.task("min", function () {
  return gulp.src("src/js/*.js") //1.找到文件
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(uglify()) //2. 压缩文件
    .on('error', function(err) {
      gutil.log(gutil.colors.red('[Error]', err.toString()));
    })
    .pipe(gulp.dest(produ_src + "/js")); //3.另存压缩后的文件
});

//处理css文件
gulp.task("css", function() {
  return gulp.src("src/css/*.css")
    .pipe(autoprefixer({
      browsers: ['last 10 versions'],
      cascade: false
    }))
    .pipe(gulp.dest(produ_src + "/css"))
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(produ_src + "/css"));
});

//清空dist文件夹
gulp.task("clean", function () {
  return gulp.src(['dist/*'])
    .pipe(clean());
});

gulp.task("build", gulp.series('clean', 'copyjs', 'copyHtml', 'copyFont', 'min', 'css'));
