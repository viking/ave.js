define([
  'lib/prod',
  'lib/sinon',
  'lib/maria',
  'model'
], function(prod, sinon, maria, Model) {
  function newSubclass(options) {
    var namespace = {};
    Model.subclass(namespace, 'FooModel', options);
    return namespace.FooModel;
  }

  return new prod.Suite('Model', {
    "setAttribute": function() {
      var klass = newSubclass();
      var model = new klass();
      model.setAttribute('foo', 123);
      this.assertEquals(model.getAttributes(), {foo: 123})
      this.assertEquals(model.getAttribute('foo'), 123)
    },

    "setAttributes": function() {
      var klass = newSubclass();
      var model = new klass();
      model.setAttributes({foo: 123, bar: 'baz'});
      this.assertEquals(model.getAttributes(), {foo: 123, bar: 'baz'})
    },

    "setAttribute triggers change event": function() {
      var klass = newSubclass();
      var model = new klass();
      var spy = sinon.spy();
      maria.on(model, "change", spy);

      model.setAttribute("foo", 123);
      this.assert(spy.calledOnce);
    },

    "setAttribute doesn't trigger change event for same value": function() {
      var klass = newSubclass();
      var model = new klass();
      model.setAttribute("foo", 123);

      var spy = sinon.spy();
      maria.on(model, "change", spy);
      model.setAttribute("foo", 123);
      this.refuteCalled(spy);
    },

    "setAttributes triggers change event once": function() {
      var klass = newSubclass();
      var model = new klass();
      var spy = sinon.spy();
      maria.on(model, "change", spy);

      model.setAttributes({foo: 123, bar: 'baz'});
      this.assertCalled(spy, 1);
    },

    "setAttributes doesn't trigger change event for same value": function() {
      var klass = newSubclass();
      var model = new klass();
      model.setAttributes({foo: 123, bar: 'baz'});

      var spy = sinon.spy();
      maria.on(model, "change", spy);
      model.setAttributes({foo: 123, bar: 'baz'});
      this.refuteCalled(spy);
    },

    "entityName": function() {
      var klass = newSubclass({
        entityName: 'foo'
      });
      this.assertEquals(klass.entityName, "foo");
    },

    "collectionName": function() {
      var klass = newSubclass({
        collectionName: 'foos'
      });
      this.assertEquals(klass.collectionName, "foos");
    },

    "subclass with hasMany association": function() {
      var setModel = sinon.spy();
      var options = {
        associations: {
          bars: {type: 'hasMany', setModel: setModel}
        }
      };
      var klass = newSubclass(options);
      this.assertEquals(klass.associations, options.associations);

      var foo = new klass();
      var bars = foo.getBars();
    },

    "subclass with hasOne association": function() {
      var modelConstructor = function() { };
      var options = {
        associations: {
          bar: {type: 'hasOne', modelConstructor: modelConstructor}
        }
      };
      var klass = newSubclass(options);
      this.assertEquals(klass.associations, options.associations);

      var foo = new klass();
      this.assertEquals(foo.getBar(), null);

      var bar = new modelConstructor();
      foo.setBar(bar);
      this.assertSame(foo.getBar(), bar);
    },

    "hasOne association requires proper class": function() {
      var modelConstructor = function() { };
      var options = {
        associations: {
          bar: {type: 'hasOne', modelConstructor: modelConstructor}
        }
      };
      var klass = newSubclass(options);
      this.assertEquals(klass.associations, options.associations);

      var foo = new klass();
      this.assertEquals(foo.getBar(), null);

      var obj = new (function() {})();
      this.assertException(function() {
        foo.setBar(obj);
      });
    },

    "attribute names": function() {
      var klass = newSubclass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new klass();
      this.assertEquals(model.getAttributes(), {id: null, name: null, project_id: null});
    },

    "set invalid attribute": function() {
      var klass = newSubclass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new klass();
      this.assertException(function() {
        model.setAttribute('foo', 123);
      });
    },

    "get invalid attribute": function() {
      var klass = newSubclass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new klass();
      this.assertException(function() {
        model.getAttribute('foo');
      });
    },

    "attribute helpers": function() {
      var klass = newSubclass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new klass();
      model.setId(123);
      this.assertEquals(model.getId(), 123);
      model.setName('foo');
      this.assertEquals(model.getName(), 'foo');
      model.setProjectId(456);
      this.assertEquals(model.getProjectId(), 456);
    },

    "validate presence": function() {
      var result;
      var klass = newSubclass({
        properties: {
          validate: function() {
            result = this.validatesPresence('foo');
          }
        }
      });
      var model = new klass();
      this.refute(model.isValid());
      this.refute(result);
      this.assertEquals(model.getErrors(), {foo: ['is required']});
      model.setAttribute('foo', 123);
      this.assert(model.isValid());
      this.assert(result);
    },

    "validate presence rejects empty string": function() {
      var result;
      var klass = newSubclass({
        properties: {
          validate: function() {
            result = this.validatesPresence('foo');
          }
        }
      });
      var model = new klass();
      model.setAttribute('foo', '');
      this.refute(model.isValid());
      this.refute(result);
      this.assertEquals(model.getErrors(), {foo: ['is required']});
      model.setAttribute('foo', 123);
      this.assert(model.isValid());
      this.assert(result);
    },

    "validate type": function() {
      var result;
      var klass = newSubclass({
        properties: {
          validate: function() {
            result = this.validatesType('foo', 'number');
          }
        }
      });
      var model = new klass();
      model.setAttribute('foo', 'bar');
      this.refute(model.isValid());
      this.refute(result);
      model.setAttribute('foo', 123);
      this.assert(model.isValid());
      this.assert(result);
    },

    "dispatch validate event": function() {
      var klass = newSubclass();
      var model = new klass();
      maria.on(model, 'validate', function(evt) {
        var m = evt.target;
        m.addError('foo');
      });
      this.refute(model.isValid());
    },

    "validates unique": function() {
      var result;
      var klass = newSubclass();
      var model_1 = new klass();
      model_1.setAttribute('foo', 'bar');
      var model_2 = new klass();
      model_2.setAttribute('foo', 'baz');
      var setModel = new maria.SetModel();
      setModel.add(model_1);
      setModel.add(model_2);
      maria.on(model_1, 'validate', function(evt) {
        result = evt.target.validatesUnique('foo', setModel);
      });
      this.assert(model_1.isValid());
      this.assert(result);
      model_1.setAttribute('foo', 'baz');
      this.refute(model_1.isValid());
      this.refute(result);
    },

    "validates format": function() {
      var result;
      var klass = newSubclass({
        properties: {
          validate: function() {
            result = this.validatesFormat('foo', /^\w+$/);
          }
        }
      });
      var model = new klass();
      model.setAttribute('foo', 'bar baz');
      this.refute(model.isValid());
      this.refute(result);
      model.setAttribute('foo', 'bar');
      this.assert(model.isValid());
      this.assert(result);
      model.setAttribute('foo', null);
      this.assert(model.isValid());
      this.assert(result);
      model.setAttribute('foo', 123);
      this.assert(model.isValid());
      this.assert(result);
    }
  });
});
