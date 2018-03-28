var commentFactory = function (window, path) {
  var XMLHttpRequest = window.XMLHttpRequest;
  if (!XMLHttpRequest) {
    throw new Error('XMLHttpRequest is not found');
  }
  var escape = window.encodeURIComponent;
  if (!escape) {
    throw new Error('encodeURIComponent is not found');
  }

  var Promise = window.Promise;

  // format middleware path
  path = path.toString();
  if (path === '') {
    path = '/';
  }
  if (path.length > 1 && path[path.length - 1] === '/') {
    path = path.substring(0, path.length - 1); // remove trailing '/'
  }

  var _isNullOrUndefined = function (v) {
    return v === null || v === undefined;
  };

  var _isDefined = function (v) {
    return !_isNullOrUndefined(v);
  };

  var _isFunction = function (f) {
    return typeof f === 'function';
  };

  var comment = {};

  var ACTION_INSERT = 'insert';
  var ACTION_UPDATE = 'update';
  var ACTION_DELETE = 'delete';
  var ACTION_COUNT = 'count';

  var FIND_PROTO = 'find_proto';
  var FIND_ALL_PROTO = 'find_all_proto';

  var FIND_BY_ID = 'findById';
  var FIND_BY_USERNAME_AND_ASSOC = 'findByUsernameAndAssoc';
  var FIND_ROOT_BY_ASSOC = 'findRootByAssoc';

  var _err_req_username = function () {
    throw new Error('.by(username) is required');
  };

  var _err_req_body = function () {
    throw new Error('body is required');
  };

  var _err_req_postId = function () {
    throw new Error('.of(postId) is required');
  };

  var _err_req_assoc_or_parentId = function () {
    throw new Error('.on(assoc) or .to(parentId) is required');
  };

  var _err_req_assoc = function () {
    throw new Error('.on(assoc) is required');
  };

  var _check_username = function (username) {
    if (_isNullOrUndefined(username) || username === '') {
      _err_req_username();
    }
  };

  var _check_body = function (body) {
    if (_isNullOrUndefined(body)) {
      _err_req_body();
    }
  };

  var _check_postId = function (postId) {
    if (_isNullOrUndefined(postId)) {
      _err_req_postId();
    }
  };

  var _check_assoc = function (assoc) {
    if (_isNullOrUndefined(assoc)) {
      _err_req_assoc();
    }
  };

  comment.comment = function (body, opaque) {
    if (_isNullOrUndefined(body)) {
      throw new Error('body must be specified');
    }
    if (_isNullOrUndefined(opaque)) {
      opaque = null;
    }

    return new PreparedAction(ACTION_INSERT, null, null, body, null, null, opaque);
  };

  comment.reply = comment.comment;

  comment.update = function (body, opaque) {
    if (_isNullOrUndefined(body)) {
      throw new Error('body must be specified');
    }
    if (_isNullOrUndefined(opaque)) {
      opaque = null;
    }

    return new PreparedAction(ACTION_UPDATE, null, null, body, null, null, opaque);
  };

  comment.delete = function () {
    return new PreparedAction(ACTION_DELETE);
  };

  comment.find = function (isRecursive) {
    return new PreparedAction(FIND_PROTO, null, null, null, null, null, null, isRecursive || false, 1, true);
  };

  comment.findAll = function (isRecursive) {
    return new PreparedAction(FIND_ALL_PROTO, null, null, null, null, null, null, isRecursive || false, null);
  };

  comment.findRoot = function (isRecursive) {
    return new PreparedAction(FIND_ROOT_BY_ASSOC, null, null, null, null, null, null, isRecursive || false, 1, true);
  };

  comment.findRootAll = function (isRecursive) {
    return new PreparedAction(FIND_ROOT_BY_ASSOC, null, null, null, null, null, null, isRecursive || false, null);
  };

  comment.count = function() {
    return new PreparedAction(ACTION_COUNT);
  }

  var PreparedAction = function (action, postId, username, body, assoc, parentId, opaque, isRecursive, limit, onlyOne) {
    this.action = action || null;
    this.postId = postId || null;
    this.username = username || null;
    this.body = body || null;
    this.assoc = assoc || null;
    this.parentId = parentId || null;
    this.opaque = opaque || null;
    this.isRecursive = isRecursive || false;
    this.limit = limit || null;
    // this is to specify should we get the first element or not from array when submit to callback/promise
    this._onlyOne = onlyOne || false;
  };

  PreparedAction.prototype.by = function (username) {
    if (_isNullOrUndefined(username) || username === '') {
      throw new Error('username must be specified and non-empty');
    }
    this.username = username;

    switch (this.action) {
      case FIND_PROTO:
      case FIND_ALL_PROTO:
        if (this.isRecursive) {
          throw new Error('cannot do recursive search by username. See API examples.');
        }
        this.action = FIND_BY_USERNAME_AND_ASSOC;
        break;
      case FIND_BY_ID:
        console.log('WARNING: username will be ignored as .of(...) is called');
        break;
      case FIND_BY_USERNAME_AND_ASSOC:
        break;
      case FIND_ROOT_BY_ASSOC:
        console.log('WARNING: username will be ignored as we are finding root comments');
        break;
    }

    return this;
  };

  PreparedAction.prototype.of = function (postId) {
    this.postId = postId;

    switch (this.action) {
      case FIND_PROTO:
      case FIND_ALL_PROTO:
        this.action = FIND_BY_ID;
        break;
      case FIND_BY_ID:
        break;
      case FIND_BY_USERNAME_AND_ASSOC:
        console.log('WARNING: username and assoc will be ignored as .of(...) is given');
        this.action = FIND_BY_ID;
        break;
      case FIND_ROOT_BY_ASSOC:
        console.log('WARNING: username will be ignored as we are finding root comments');
        break;
    }

    return this;
  };

  PreparedAction.prototype.on = function (assoc) {
    this.assoc = assoc;

    switch (this.action) {
      case FIND_PROTO:
      case FIND_ALL_PROTO:
        if (this.isRecursive) {
          throw new Error('cannot do recursive search by assoc only. See API examples.');
        }
        this.action = FIND_BY_USERNAME_AND_ASSOC;
        break;
      case FIND_BY_ID:
        console.log('WARNING: assoc will be ignored as .of(...) is called');
        break;
      case FIND_BY_USERNAME_AND_ASSOC:
        break;
      case FIND_ROOT_BY_ASSOC:
        break;
    }

    return this;
  };

  PreparedAction.prototype.to = function (parentId) {
    this.parentId = parentId;

    switch (this.action) {
      case FIND_PROTO:
      case FIND_ALL_PROTO:
      case FIND_BY_ID:
      case FIND_BY_USERNAME_AND_ASSOC:
      case FIND_ROOT_BY_ASSOC:
        console.log('WARNING: parentId will be ignored since we are calling .find/.findAll/.findRoot');
        break;
    }

    return this;
  };

  PreparedAction.prototype.only = function(limitCount) {
    this.limit = limitCount;

    switch (this.action) {
      case FIND_PROTO:
      case FIND_ALL_PROTO:
      case FIND_BY_ID:
      case FIND_BY_USERNAME_AND_ASSOC:
      case FIND_ROOT_BY_ASSOC:
        break;
      default:
        console.log('WARNING: limit will be ignored since we are not calling .find/.findAll/.findRoot');
    }

    return this;
  };

  PreparedAction.prototype.fire = function (cb) {
    var xhr = new XMLHttpRequest();
    var self = this;

    if (this._onlyOne) {
      this.limit = 1; // enforce limit 1 for _onlyOne queries
    }

    if (_isNullOrUndefined(this.action)) {
      throw new Error('action type is required');
    }

    switch (self.action) {
      case ACTION_INSERT:
        _check_username(self.username);
        _check_body(self.body);
        break;
      case ACTION_UPDATE:
        _check_postId(self.postId);
        _check_body(self.body);
        break;
      case ACTION_DELETE:
        break;
      case FIND_PROTO:
      case FIND_ALL_PROTO:
        throw new Error('parameters required to conduct .find/.findAll operations');
        break;
      case FIND_BY_ID:
        _check_postId(self.postId);
        break;
      case FIND_BY_USERNAME_AND_ASSOC:
        if (_isNullOrUndefined(self.username) && _isNullOrUndefined(self.assoc)) {
          throw new Error('.by(username) or .on(assoc) is required');
        }
        break;
      case FIND_ROOT_BY_ASSOC:
        _check_assoc(self.assoc);
        break;
    }

    var requestMethod = 'GET';
    if ([ACTION_INSERT, ACTION_UPDATE, ACTION_DELETE].indexOf(self.action) >= 0) {
      requestMethod = 'POST';
    }

    var queryArr = [];
    Object.getOwnPropertyNames(self).forEach(function (key) {
      if (key && key[0] !== '_' && _isDefined(self[key])) { // '_' for hidden fields
        queryArr.push(escape(key) + '=' + escape(self[key]));
      }
    });
    var queryString = queryArr.join('&');

    if (requestMethod === 'POST') {
      xhr.open(requestMethod, path, true);
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    } else {
      xhr.open(requestMethod, path + '?' + queryString, true);
    }

    function xhrStart(cb) {
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (Math.floor(+xhr.status / 100) === 2) {
            var parsedJSON = JSON.parse(xhr.responseText)['response'];
            if (self._onlyOne && parsedJSON instanceof Array) {
              if (parsedJSON.length > 0) {
                cb(null, parsedJSON[0]);
              } else {
                cb(null, null);
              }
            } else {
              cb(null, parsedJSON)
            }
          } else {
            cb(new Error(xhr.responseText), null);
          }
        }
      }
      if (requestMethod === 'POST') {
        xhr.send(queryString);
      } else {
        xhr.send(null);
      }
    }

    if (typeof cb === 'function') {
      xhrStart(cb);
    } else {
      if (!Promise) {
        throw new Error('Promise required to present in scope, if no callback supplied')
      }
      return new Promise(function(resolve, reject) {
        var _cb = function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
        xhrStart(_cb);
      });
    }
  };

  return comment;
};

if (typeof module === 'object') { // for Node use (e.g. React)
  module.exports = commentFactory;
}
