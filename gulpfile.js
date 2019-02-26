/*
 * @Author: a-ke
 * @Date: 2019-02-25 19:03:32
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-02-26 10:59:52
 *
 * @description: gulp配置文件
 * npm run build 运行打包
 */
const gulp = require("gulp");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");
const gutil = require('gulp-util'); // 打印日志 log
const clean = require('gulp-clean'); // 清空文件夹

const produ_src = "dist"; //发布的路径

//复制js文件
gulp.task("copyjs", function() {
  return gulp.src('src/js/*.js')
    .pipe(gulp.dest(produ_src + "/js"));
});

//赋值html文件
gulp.task("copyHtml", function() {
  return gulp.src('src/*.html')
    .pipe(gulp.dest(produ_src));
});

//压缩js文件
gulp.task("min", function () {
  return gulp.src("src/js/*.js") //1.找到文件
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(uglify()) //2. 压缩文件
    .on('error', gutil.log)
    .pipe(gulp.dest(produ_src + "/js")); //3.另存压缩后的文件
});

//清空dist文件夹
gulp.task("clean", function () {
  return gulp.src(['dist/*'])
    .pipe(clean());
});

gulp.task("build", gulp.series('clean', 'copyjs', 'copyHtml', 'min'));
