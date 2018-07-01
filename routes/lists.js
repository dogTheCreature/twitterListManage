const express = require('express');
const router = express.Router();

const fs = require('fs');
const {promisify} = require('util');
const _ = require('underscore');

router.get('/list', async function(req, res, next) {
  const twitter = req.app.locals.twitter;
  const cachePath = 'cache/lists.json';

  if (req.query.force && fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  } 

  const lists = await getLists(twitter);
  res.render('lists', {lists: lists});
});

// 表示更新
router.get('/members/update/:listId', function(req, res, next) {
  const listId = req.params.listId;
  const cachePath = 'cache/members/' + listId + '.json';
  // キャッシュが既にあったら一度削除
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
  res.status(303);
  // メンバー取得処理にリダイレクト
  res.redirect(req.baseUrl + '/members/' + listId);
});

/* GET home page. */
router.get('/members/:listId', async function(req, res, next) {
  const twitter = req.app.locals.twitter;

  const listId = req.params.listId;

  var members;
  const cachePath = 'cache/members/' + listId + '.json';
  if (fs.existsSync(cachePath)) {
    members = JSON.parse(fs.readFileSync(cachePath));
  } else {
    try {
      members = await getAllMembers(twitter, listId);
    } catch (err) {
      res.status(503);
      res.render('error', {message: err, error: {status: 503, stack: ""}} );
      return;
    }

    if (!_.isEmpty(members)) fs.writeFileSync(cachePath, JSON.stringify(members, null, '  '));
  }

  res.render('lists_members', {listId: listId, members: members});
});

// ユーザ登録
router.post('/members/create_all', async function(req, res, next) {
  const twitter = req.app.locals.twitter;
  const ids = req.body.ids;
  const strIds = ids.join(',');

  // TODO 100個超えケア
  try {
    twitter.post('lists/members/create_all', {
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

// ユーザ登録解除
router.post('/members/destroy_all', async function(req, res, next) {
  const twitter = req.app.locals.twitter;
  const ids = req.body.ids;
  const strIds = ids.join(',');

  try {
    twitter.post('lists/members/destroy_all', {
      list_id: req.body.listId,
      user_id: strIds
    }, function(err, data, response) {
      console.debug(data);
      res.status(200);
      res.send();
    });
  } catch(err) {
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
function getMembers(twitter, options) {
    const listId = options.listId;
    const cursor = options.cursor;

    // console.log('listID: ' + listId);
    return new Promise(function(resolve, reject) {
      twitter.get('lists/members', {list_id: listId, cursor: cursor}, function(err, data, response) {
        if (err) reject(err);
        resolve(data);
      });
    }).then(function(response) {
      return response;
    });
}

// TODO どっか別のファイルにまとめる
function getLists(twitter, disableCache) {
  let userName;
  if (!disableCache && fs.existsSync('cache/lists.json')) {
    const readFile = promisify(fs.readFile);
    return readFile('cache/lists.json').then(function(json) {
      return JSON.parse(json);
    });
  } else {
    return new Promise(function(resolve, reject) {
      twitter.get('account/settings', function(err, data, response) {
        if (err) reject(err);
        resolve(data); 
      });
    }).then(function(user) {
      userName = user.screen_name;
      console.log('Account\n' + JSON.stringify(user, null, '  '));
      return new Promise(function(resolve, reject) {
        twitter.get('lists/list', {screen_name: user.screen_name}, function(err, data, response) {
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
