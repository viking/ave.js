define([
  'lib/prod',
  'lib/sinon',
  'lib/maria',
  'ave'
], function(prod, sinon, maria, ave) {
  var Model = ave.Model;
  var SetModel = ave.SetModel;

  function newModelClass(options) {
    var namespace = {};
    var opts = {
      attributeNames: ['id', 'foo']
    };
    if (typeof(options) == 'object') {
      maria.borrow(opts, options);
    }
    Model.subclass(namespace, 'FooModel', opts);
    return namespace.FooModel;
  }

  function newSetModelClass(options) {
    var namespace = {};
    SetModel.subclass(namespace, 'FoosModel', options);
    return namespace.FoosModel;
  }

  return new prod.Suite('SetModel', {
    setUp: function() {
      this.modelClass = newModelClass();
    },

    "validates unique": function() {
      var model_1 = new this.modelClass();
      model_1.setAttribute('foo', 'bar');
      var model_2 = new this.modelClass();
      model_2.setAttribute('foo', 'baz');

      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      setModel.add(model_1);
      setModel.add(model_2);

      maria.on(model_1, 'validate', function(evt) {
        result = setModel.validatesUnique('foo', evt.target);
      });
      this.assert(model_1.isValid());
      this.assert(result);
      model_1.setAttribute('foo', 'baz');
      this.refute(model_1.isValid());
      this.refute(result);
    },

    "invalid if children are invalid": sinon.test(function() {
      var child = new this.modelClass();
      sinon.stub(child, 'isValid').returns(false);

      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      setModel.add(child);
      this.refute(setModel.isValid());

      var errors = setModel.getErrors();
      this.assertEquals('is invalid', errors['child/0'][0])
    }),

    "validatesChild is called for each child on validate": sinon.test(function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      sinon.stub(setModel, 'validatesChild');
      setModel.add(child);
      setModel.isValid();
      this.assertCalled(setModel.validatesChild, 1);
    }),

    "validate event doesn't bubble up": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child);

      var spy = sinon.spy();
      maria.on(setModel, 'validate', spy);
      child.isValid();
      this.assertCalled(spy, 0);
    },

    "sets id on add": function() {
      var child = new this.modelClass();
      sinon.stub(child, 'setId');
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child);
      this.assertCalledWith(child.setId, 1);
    },

    "sets id on multiple add": function() {
      var child_1 = new this.modelClass();
      sinon.stub(child_1, 'setId');
      var child_2 = new this.modelClass();
      sinon.stub(child_2, 'setId');

      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child_1, child_2);
      this.assertCalledWith(child_1.setId, 1);
      this.assertCalledWith(child_2.setId, 2);
    },

    "doesn't reuse id": function() {
      var child_1 = new this.modelClass();
      sinon.stub(child_1, 'setId');
      var child_2 = new this.modelClass();
      sinon.stub(child_2, 'setId');

      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child_1);
      this.assertCalledWith(child_1.setId, 1);
      setModel.delete(child_1);

      setModel.add(child_2);
      this.assertCalledWith(child_2.setId, 2);
    },

    "sets parentNode on add": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();
      setModel.add(child);
      this.assertSame(setModel, child.parentNode);
    },

    "modelConstructor property": function() {
      var setModelClass = newSetModelClass({
        modelConstructor: this.modelClass
      });
      var setModel = new setModelClass();
      this.assertSame(this.modelClass, setModel._modelConstructor);
    },

    "toJSON": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name']
      });
      var setModelClass = newSetModelClass();

      var model = new modelClass();
      model.setName('foo');
      var setModel = new setModelClass();
      setModel.add(model);

      this.assertEquals('{"models":[{"id":1,"name":"foo"}],"_nextId":2}', setModel.toJSON());
    },

    "fromJSON": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name']
      });
      var setModelClass = newSetModelClass({
        modelConstructor: modelClass
      });

      var setModel = setModelClass.fromJSON('{"models":[{"id":2,"name":"foo"}],"_nextId":3}');
      this.assertEquals(1, setModel.size);

      setModel.forEach(function(model) {
        this.assertEquals(2, model.getId());
        this.assertEquals("foo", model.getName());
      }, this);

      var model = new modelClass();
      model.setName("bar");
      setModel.add(model);
      this.assertEquals(3, model.getId());
    },

    "childAdded": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.childAdded = sinon.spy();
      setModel.add(child);
      this.assertCalledWith(setModel.childAdded, child);
    },

    "childDeleted": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child);
      setModel.childDeleted = sinon.spy();
      setModel['delete'](child);
      this.assertCalledWith(setModel.childDeleted, child);
    }
  });
});
