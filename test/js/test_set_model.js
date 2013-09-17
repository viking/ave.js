define([
  'lib/prod',
  'lib/sinon',
  'lib/maria',
  'ave'
], function(prod, sinon, maria, ave) {
  var Model = ave.Model;
  var SetModel = ave.SetModel;

  function newModelSubclass(options) {
    var namespace = {};
    Model.subclass(namespace, 'FooModel', options);
    return namespace.FooModel;
  }

  function newSetModelSubclass(options) {
    var namespace = {};
    SetModel.subclass(namespace, 'FoosModel', options);
    return namespace.FoosModel;
  }

  return new prod.Suite('SetModel', {
    setUp: function() {
      this.modelClass = newModelSubclass();
    },

    "validates unique": function() {
      var model_1 = new this.modelClass();
      model_1.setAttribute('foo', 'bar');
      var model_2 = new this.modelClass();
      model_2.setAttribute('foo', 'baz');

      var klass = newSetModelSubclass();
      var setModel = new klass();
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

      var klass = newSetModelSubclass();
      var setModel = new klass();
      setModel.add(child);
      this.refute(setModel.isValid());

      var errors = setModel.getErrors();
      this.assertEquals('is invalid', errors['child/0'][0])
    }),

    "validatesChild is called for each child on validate": sinon.test(function() {
      var child = new this.modelClass();
      var klass = newSetModelSubclass()
      var setModel = new klass();
      sinon.stub(setModel, 'validatesChild');
      setModel.add(child);
      setModel.isValid();
      this.assertCalled(setModel.validatesChild, 1);
    })
  });
});
