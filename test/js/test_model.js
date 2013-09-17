define([
  'lib/prod',
  'lib/sinon',
  'lib/maria',
  'ave'
], function(prod, sinon, maria, ave) {
  var Model = ave.Model;

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

    "setAttribute doesn't trigger change event for same equal value": function() {
      var klass = newSubclass();
      var model = new klass();
      model.setAttribute("foo", [123]);

      var spy = sinon.spy();
      maria.on(model, "change", spy);
      model.setAttribute("foo", [123]);
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

    "subclass with hasMany association": new prod.Suite('subclass with hasMany association', {
      setUp: function() {
        this.setModel = sinon.spy();
        this.options = {
          associations: {
            bars: {type: 'hasMany', setModel: this.setModel}
          }
        };
        this.klass = newSubclass(this.options);
      },

      "association getter": function() {
        var foo = new this.klass();
        var bars = foo.getBars();
        this.assertSame(bars, foo.getBars());
      },

      "validate association": sinon.test(function() {
        var foo = new this.klass();
        var bars = foo.getBars();
        bars.isValid = sinon.stub().returns(false);
        this.refute(foo.isValid(), 'expected foo to be invalid');
      })
    }),

    "subclass with hasOne association": new prod.Suite('subclass with hasOne association', {
      setUp: function() {
        this.modelConstructor = function() { };
        this.options = {
          associations: {
            bar: {type: 'hasOne', modelConstructor: this.modelConstructor}
          }
        };
        this.klass = newSubclass(this.options);
      },

      "association accessors": function() {
        var foo = new this.klass();
        this.assertEquals(foo.getBar(), null);

        var bar = new this.modelConstructor();
        foo.setBar(bar);
        this.assertSame(foo.getBar(), bar);
      },

      "setter requires proper class": function() {
        var foo = new this.klass();

        var obj = new (function() {})();
        this.assertException(function() {
          foo.setBar(obj);
        });
      },
    }),

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
