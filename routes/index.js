var express = require('express');
var router = express.Router();

const fs = require('fs');
const {promisify} = require('util');
const _ = require('underscore')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express',
    scripts: [
      'https://code.jquery.com/jquery-1.12.4.js',
      'https://code.jquery.com/ui/1.12.1/jquery-ui.js',
      'https://cdn.jsdelivr.net/jquery.loadingoverlay/latest/loadingoverlay.min.js',
      '/javascripts/index.js']});
});

router.get('/friends', async function(req, res, next) {
  const twitter = req.app.locals.twitter;
  const friends = [];
  var cursor = undefined;
  while (cursor != 0) {
    try {
      const response = await getFriends(twitter, cursor);
      cursor = response.next_cursor_str;
      friends.push.apply(friends, response.users);
    } catch (err) {
      res.status(503);
      res.render('error', {message: err, error: {status: 503, stack: ""}} );
      return;
    }
  }
  
  res.render('lists_members', {listId: 'friends', members: friends});
});

function getFriends(twitter, cursor) {
  return new Promise(function(resolve, reject) {
    twitter.get('friends/list', {count: 200, cursor: cursor}, function(err, data, response) {
      if (err) reject(err);
      resolve(data);
    })
  });
}

module.exports = router;
