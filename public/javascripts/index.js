// TODO アカウント情報とかリスト情報とかクライアント側に持ってないと取り回しが不便すぎる
$(document).ready(function() {
  $.LoadingOverlay('show', {zIndex: 100});

  // リストを取得して表示
  $.ajax('/lists/list?force=true', {
    type: 'GET',
    contentType: 'text/html',
  }).done(function(html) {
    $('#lists_placeholder').replaceWith(html);
    $('button#getFriends').click(getFriends);

    $('table#lists button.button_get_members').click(function(event) {
      const $button = $(event.target); // リスト一覧の中のボタン
      getMembers($button);
    });
    $.LoadingOverlay('hide');
  }).fail(function() {
    $('#initialize_error_dialog').dialog({
      modal: true,
      buttons: {
        Ok: function() {
          $(this).dialog('close');
          $.LoadingOverlay('hide');
        }
      }
    });
  });
});

function getFriends() {
  $.LoadingOverlay('show', {zIndex: 100});
  const $target = $('table#lists');
  $.ajax('/friends/', {
    type: 'GET',
    contentType: 'text/html'
  }).done(function(html) {
    const $appended = $(html);
    $('#div_lists').after($appended);

    // $target.after(html);
    // const $appended = $target.next();
    // TODO 後から見出しをつけ足しているのがアホくさい
    const $heading = $('<h2>');
    $heading.text('フォロー中');
    $appended.prepend($heading);
    setupSelection($appended, 'friends');
    updateButtonState('friends');
  }).fail(function(jqXHR, textStatus, errorThrown) {
    alert('フォロー一覧を取得できませんでした。' + errorThrown);
    $target.after($('<pre>').text(JSON.stringify(jqXHR, null, '  ')));
  }).always(function() {
    $.LoadingOverlay('hide');
  });
}

function getMembers($button) {
  const id = $button.attr('data-id');
  return new Promise(function(resolve, reject) {
    const $target = $('table#lists');
    $.ajax('/lists/members/' + id, {
      type: 'GET',
      contentType: 'text/html'
    }).done(function(html) {
      const $appended = $(html);
      $('#div_lists').after($appended);
      
      const $heading = $('<h2>');
      $heading.text($button.closest('tr').find('.list_name').text());
      $appended.prepend($heading);
      setupSelection($appended, id);
      updateButtonState(id);
    }).fail(function(jqXHR, textStatus, errorThrown) {
      alert('アカウント一覧を取得できませんでした。' + errorThrown);
      reject($target.after($('<pre>').text(JSON.stringify(jqXHR, null, '  '))));
    });
  });
}

function setupSelection($appended, id) {
  const $listTable = $('table#lists').find('tbody');
  const $select = $appended.find('select');
  $listTable.find('tr').each(function (i, tr) {
    const $tr = $(tr);
    const listId = $tr.find('button').attr('data-id');
    if (id == listId)
      return;
    const listName = $tr.find('td.list_name').text();
    const $option = $('<option>');
    $option.attr('value', listId);
    $option.text(listName);
    $select.append($option);
  });
}

function checkRow(event) {
  const $target = $(event.target);
  if ($target.is('input[type="checkbox"]')) return;
  const $tr = $target.is('tr') ? $target : $target.closest('tr');
  const userId = $tr.attr('data-id');
  const $checkBox = $tr.find('input[name=' + userId + ']');
  $checkBox.prop('checked', !$checkBox.prop('checked'));
  updateButtonState($target.closest('table').attr('data-id'));
}

function updateMembers(listId) {
  const $target = $('div#div_' + listId);
  const listName = $target.find('h2').text();
  $target.LoadingOverlay("show", {zIndex: 100});

  $.ajax('/lists/members/update/' + listId, {
    type: 'GET',
    contentType: 'text/html'
  }).done(function(html) {
    $target.replaceWith(html);
    const $replaced = $('div#div_' + listId);
    const $heading = $('<h2>');
    $heading.text(listName);
    $replaced.prepend($heading);
    setupSelection(replaced, listId);
    updateButtonState(listId);
  }).fail(function(jqXHR, textStatus, errorThrown) {
    alert('アカウント一覧を取得できませんでした。' + errorThrown);
    $('table#lists').after($('<pre>').text(JSON.stringify(jqXHR, null, '  ')));
  }).always(function() {
    $target.LoadingOverlay("hide");
  });
}

function updateButtonState(listId) {
  const $listBox = $('#div_' + listId);
  const anyMemberChecked = $listBox.find('input:checked')[0];
  const destinationSelected = $listBox.find('option:selected').text() != '-- Select --';

  $listBox.find('.button_register_members').prop('disabled', !(anyMemberChecked && destinationSelected));
  $listBox.find('.button_move_members').prop('disabled', !(anyMemberChecked && destinationSelected));
  $listBox.find('.button_remove_members').prop('disabled', !(anyMemberChecked));
}

function registerMembers(fromListId) {
  $.LoadingOverlay('show', {zIndex: 100});
  // チェック済みのメンバーを集める
  const ids = [];
  const $div = $('div#div_' + fromListId);
  const toListId = $div.find('option:selected').val();

  $div.find('input:checked').each(function(i, checkbox) {
    ids.push($(checkbox).attr('name'));
  });
  $.ajax('/lists/members/create_all/', {
    type: 'POST',
    data: {
      ids: ids,
      toListId: toListId
    }
  }).done(function(html) {
    $('#register_complete_dialog').dialog({
      modal: true,
      buttons: {
        OK: function() {
          $(this).dialog('close');
          $.LoadingOverlay('hide');
        }
      }
    });
  }).fail(function(jqXHR, textStatus, errorThrown) {
    alert('リストの登録に失敗しました。' + errorThrown);
    $target.after($('<pre>').text(JSON.stringify(jqXHR, null, '  ')));
    $.LoadingOverlay('hide');
  });
}