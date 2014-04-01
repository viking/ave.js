maria.Model.subclass(ave, 'Storage', {
  constructor: function() {
    maria.Model.apply(this, arguments);
    this._collections = {};
  },

  properties: {
    getBackend: function() {
      if (typeof(this._backend) == "undefined") {
        this.setBackend(localStorage);
      }
      return this._backend;
    },

    setBackend: function(backend) {
      this._backend = backend;
      if (typeof(backend) == "object") {
        this._mode = "local";
      }
      else if (typeof(backend) == "string") {
        this._mode = "remote";
      }
    },

    getMode: function() {
      return this._mode;
    },

    register: function(collectionName, setModelConstructor, callback) {
      var backend = this.getBackend();
      var mode = this.getMode();

      if (mode == "local") {
        var setModel;

        if (collectionName in backend) {
          setModel = setModelConstructor.fromJSON(backend[collectionName]);
        }
        else {
          setModel = new setModelConstructor();
        }

        this._register(collectionName, setModelConstructor, setModel);
      }
      else if (mode == "remote") {
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState != 4)
            return;

          var setModel;
          if (xhr.responseText != '') {
            setModel = setModelConstructor.fromJSON(xhr.responseText);
          }
          else {
            setModel = new setModelConstructor();
          }
          self._register(collectionName, setModelConstructor, setModel);
          callback();
        };
        xhr.open("get", backend + "/" + collectionName + ".json");
        xhr.send();
      }
    },

    getCollection: function(collectionName) {
      return this._collections[collectionName].setModel;
    },

    _register: function(collectionName, setModelConstructor, setModel) {
      var self = this;
      maria.on(setModel, 'save', function(evt) {
        self._update(evt, collectionName);
      });

      this._collections[collectionName] = {
        setModel: setModel,
        modelConstructor: setModelConstructor.modelConstructor
      };
    },

    _update: function(evt, collectionName) {
      var backend = this.getBackend();
      var mode = this.getMode();
      var collection = this._collections[collectionName];
      var baseEvent = {type: 'change', collectionName: collectionName, originalEvent: evt};

      if (mode == "local") {
        var data = collection.setModel.toJSON();
        backend[collectionName] = data;
        this.dispatchEvent(baseEvent);
      }
      else if (mode == "remote") {
        var url = backend + "/" + collectionName + ".json";
        var self = this;

        if (evt.target === collection.setModel) {
          evt.addedTargets.forEach(function(target) {
            var xhr = new XMLHttpRequest();
            self._setupXHR(xhr, target, baseEvent);
            xhr.open("post", url);
            var data = target.toJSON();
            xhr.send(new Blob([data]));
          });

          evt.deletedTargets.forEach(function(target) {
            var xhr = new XMLHttpRequest();
            self._setupXHR(xhr, target, baseEvent);
            xhr.open("delete", url);
            var data = target.toJSON();
            xhr.send(new Blob([data]));
          });
        }
        else {
          var target = evt.target;
          while (target) {
            if (collection.setModel.has(target)) {
              var xhr = new XMLHttpRequest();
              self._setupXHR(xhr, target, baseEvent);
              xhr.open("put", url);
              var data = target.toJSON();
              xhr.send(new Blob([data]));
              break;
            }
            target = target.parentNode;
          }
        }
      }
    },

    _setupXHR: function(xhr, target, baseEvent) {
      var self = this;
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4)
          return;

        var event = {
          response: JSON.parse(xhr.responseText),
          collectionMember: target
        };
        maria.borrow(event, baseEvent);
        self.dispatchEvent(event);
      };
    }
  }
});
