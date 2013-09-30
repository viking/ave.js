maria.Model.subclass(ave, 'Storage', {
  constructor: function() {
    maria.Model.apply(this, arguments);
    this._collections = {};
  },

  properties: {
    getBackend: function() {
      if (typeof(this._backend) == "undefined") {
        this._backend = localStorage;
      }
      return this._backend;
    },

    setBackend: function(backend) {
      this._backend = backend;
    },

    register: function(collectionName, setModelConstructor) {
      var backend = this.getBackend();
      var setModel;
      if (collectionName in backend) {
        setModel = setModelConstructor.fromJSON(backend[collectionName]);
      }
      else {
      }

      var self = this;
      maria.on(setModel, 'change', function(evt) {
        self._update(collectionName);
      });

      this._collections[collectionName] = {
        setModel: setModel,
        modelConstructor: setModelConstructor.modelConstructor
      };
    },

    getCollection: function(collectionName) {
      return this._collections[collectionName].setModel;
    },

    _update: function(collectionName) {
      var data = [];
      this._collections[collectionName].setModel.forEach(function(model) {
        data.push(model.getAttributes());
      }, this);

      var backend = this.getBackend();
      backend[collectionName] = JSON.stringify(data);

      this.dispatchEvent({type: 'change', collectionName: collectionName});
    }
  }
});
