const express = require('express');
const router = express.Router();

const fs = require('fs');
const {promisify} = require('util');
const _ = require('underscore');

router.get('/list', async function(req, res, next) {
  const client = req.app.locals.client;
  const cachePath = 'cache/lists.json';

  if (req.query.force && fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  } 

  const lists = await getLists(client);
  res.render('lists', {lists: lists});
});

router.get('/members/update/:listId', function(req, res, next) {
  const listId = req.params.listId;
  const cachePath = 'cache/members/' + listId + '.json';
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
  res.status(303);
  res.redirect(req.baseUrl + '/members/' + listId);
});

/* GET home page. */
router.get('/members/:listId', async function(req, res, next) {
  const client = req.app.locals.client;

  const listId = req.params.listId;

  var members;
  const cachePath = 'cache/members/' + listId + '.json';
  if (fs.existsSync(cachePath)) {
    members = JSON.parse(fs.readFileSync(cachePath));
  } else {
    try {
      members = await getAllMembers(client, listId);
    } catch (err) {
      res.status(503);
      res.render('error', {message: err, error: {status: 503, stack: ""}} );
      return;
    }

    if (!_.isEmpty(members)) fs.writeFileSync(cachePath, JSON.stringify(members, null, '  '));
  }

  res.render('lists_members', {listId: listId, members: members});
});

router.post('/members/create_all', async function(req, res, next) {
  const client = req.app.locals.client;
  const ids = req.body.ids;
  const strIds = ids.join(',');

  // TODO 100個超えケア
  try {
    client.post('lists/members/create_all', {
      list_id: req.body.toListId,
      user_id: strIds
    }, function(err, data, response) {
      res.status(200);
      res.send();
    });
  } catch (err) {
    res.status(503);
    res.send(err);
  }
});

async function getAllMembers(client, listId) {
  const members = [];
  var nextCursor = undefined;
  while(nextCursor != 0) {
    let response = await getMembers(client, {listId: listId, cursor: nextCursor});

    nextCursor = response.next_cursor_str;
    members.push.apply(members, response.users);
  }

  return members;
}

// TODO どっかに移動
function getMembers(client, options) {
    const listId = options.listId;
    const cursor = options.cursor;

    // console.log('listID: ' + listId);
    return new Promise(function(resolve, reject) {
      client.get('lists/members', {list_id: listId, cursor: cursor}, function(err, data, response) {
        if (err) reject(err);
        resolve(data);
      });
    }).then(function(response) {
      return response;
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
