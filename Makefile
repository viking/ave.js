SOURCES = src/util.js \
	  src/route_helper.js \
	  src/validation_helper.js \
	  src/input_view.js \
	  src/model.js \
	  src/set_model.js \
	  src/storage.js \
	  src/router.js

test: ave.js
	@phantomjs scripts/test.js

ave.js: $(SOURCES)
	@/bin/echo -e "define(['lib/maria'], function(maria) {\nvar ave = {};" > $@
	@/bin/cat $(SOURCES) >> $@
	@/bin/echo -e 'return ave;\n});' >> $@

.PHONY: test
