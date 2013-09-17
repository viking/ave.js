SOURCES = src/util.js \
	  src/input_view.js \
	  src/model.js \
	  src/route_helper.js \
	  src/router.js

ave.js: $(SOURCES)
	@/bin/echo -e "define(['lib/maria'], function(maria) {\nvar ave = {};" > $@
	@/bin/cat $(SOURCES) >> $@
	@/bin/echo -e 'return ave;\n});' >> $@

test: ave.js
	@phantomjs scripts/test.js

.PHONY: test
