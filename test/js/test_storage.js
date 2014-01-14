define([
  'lib/prod',
  'lib/sinon',
  'lib/maria',
  'ave'
], function(prod, sinon, maria, ave) {
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
    "local": new prod.Suite('local', {
      setUp: function() {
        this.backend = {};
        this.store = new ave.Storage();
        this.store.setBackend(this.backend);
      },

      "adding to an registered collection": function() {
        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });

        this.store.register("foos", setModelClass);
        var setModel = this.store.getCollection("foos");

        var spy = sinon.spy();
        maria.on(this.store, 'change', spy);

        var model = new modelClass();
        model.setName('foo');
        sinon.stub(setModel, 'toJSON').returns('foobar');
        setModel.add(model);
        setModel.save();

        this.assertEquals('foobar', this.backend['foos']);
        this.assertCalled(spy);

        var evt = spy.getCall(0).args[0];
        this.assertEquals('foos', evt.collectionName);
      },

      "registering collection with saved data": function() {
        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });
        this.backend["foos"] = '{"models":[{"id":1,"name":"foo"}],"_nextId":2}';
        this.store.register("foos", setModelClass);

        var setModel = this.store.getCollection("foos");
        this.assertEquals(1, setModel.size);
      }
    }),

    "remote": new prod.Suite('remote', {
      setUp: function() {
        this.store = new ave.Storage();
        this.store.setBackend("http://example.com");
        this.server = sinon.fakeServer.create();
      },

      tearDown: function() {
        this.server.restore();
      },

      "adding to an registered collection": function(done) {
        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });

        this.server.respondWith("GET", "http://example.com/foos.json",
          [ 200, { "Content-Type": "application/json" }, '' ]
        );
        var self = this;
        this.store.register("foos", setModelClass, function() {
          var setModel = self.store.getCollection("foos");

          var called = false;
          self.server.respondWith("POST", "http://example.com/foos.json", function(request) {
            called = true;
            request.respond(200, {}, "");
          });
          maria.on(self.store, 'change', done(function(evt) {
            self.assert(called);
            self.assertEquals('foos', evt.collectionName);
          }));

          var model = new modelClass();
          model.setName('foo');
          sinon.stub(setModel, 'toJSON').returns('foobar');
          setModel.add(model);
          setModel.save();
        });
        this.server.respond();
      },

      /*
      "registering collection with saved data": function() {
        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });
        this.backend["foos"] = '{"models":[{"id":1,"name":"foo"}],"_nextId":2}';
        this.store.register("foos", setModelClass);

        var setModel = this.store.getCollection("foos");
        this.assertEquals(1, setModel.size);
      }
      */
    })
  });
});
