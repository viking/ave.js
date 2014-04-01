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
        this.assertEquals('save', evt.originalEvent.type);
      },

      "registering collection with saved data": function() {
        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });
        this.backend["foos"] = '[{"id":1,"name":"foo"}]';
        this.store.register("foos", setModelClass);

        var setModel = this.store.getCollection("foos");
        this.assertEquals(1, setModel.size);
      }
    }),

    "remote": new prod.Suite('remote', {
      setUp: function() {
        this.store = new ave.Storage();
        this.store.setBackend("http://example.com");
        this.xhr = sinon.useFakeXMLHttpRequest();
        var requests = this.requests = [];
        this.xhr.onCreate = function(request) {
          requests.push(request);
        }
      },

      tearDown: function() {
        this.xhr.restore();
      },

      "adding to a registered collection": function(done) {
        if (prod.phantom) {
          // PhantomJS doesn't have full XMLHttpRequest#requestBody support
          done();
          return;
        }

        var self = this;

        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });

        this.store.register("foos", setModelClass, function() {
          var setModel = self.store.getCollection("foos");

          maria.on(self.store, 'change', done(function(evt) {
            self.assertEquals('foos', evt.collectionName);
            self.assertEquals({foo: "bar"}, evt.response);
            self.assertEquals('save', evt.originalEvent.type);
          }));

          var model = new modelClass();
          model.setName('foo');
          sinon.stub(model, 'toJSON').returns('foobar');
          setModel.add(model);
          setModel.save();

          self.assertEquals(1, self.requests.length);
          var request = self.requests[0];
          self.assertEquals("http://example.com/foos.json", request.url);
          self.assertEquals("post", request.method);
          self.assertEquals('foobar', request.requestBody.data);
          request.respond(200, {"Content-Type": "application/json"}, '{"foo":"bar"}');
        });

        this.assertEquals(1, this.requests.length);
        var request = this.requests[0];
        this.assertEquals("http://example.com/foos.json", request.url);
        this.assertEquals("get", request.method);

        this.requests.length = 0;
        request.respond(200, {"Content-Type": "application/json"}, '');
      },

      "deleting from a registered collection": function(done) {
        if (prod.phantom) {
          // PhantomJS doesn't have full XMLHttpRequest#requestBody support
          done();
          return;
        }

        var self = this;

        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });

        this.store.register("foos", setModelClass, function() {
          var setModel = self.store.getCollection("foos");

          maria.on(self.store, 'change', done(function(evt) {
            self.assertEquals('foos', evt.collectionName);
            self.assertEquals({foo: "bar"}, evt.response);
            self.assertEquals('save', evt.originalEvent.type);
          }));

          var model = setModel.toArray()[0];
          sinon.stub(model, 'toJSON').returns('foobar');
          setModel['delete'](model);
          setModel.save();

          self.assertEquals(1, self.requests.length);
          var request = self.requests[0];
          self.assertEquals("http://example.com/foos.json", request.url);
          self.assertEquals("delete", request.method);
          self.assertEquals('foobar', request.requestBody.data);
          request.respond(200, {"Content-Type": "application/json"}, '{"foo":"bar"}');
        });

        this.assertEquals(1, this.requests.length);
        var request = this.requests[0];
        this.assertEquals("http://example.com/foos.json", request.url);
        this.assertEquals("get", request.method);

        this.requests.length = 0;
        request.respond(200, { "Content-Type": "application/json" }, '[{"id":1,"name":"foo"}]');
      },

      "updating a model from a registered collection": function(done) {
        if (prod.phantom) {
          // PhantomJS doesn't have full XMLHttpRequest#requestBody support
          done();
          return;
        }

        var self = this;

        var modelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });

        this.store.register("foos", setModelClass, function() {
          var setModel = self.store.getCollection("foos");

          maria.on(self.store, 'change', done(function(evt) {
            self.assertEquals('foos', evt.collectionName);
            self.assertEquals({foo: "bar"}, evt.response);
            self.assertEquals('save', evt.originalEvent.type);
          }));

          var model = setModel.toArray()[0];
          sinon.stub(model, 'toJSON').returns('foobar');
          model.setName('bar');
          model.save();

          self.assertEquals(1, self.requests.length);
          var request = self.requests[0];
          self.assertEquals("http://example.com/foos.json", request.url);
          self.assertEquals("put", request.method);
          self.assertEquals('foobar', request.requestBody.data);
          request.respond(200, {"Content-Type": "application/json"}, '{"foo":"bar"}');
        });

        this.assertEquals(1, this.requests.length);
        var request = this.requests[0];
        this.assertEquals("http://example.com/foos.json", request.url);
        this.assertEquals("get", request.method);

        this.requests.length = 0;
        request.respond(200, { "Content-Type": "application/json" }, '[{"id":1,"name":"foo"}]');
      },

      "updating a nested model in a registered collection": function(done) {
        if (prod.phantom) {
          // PhantomJS doesn't have full XMLHttpRequest#requestBody support
          done();
          return;
        }

        var self = this;

        var subModelClass = newModelClass({
          attributeNames: ['bar']
        });
        var modelClass = newModelClass({
          attributeNames: ['foo'],
          associations: {
            bar: {type: 'hasOne', constructor: subModelClass}
          }
        });
        var setModelClass = newSetModelClass({
          modelConstructor: modelClass
        });

        this.store.register("foos", setModelClass, function() {
          var setModel = self.store.getCollection("foos");

          maria.on(self.store, 'change', done(function(evt) {
            self.assertEquals('foos', evt.collectionName);
            self.assertEquals({foo: "bar"}, evt.response);
            self.assertEquals('save', evt.originalEvent.type);
          }));

          var model = setModel.toArray()[0];
          sinon.stub(model, 'toJSON').returns('foobar');
          var subModel = model.getBar();
          subModel.setBar('blargh');
          subModel.save();

          self.assertEquals(1, self.requests.length);
          var request = self.requests[0];
          self.assertEquals("http://example.com/foos.json", request.url);
          self.assertEquals("put", request.method);
          self.assertEquals('foobar', request.requestBody.data);
          request.respond(200, {"Content-Type": "application/json"}, '{"foo":"bar"}');
        });

        this.assertEquals(1, this.requests.length);
        var request = this.requests[0];
        this.assertEquals("http://example.com/foos.json", request.url);
        this.assertEquals("get", request.method);

        this.requests.length = 0;
        request.respond(200, { "Content-Type": "application/json" },
          '[{"foo":"blah","bar":{"bar":"junk"}}]');
      },
    })
  });
});
