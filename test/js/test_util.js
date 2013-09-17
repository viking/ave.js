define([
  'lib/prod',
  'lib/sinon',
  'ave'
], function(prod, sinon, ave) {
  return new prod.Suite('util', {
    "camelize": function() {
      this.assertEquals("FooBar", ave.camelize("foo_bar"));
    },

    "capitalize": function() {
      this.assertEquals("Huge", ave.capitalize("huge"));
    },

    "instantiateModel": function() {
      var modelClass = function() {};
      modelClass.prototype = {
        setId: sinon.spy(), setName: sinon.spy(),
        setProjectId: sinon.spy()
      };

      var attribs = {id: 1, name: "bar", project_id: 1};
      var model = ave.instantiateModel(modelClass, attribs);
      this.assertCalledWith(modelClass.prototype.setId, 1);
      this.assertCalledWith(modelClass.prototype.setName, "bar");
      this.assertCalledWith(modelClass.prototype.setProjectId, 1);
    },

    "numProperties": function() {
      this.assertEquals(ave.numProperties({}), 0);
      this.assertEquals(ave.numProperties({foo: 'bar'}), 1);

      var foo = function() {
        this.foo = 'bar';
      };
      var bar = function() {
        this.bar = 'baz';
      }
      bar.prototype = new foo();

      this.assertEquals(1, ave.numProperties(new bar()));
    },

    "clearProperties": function() {
      var obj = {foo: 123, bar: 456};
      ave.clearProperties(obj);
      this.assertEquals('undefined', typeof(obj.foo));
      this.assertEquals('undefined', typeof(obj.bar));
    },
  });
});
