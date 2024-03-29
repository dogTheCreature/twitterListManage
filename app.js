const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const fs = require('fs');
const Twit = require('twit');

const indexRouter = require('./routes/index');
const listsRouter = require('./routes/lists');
const RateLimit = require('express-rate-limit');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

var limiter = new RateLimit({
  windowMs: 1*60*1000, // 1 minute
  max: 50
});
app.use(limiter);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/lists', listsRouter);

const tokens = JSON.parse(fs.readFileSync('data/tokens.json'));
app.locals.twitter = new Twit(tokens);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
