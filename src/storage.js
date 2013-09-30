ave.StorageSetModelProxy = function(store, collectionName, setModel, options) {
  this._store = store;
  this._collectionName = collectionName;
  this._setModel = setModel;
  this._options = options;
}

ave.StorageSetModelProxy.prototype.getSetModel = function() {
  return this._setModel;
};

ave.StorageSetModelProxy.prototype.handleEvent = function(evt) {
  if (evt.type != "change") {
    return;
  }

  if (evt.addedTargets) {
    evt.addedTargets.map(function(model) {
      this._store.create(this._collectionName, model, this._options);
    }, this);
  }
};

ave.Storage = function() {
  this._setModelProxies = {};
};

ave.Storage.prototype.getCollection = function(name, callback) {
  var self = this;
  setTimeout(function() {
    callback(self._getCollection(name));
  }, 0);
};

ave.Storage.prototype.create = function(collectionName, model, options) {
  if (!model.isValid()) {
    if (options.failure) {
      options.failure("model is invalid");
    }
    return;
  }
  if (!model.getAttributes().id) {
    if (options.failure) {
      options.failure("model doesn't have an id");
    }
    return;
  }

  var self = this;
  setTimeout(function() {
    self._create.call(self, collectionName, model, options);
  }, 0);
};

ave.Storage.prototype.update = function(collectionName, model, options) {
  if (!model.isValid()) {
    if (options.failure) {
      options.failure("model is invalid");
    }
    return;
  }
  if (!model.getAttributes().id) {
    if (options.failure) {
      options.failure("model doesn't have an id");
    }
    return;
  }

  var self = this;
  setTimeout(function() {
    self._update.call(self, collectionName, model, options);
  }, 0);
};

ave.Storage.prototype.addSetModel = function(collectionName, setModel, options) {
  var proxy = new ave.StorageSetModelProxy(this, collectionName, setModel, options);
  maria.on(setModel, 'change', proxy);

  var proxies = this._setModelProxies[collectionName];
  if (!proxies) {
    proxies = this._setModelProxies[collectionName] = [];
  }
  proxies.push(proxy);
}

ave.Storage.prototype.removeSetModel = function(collectionName, setModel) {
  var proxies = this._setModelProxies[collectionName];
  if (proxies) {
    proxies.map(function(proxy) {
      var model = proxy.getSetModel();
      if (model === setModel) {
        maria.off(setModel, 'change', proxy);
      }
    });
  }
}

ave.Storage.prototype.findAll = function(collectionName, setModel, modelClass, options) {
  var self = this;
  setTimeout(function() {
    self._findAll.call(self, collectionName, setModel, modelClass, options);
  }, 0);
}

ave.Storage.prototype.find = function(collectionName, id, modelClass, options) {
  var self = this;
  setTimeout(function() {
    self._find.call(self, collectionName, id, modelClass, options);
  }, 0);
}

ave.Storage.prototype._create = function(collectionName, model, options) {
  var attributes = model.getAttributes();
  var self = this;
  this._find(collectionName, attributes.id, null, {
    success: function(record) {
      // record already exists
      if (options && options.failure) {
        options.failure("model id already exists");
      }
    },
    failure: function() {
      var collection = self._getCollection(collectionName),
          record = {},
          name;

      for (name in attributes) {
        record[name] = attributes[name];
      }
      collection.push(record);
      self._setCollection(collectionName, collection);

      if (options && options.success) {
        options.success();
      }
    }
  });
};

ave.Storage.prototype._update = function(collectionName, model, options) {
  var collection = this._getCollection(collectionName);

  var attributes = model.getAttributes();

  /* find existing record */
  var record;
  for (var i = 0; i < collection.length; i++) {
    if (collection[i].id == attributes.id) {
      record = collection[i];
      break;
    }
  }
  if (!record) {
    if (options && options.failure) {
      options.failure("record not found");
    }
    return;
  }

  var name;
  for (name in attributes) {
    record[name] = attributes[name];
  }
  this._setCollection(collectionName, collection);

  if (options && options.success) {
    options.success();
  }
};

ave.Storage.prototype._getCollection = function(name) {
  var collection;
  if (typeof(localStorage[name]) == 'undefined') {
    collection = [];
  }
  else {
    collection = JSON.parse(localStorage[name]);
  }
  return collection;
};

ave.Storage.prototype._setCollection = function(name, collection) {
  localStorage[name] = JSON.stringify(collection);
};

ave.Storage.prototype._findAll = function(collectionName, setModel, modelClass, options) {
  var collection = this._getCollection(collectionName);
  var models = [];
  for (var i = 0; i < collection.length; i++) {
    var ok = true;
    var record = collection[i];
    if (options.filter) {
      for (fkey in options.filter) {
        if (record[fkey] != options.filter[fkey]) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      var model = ave.instantiateModel(modelClass, record);
      models.push(model);
    }
  }
  setModel.add.apply(setModel, models);
  if (options.success) {
    options.success();
  }
};

ave.Storage.prototype._find = function(collectionName, id, modelClass, options) {
  var collection = this._getCollection(collectionName);
  var data;
  for (var i = 0; i < collection.length; i++) {
    var record = collection[i];
    if (record.id == id) {
      if (modelClass) {
        data = ave.instantiateModel(modelClass, record);
      }
      else {
        data = record;
      }
      break;
    }
  }

  if (data) {
    if (options.success) {
      options.success(data);
    }
  }
  else if (options.failure) {
    options.failure();
  }
};
