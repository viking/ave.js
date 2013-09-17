define([
  'lib/prod',
  'lib/maria',
  'input_view'
], function(prod, maria, InputView) {
  function newSubclass(options) {
    var namespace = {};
    InputView.subclass(namespace, 'FooInputView', options);
    return namespace.FooInputView;
  }

  return new prod.Suite('InputView', {
    setUp: function() {
      this.klass = newSubclass({
        template: '<div>' +
            '<input name="foo"/>' +
            '<input name="bar"/>' +
            '<input name="blargh" type="hidden" value="foo" />' +
            '<select name="baz">' +
              '<option>qux</option>' +
              '<option>corge</option>' +
            '</select>' +
            '<textarea name="grault"></textarea>' +
            '<input class="submit" type="submit" value="Go"/>' +
            '<input class="button" type="button" value="Stop"/>' +
          '</div>'
      });
      this.view = new this.klass();
    },

    "get values": function() {
      var inputs = this.view.findAll('input');
      inputs[0].value = 'foo';
      inputs[1].value = 'bar';
      inputs[2].value = 'stuff';
      this.view.find('select').selectedIndex = 1;
      this.view.find('textarea').value = "stuff goes here";
      this.assertEquals(this.view.getValues(), {
        foo: 'foo', bar: 'bar', blargh: 'stuff', baz: 'corge',
        grault: 'stuff goes here'
      });
    },

    "get values with invalid selectedIndex": function() {
      this.view.find('select').selectedIndex = 5;
      var values = this.view.getValues();
      this.assertEquals(values.baz, null);
    },

    "reset": function() {
      var inputs = this.view.findAll('input');
      inputs[0].value = 'foo';
      var select = this.view.find('select');
      select.selectedIndex = 1;
      var textarea = this.view.find('textarea');
      textarea.value = 'junk';

      this.view.reset();
      this.assertEquals(inputs[0].value, '');
      this.assertEquals(inputs[2].value, 'foo');
      this.assertEquals(select.selectedIndex, 0);
      this.assertEquals(textarea.value, '');
      this.assertEquals(this.view.find('input.submit').value, "Go");
      this.assertEquals(this.view.find('input.button').value, "Stop");
    },

    "save values for resets": function() {
      var input = this.view.find('input');
      input.value = 'foo';
      this.view.saveValues();
      this.view.reset();
      this.assertEquals(input.value, 'foo');
    },

    "reset clears errors": function() {
      this.view.displayErrors({foo: ['error 1'], baz: ['error 2'], grault: ['error 3']});
      this.view.reset();
      this.refute(this.view.find('.error'));
    },

    "display errors": function() {
      this.view.displayErrors({foo: ['error 1'], baz: ['error 2'], grault: ['error 3']});
      this.assertEquals(this.view.find('input').getAttribute('class'), 'error');
      this.assertEquals(this.view.find('select').getAttribute('class'), 'error');
      this.assertEquals(this.view.find('textarea').getAttribute('class'), 'error');
    },

    "don't double add error class": function() {
      this.view.displayErrors({foo: ['error 1'], baz: ['error 2'], grault: ['error 3']});
      this.view.displayErrors({foo: ['error 1'], baz: ['error 2'], grault: ['error 3']});
      this.assertEquals(this.view.find('input').getAttribute('class'), 'error');
      this.assertEquals(this.view.find('select').getAttribute('class'), 'error');
      this.assertEquals(this.view.find('textarea').getAttribute('class'), 'error');
    },
  });
});
