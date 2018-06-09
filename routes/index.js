var express = require('express');
var router = express.Router();

const fs = require('fs');
const {promisify} = require('util');
const _ = require('underscore')

/* GET home page. */
router.get('/', function(req, res, next) {
  const client = req.app.locals.client;
  res.render('index', {
    title: 'Express',
    scripts: [
      'https://code.jquery.com/jquery-1.12.4.js',
      'https://code.jquery.com/ui/1.12.1/jquery-ui.js',
      'https://cdn.jsdelivr.net/jquery.loadingoverlay/latest/loadingoverlay.min.js',
      '/javascripts/index.js']});
});

router.get('/friends', async function(req, res, next) {
  const client = req.app.locals.client;
  const friends = [];
  var cursor = undefined;
  while (cursor != 0) {
    try {
      const response = await getFriends(client, cursor);
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

function getFriends(client, cursor) {
  return new Promise(function(resolve, reject) {
    client.get('friends/list', {count: 200, cursor: cursor}, function(err, data, response) {
      if (err) reject(err);
      resolve(data);
    })
  });
}

// TODO どっか別のファイルにまとめる
function getLists(client, disableCache) {
  let userName;
  if (!disableCache && fs.existsSync('cache/lists.json')) {
    const readFile = promisify(fs.readFile);
    return readFile('cache/lists.json').then(function(json) {
      return JSON.parse(json);
    });
  } else {
    return new Promise(function(resolve, reject) {
      client.get('account/settings', function(err, data, response) {
        if (err) reject(err);
        resolve(data); 
      });
    }).then(function(user) {
      userName = user.screen_name;
      console.log('Account\n' + JSON.stringify(user, null, '  '));
      return new Promise(function(resolve, reject) {
        client.get('lists/list', {screen_name: user.screen_name}, function(err, data, response) {
          if (err) throw reject(err);
          resolve(data);
        });
      });
    }).then(function(lists) {
      const sorted = _.chain(lists).filter(function(elem) {
        return elem.user.screen_name == userName;
      }).map(function(elem) {
        return _.pick(elem, 'id_str', 'name', 'description', 'member_count', 'user');
      }).value().sort(function(a, b) {
        if (a < b) {
          return -1;
        } else if (a == b) {
          return 0;
        } else {
          return 1;
        }
      });
      console.log('lists\n' + JSON.stringify(sorted, null, '  '));
      if (!_.isEmpty(sorted)) {
        fs.writeFileSync('cache/lists.json', JSON.stringify(sorted, null, '  '));
      }
      return sorted;
    });
  }
}

module.exports = router;
