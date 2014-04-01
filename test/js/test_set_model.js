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
      attributeNames: ['foo']
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

    "toSortedArray does nothing by default": function() {
      var modelClass = newModelClass({
        attributeNames: ['name']
      });
      var setModelClass = newSetModelClass({
        modelConstructor: modelClass
      });
      var setModel = new setModelClass();

      var model_1 = new modelClass();
      model_1.setName('foo');
      setModel.add(model_1);

      var model_2 = new modelClass();
      model_2.setName('bar');
      setModel.add(model_2);

      var expected = setModel.toArray();
      this.assertEquals(expected, setModel.toSortedArray());
    },

    "toJSON": function() {
      var modelClass = newModelClass({
        attributeNames: ['name']
      });
      var setModelClass = newSetModelClass();

      var model = new modelClass();
      model.setName('foo');
      var setModel = new setModelClass();
      setModel.add(model);

      this.assertEquals('[{"name":"foo"}]', setModel.toJSON());
    },

    "toJSON uses sorted array": function() {
      var modelClass = newModelClass({
        attributeNames: ['name']
      });
      var setModelClass = newSetModelClass({
        properties: {
          toSortedArray: function() {
            return this.toArray().sort(function(a, b) {
              var name_1 = a.getName();
              var name_2 = b.getName();
              if (name_1 < name_2) {
                return -1;
              }
              if (name_1 > name_2) {
                return 1;
              }
              return 0;
            });
          }
        }
      });
      var setModel = new setModelClass();

      var model_1 = new modelClass();
      model_1.setName('foo');
      setModel.add(model_1);

      var model_2 = new modelClass();
      model_2.setName('bar');
      setModel.add(model_2);

      this.assertEquals('[{"name":"bar"},{"name":"foo"}]', setModel.toJSON());
    },

    "toJSON propagates arguments": function() {
      var setModelClass = newSetModelClass();
      var setModel = new setModelClass();

      sinon.stub(setModel, 'dump').returns('foo');
      this.assertEquals('"foo"', setModel.toJSON('blah'));
      this.assertCalledWith(setModel.dump, 'blah');
    },

    "fromJSON": function() {
      var modelClass = newModelClass({
        attributeNames: ['name']
      });
      var setModelClass = newSetModelClass({
        modelConstructor: modelClass
      });

      var setModel = setModelClass.fromJSON('[{"name":"foo"}]');
      this.assertEquals(1, setModel.size);

      setModel.forEach(function(model) {
        this.assertEquals("foo", model.getName());
      }, this);
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
    },

    "childChanged": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child);
      setModel.childChanged = sinon.spy();
      child.setAttribute('foo', 'bar');
      this.assertCalled(setModel.childChanged);

      var evt = setModel.childChanged.getCall(0).args[0];
      this.assertSame(child, evt.target);
    },

    "destroying child": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child);

      var spy = sinon.spy();
      maria.on(setModel, 'change', spy);
      child.destroy();

      this.assertEquals(0, setModel.size);
      this.assertCalled(spy);
    },

    "dump propagates arguments to children": function() {
      var child = new this.modelClass();
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      setModel.add(child);

      sinon.stub(child, 'dump');
      setModel.dump('foo');
      this.assertCalledWith(child.dump, 'foo');
    },

    "save": function() {
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      var spy = sinon.spy();
      maria.on(setModel, 'save', spy);
      setModel.save();
      this.assertCalled(spy);
    },

    "save keeps track of added elements since last save": function() {
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      var model = new this.modelClass();
      setModel.add(model);

      var spy = sinon.spy();
      maria.on(setModel, 'save', spy);
      setModel.save();

      this.assertCalled(spy);
      var evt = spy.getCall(0).args[0];
      this.assertEquals([model], evt.addedTargets);
    },

    "save keeps track of deleted elements since last save": function() {
      var setModelClass = newSetModelClass()
      var setModel = new setModelClass();
      var model = new this.modelClass();
      setModel.add(model);
      setModel.save();
      setModel['delete'](model);

      var spy = sinon.spy();
      maria.on(setModel, 'save', spy);
      setModel.save();

      this.assertCalled(spy);
      var evt = spy.getCall(0).args[0];
      this.assertEquals([model], evt.deletedTargets);
    }
  });
});
