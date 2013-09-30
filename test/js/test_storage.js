define([
  'lib/prod',
  'ave'
], function(prod, ave) {
  function newSetModelClass(options) {
    var namespace = {};
    ave.SetModel.subclass(namespace, 'FoosModel', options);
    return namespace.FoosModel;
  }

  function newModelClass(options) {
    var namespace = {};
    ave.Model.subclass(namespace, 'FooModel', options);
    return namespace.FooModel;
  }

  return new prod.Suite('Storage', {
    setUp: function() {
      localStorage.clear();
      this.store = new ave.Storage();
    },

    "create": function(done) {
      var obj = {
        data: {id: 1, foo: 'bar'},
        isValid: function() { return true; },
        getAttributes: function() { return(this.data); }
      };

      this.store.create('stuff', obj, {
        success: done(function() {
          this.assertEquals([{id:1,foo:"bar"}], JSON.parse(localStorage['stuff']))
        }),
        failure: done(function(message) {
          this.assert(false, message);
        })
      });
    },

    "prevent create without id": function(done) {
      var obj = {
        data: {foo: 'bar'},
        isValid: function() { return true; },
        getAttributes: function() { return(this.data); }
      };

      this.store.create('stuff', obj, {
        success: done(function() {
          this.assert(false, "record shouldn't have been created");
        }),
        failure: done(function(message) {
          this.assertEquals("model doesn't have an id", message);
        })
      });
    },

    "create with existing id": function(done) {
      var obj = {
        data: {id: 1, foo: 'bar'},
        isValid: function() { return true; },
        getAttributes: function() { return(this.data); }
      };

      var self = this;
      this.store.create('stuff', obj, {
        success: function() {
          self.assertEquals(JSON.parse(localStorage['stuff']), [{id:1,foo:"bar"}])

          self.store.create('stuff', obj, {
            failure: done(function(message) {
              self.assertEquals(message, "model id already exists");
            })
          });
        },
        failure: done(function(message) {
          self.assert(false, message);
        })
      });
    },

    "getCollection": function(done) {
      var obj = {
        data: {id: 1, foo: 'bar'},
        isValid: function() { return true; },
        getAttributes: function() { return(this.data); }
      };
      var self = this;
      this.store.create('stuff', obj, {
        success: function() {
          self.store.getCollection('stuff', done(function(data) {
            this.assertEquals([{id:1,foo:"bar"}], data)
          }))
        }
      });
    },

    "update": function(done) {
      var obj = {
        data: {id: 1, foo: 'bar'},
        isValid: function() { return true; },
        getAttributes: function() { return(this.data); }
      };

      var self = this;
      this.store.create('stuff', obj, {
        success: function() {
          obj.data.foo = "baz";
          self.store.update('stuff', obj, {
            success: done(function() {
              this.assertEquals(
                [{id:1,foo:"baz"}],
                JSON.parse(localStorage['stuff'])
              );
            })
          });
        }
      });
    },

    "update with bad record id": function(done) {
      var obj = {
        getAttributes: function() { return({id: 1, foo: "bar"}); },
        isValid: function() { return true; }
      };

      this.store.update('stuff', obj, {
        failure: done(function(message) {
          this.assertEquals("record not found", message);
        })
      });
    },

    "update with no record id": function(done) {
      var obj = {
        getAttributes: function() { return({foo: "bar"}); },
        isValid: function() { return true; }
      };

      this.store.update('stuff', obj, {
        failure: done(function(message) {
          this.assertEquals("model doesn't have an id", message);
        })
      });
    },

    "reacting to set model new records": function(done) {
      var setClass = newSetModelClass();
      var setModel = new setClass();
      this.store.addSetModel('foos', setModel, {
        success: done(function() {
          this.assertEquals([{id:1,name:"foo"}], JSON.parse(localStorage['foos']))
        })
      });

      var modelClass = newModelClass({ attributeNames: ['id', 'name'] });
      var model = new modelClass();
      model.setName('foo');
      setModel.add(model);
    },

    "stop reacting to set model changes": function(done) {
      localStorage['foos'] = '[{"id":1,"name":"foo"}]';

      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      this.store.addSetModel('foos', setModel);
      this.store.removeSetModel('foos', setModel);

      var modelClass = newModelClass({ attributeNames: ['id', 'name'] });
      var model = new modelClass();
      model.setName('foo');
      setModel.add(model);

      var self = this;
      setTimeout(function() {
        self.assertEquals(localStorage['foos'], '[{"id":1,"name":"foo"}]');
        done();
      }, 100);
    },

    "findAll adds models to set model": function(done) {
      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      var modelClass = newModelClass({ attributeNames: ['id', 'name'] });
      localStorage['foos'] = '[{"id":1,"name":"foo"}]';
      this.store.findAll('foos', setModel, modelClass, {
        success: done(function() {
          this.assertEquals(1, setModel.size);
        })
      });
    },

    "findAll camelizes attributes": function(done) {
      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      localStorage['foos'] = '[{"id":1,"name":"foo","foo_bar":"baz"}]';

      var modelClass = newModelClass({ attributeNames: ['id', 'name', 'foo_bar'] });
      var self = this;
      this.store.findAll('foos', setModel, modelClass, {
        success: done(function() {
          setModel.forEach(function(model) {
            self.assertEquals(model.getFooBar(), "baz");
          });
        })
      });
    },

    "findAll with filter": function(done) {
      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      var modelClass = newModelClass({ attributeNames: ['id', 'name'] });
      localStorage['forms'] = '[{"id":1,"name":"foo"},{"id":2,"name":"foo"},{"id":3,"name":"baz"}]';
      this.store.findAll('forms', setModel, modelClass, {
        filter: {name: "foo"},
        success: done(function() {
          this.assertEquals(2, setModel.size);
        })
      });
    },

    "find with id": function(done) {
      var modelClass = newModelClass({ attributeNames: ['id', 'name'] });
      localStorage['foos'] = '[{"id":1,"name":"foo"},{"id":2,"name":"bar"}]';
      this.store.find('foos', 1, modelClass, {
        success: done(function(model) {
          this.assertEquals(1, model.getId());
          this.assertEquals('foo', model.getName());
        })
      });
    },

    "prevent create when object is not valid": function(done) {
      var obj = {
        data: {id: 1, foo: 'bar'},
        isValid: function() { return false; },
        getAttributes: function() { return(this.data); }
      };

      this.store.create('stuff', obj, {
        success: done(function() {
          this.assert(false, "model should not have been created");
        }),
        failure: done(function(message) {
          this.assertEquals("model is invalid", message);
        })
      });
    },

    "prevent update when object is not valid": function(done) {
      var obj = {
        data: {id: 1, foo: 'bar'},
        isValid: function() { return false; },
        getAttributes: function() { return(this.data); }
      };

      this.store.update('stuff', obj, {
        success: done(function() {
          this.assert(false, "model should not have been updated");
        }),
        failure: done(function(message) {
          this.assertEquals("model is invalid", message);
        })
      });
    }
  });
});
