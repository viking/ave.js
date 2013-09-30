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
    Model.subclass(namespace, 'FooModel', options);
    return namespace.FooModel;
  }

  function newSetModelClass(options) {
    var namespace = {};
    SetModel.subclass(namespace, 'FoosModel', options);
    return namespace.FoosModel;
  }

  return new prod.Suite('Model', {
    "setAttribute": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      model.setAttribute('foo', 123);
      this.assertEquals(model.getAttributes(), {foo: 123})
      this.assertEquals(model.getAttribute('foo'), 123)
    },

    "setAttributes": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      model.setAttributes({foo: 123, bar: 'baz'});
      this.assertEquals(model.getAttributes(), {foo: 123, bar: 'baz'})
    },

    "setAttribute triggers change event": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      var spy = sinon.spy();
      maria.on(model, "change", spy);

      model.setAttribute("foo", 123);
      this.assert(spy.calledOnce);
    },

    "setAttribute doesn't trigger change event for same value": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      model.setAttribute("foo", 123);

      var spy = sinon.spy();
      maria.on(model, "change", spy);
      model.setAttribute("foo", 123);
      this.refuteCalled(spy);
    },

    "setAttribute doesn't trigger change event for same equal value": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      model.setAttribute("foo", [123]);

      var spy = sinon.spy();
      maria.on(model, "change", spy);
      model.setAttribute("foo", [123]);
      this.refuteCalled(spy);
    },

    "setAttributes triggers change event once": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      var spy = sinon.spy();
      maria.on(model, "change", spy);

      model.setAttributes({foo: 123, bar: 'baz'});
      this.assertCalled(spy, 1);
    },

    "setAttributes doesn't trigger change event for same value": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      model.setAttributes({foo: 123, bar: 'baz'});

      var spy = sinon.spy();
      maria.on(model, "change", spy);
      model.setAttributes({foo: 123, bar: 'baz'});
      this.refuteCalled(spy);
    },

    "entityName": function() {
      var modelClass = newModelClass({
        entityName: 'foo'
      });
      this.assertEquals(modelClass.entityName, "foo");
    },

    "collectionName": function() {
      var modelClass = newModelClass({
        collectionName: 'foos'
      });
      this.assertEquals(modelClass.collectionName, "foos");
    },

    "subclass with hasMany association": new prod.Suite('subclass with hasMany association', {
      setUp: function() {
        this.subModelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        this.setModelClass = newSetModelClass({
          modelConstructor: this.subModelClass
        });

        this.options = {
          attributeNames: ['id', 'name'],
          associations: {
            bars: {type: 'hasMany', constructor: this.setModelClass}
          }
        };
        this.modelClass = newModelClass(this.options);
      },

      "association getter": function() {
        var foo = new this.modelClass();
        var bars = foo.getBars();
        this.assertSame(bars, foo.getBars());
      },

      "validate association": function() {
        var foo = new this.modelClass();
        var bars = foo.getBars();
        sinon.stub(bars, 'isValid').returns(false);
        this.refute(foo.isValid(), 'expected foo to be invalid');

        var errors = foo.getErrors();
        this.assertEquals('is invalid', errors['bars'][0], 'wrong error message');
      },

      "parent node": function() {
        var foo = new this.modelClass();
        var bars = foo.getBars();
        this.assertSame(foo, bars.parentNode);
      },

      // integration test
      "json round trip": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        var bars = foo.getBars();
        var bar = new this.subModelClass();
        bar.setName("bar");
        bars.add(bar);

        var foo2 = this.modelClass.fromJSON(foo.toJSON());
        this.assertEquals(1, foo2.getId());
        this.assertEquals("foo", foo2.getName());
        var bars2 = foo2.getBars();
        this.assertEquals(1, bars2.size);
      },

      "event bubbling": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        var bars = foo.getBars();
        var bar = new this.subModelClass();
        bar.setName("bar");

        var spy = sinon.spy();
        maria.on(foo, 'change', spy);
        bars.add(bar);
        this.assertCalled(spy);
      },
    }),

    "subclass with hasOne association": new prod.Suite('subclass with hasOne association', {
      setUp: function() {
        this.subModelClass = newModelClass({
          attributeNames: ['id', 'name']
        });
        this.options = {
          attributeNames: ['id', 'name'],
          associations: {
            bar: {type: 'hasOne', constructor: this.subModelClass}
          }
        };
        this.modelClass = newModelClass(this.options);
      },

      "association accessors": function() {
        var foo = new this.modelClass();
        this.assertEquals(foo.getBar(), null);

        var bar = new this.subModelClass();
        foo.setBar(bar);
        this.assertSame(foo.getBar(), bar);
      },

      "setter requires proper class": function() {
        var foo = new this.modelClass();

        var obj = new (function() {})();
        this.assertException(function() {
          foo.setBar(obj);
        });
      },

      "validate association": sinon.test(function() {
        var foo = new this.modelClass();
        var bar = new this.subModelClass();
        foo.setBar(bar);
        sinon.stub(bar, 'isValid').returns(false);
        this.refute(foo.isValid(), 'expected foo to be invalid');

        var errors = foo.getErrors();
        this.assertEquals('is invalid', errors['bar'][0]);
      }),

      // integration test
      "json round trip": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        var bar = new this.subModelClass();
        bar.setName("bar");
        foo.setBar(bar);

        var foo2 = this.modelClass.fromJSON(foo.toJSON());
        this.assertEquals(1, foo2.getId());
        this.assertEquals("foo", foo2.getName());
        var bar2 = foo2.getBar();
        this.assertEquals("bar", bar2.getName());
      },

      "event bubbling": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        var bar = new this.subModelClass();
        bar.setName("bar");
        foo.setBar(bar);

        var spy = sinon.spy();
        maria.on(foo, 'change', spy);
        bar.setName("baz");
        this.assertCalled(spy);
      },

      "no event bubbling for replaced child": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        var bar = new this.subModelClass();
        bar.setName("bar");
        foo.setBar(bar);
        var bar2 = new this.subModelClass();
        bar2.setName("baz");
        foo.setBar(bar2);

        var spy = sinon.spy();
        maria.on(foo, 'change', spy);
        bar.setName("junk");
        this.assertCalled(spy, 0);
      },

      "using setter triggers change event": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        var bar = new this.subModelClass();
        bar.setName("bar");

        var spy = sinon.spy();
        maria.on(foo, 'change', spy);
        foo.setBar(bar);
        this.assertCalled(spy);
      },

      "don't flip out during validation if associated value is null": function() {
        var foo = new this.modelClass();
        foo.setId(1);
        foo.setName("foo");
        this.assert(foo.isValid());
      }
    }),

    "attribute names": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new modelClass();
      this.assertEquals(model.getAttributes(), {id: null, name: null, project_id: null});
    },

    "set invalid attribute": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new modelClass();
      this.assertException(function() {
        model.setAttribute('foo', 123);
      });
    },

    "get invalid attribute": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new modelClass();
      this.assertException(function() {
        model.getAttribute('foo');
      });
    },

    "attribute helpers": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name', 'project_id']
      });
      var model = new modelClass();
      model.setId(123);
      this.assertEquals(model.getId(), 123);
      model.setName('foo');
      this.assertEquals(model.getName(), 'foo');
      model.setProjectId(456);
      this.assertEquals(model.getProjectId(), 456);
    },

    "validate presence": function() {
      var result;
      var modelClass = newModelClass({
        properties: {
          validate: function() {
            result = this.validatesPresence('foo');
          }
        }
      });
      var model = new modelClass();
      this.refute(model.isValid());
      this.refute(result);
      this.assertEquals(model.getErrors(), {foo: ['is required']});
      model.setAttribute('foo', 123);
      this.assert(model.isValid());
      this.assert(result);
    },

    "validate presence rejects empty string": function() {
      var result;
      var modelClass = newModelClass({
        properties: {
          validate: function() {
            result = this.validatesPresence('foo');
          }
        }
      });
      var model = new modelClass();
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
      var modelClass = newModelClass({
        properties: {
          validate: function() {
            result = this.validatesType('foo', 'number');
          }
        }
      });
      var model = new modelClass();
      model.setAttribute('foo', 'bar');
      this.refute(model.isValid());
      this.refute(result);
      model.setAttribute('foo', 123);
      this.assert(model.isValid());
      this.assert(result);
    },

    "dispatch validate event": function() {
      var modelClass = newModelClass();
      var model = new modelClass();
      maria.on(model, 'validate', function(evt) {
        var m = evt.target;
        m.addError('foo');
      });
      this.refute(model.isValid());
    },

    "validates format": function() {
      var result;
      var modelClass = newModelClass({
        properties: {
          validate: function() {
            result = this.validatesFormat('foo', /^\w+$/);
          }
        }
      });
      var model = new modelClass();
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
    },

    "toJSON": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name']
      });
      var model = new modelClass();
      model.setId(1);
      model.setName('foo');
      this.assertEquals('{"id":1,"name":"foo"}', model.toJSON());
    },

    "fromJSON": function() {
      var modelClass = newModelClass({
        attributeNames: ['id', 'name']
      });
      var model = modelClass.fromJSON('{"id":1,"name":"foo"}');
      this.assertEquals(1, model.getId());
      this.assertEquals('foo', model.getName());
    }
  });
});
