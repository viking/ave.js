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
      setModel.add(model);

      this.assertEquals([{id:1,name:'foo'}], JSON.parse(this.backend['foos']));
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
  });
});
