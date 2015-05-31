(function() {
    var editor = {
        source: createEditor('sourceEditor', 'text', '', false),
        schema: createEditor('schemaEditor', 'javascript', '{}', false),
        mappings: createEditor('mappingsEditor', 'json', '{}', false),
        output: createEditor('outputEditor', 'json', '', true)
    };

    var ui = {
        body: $('body'),
        status: $('#status'),
        xpath: $('#xpath'),
        xpathExamples: $('#xpathExamples'),
        examples: $('#examples'),
        selectOne: $('#selectOne'),
        selectAll: $('#selectAll'),
        count: $('#count'),
        format: $('#format')
    };

    function createEditor(id, mode, value, isReadOnly) {
        var editor = ace.edit(id);
        editor.setTheme('ace/theme/monokai');
        editor.getSession().setMode('ace/mode/' + mode);
        editor.setShowPrintMargin(false);
        editor.setValue(value, -1);
        editor.setReadOnly(isReadOnly);
        return editor;
    }

    function formatEditor(id) {
        var obj, source = editor[id].getValue().replace(/^\s+|\s+$/g, '');
        if (source.length === 0) {
            return;
        }
        eval('obj = ' + source);
        source = JSON.stringify(obj, null, 4);
        editor[id].setValue(source, -1);
    }

    function getEditorValue(id, textOnly) {
        var obj = null, source = editor[id].getValue().replace(/^\s+|\s+$/g, '');
        if (source.length === 0) {
            return null;
        }
        if (textOnly) {
            return source;
        }
        eval('obj = ' + source);
        return obj;
    }

    var examples = {
        'Basic': {
            xpath: [
                'count(//*)',
                '@title',
                '//children/*[1]/@foo',
                '//children/*[1]/@boolTrue',
                '//children/*[1]/@boolFalse',
                'count(//@foo)',
                '//@foo[2]',
                'count(//children//*)',
                '//children/*[2]',
                'name(//children/*[2])',
                'name(*/*[2])',
                '*/children/*[2]/text()',
                '//@foo',
                '//*[match(name(), "child|data", "i")]',
                '//ch',
                '//children',
                '//any'
            ],
            source: '{"title":"abc","children":[{"foo":"bar","boolTrue":true,"boolFalse":false},"val"],"subData":{"foo":555,"foo2":"bar2"}}',
            mappings: '{"ch|child":"children", "any":"children|subData"}',
            json: true
        }
    };

    function loadExample(name) {
        var example = examples[name];

        if (!example) {
            return;
        }

        var menu = ui.xpathExamples.find('.dropdown-menu');
        menu.empty();
        example.xpath.forEach(function(xpathInfo) {
            var xpath = xpathInfo, comment;
            if (xpathInfo instanceof Array) {
                xpath = xpathInfo[0];
                comment = xpathInfo[1];
            }
            var li = $('<li><a href="#">' + xpath + '</a>' + (comment ? '<span class="label label-default">' + comment + '</span>' : '') + '</li>');
            menu.append(li);
        });

        var source = example.source;
        if (example.json) {
            source = JSON.stringify(JSON.parse(source), null, 4);
        }
        editor.source.setValue(source, -1);

        var schema = example.schema;
        if (schema) {
            schema = JSON.stringify(JSON.parse(schema), null, 4);
            editor.schema.setValue(schema, -1);
        } else {
            editor.schema.setValue('', -1);
        }

        var mappings = example.mappings;
        if (mappings) {
            mappings = JSON.stringify(JSON.parse(mappings), null, 4);
            editor.mappings.setValue(mappings, -1);
        } else {
            editor.mappings.setValue('', -1);
        }
    }

    $('.dropdown-toggle').dropdown();

    ui.xpath.on('keyup', function(e) {
        if (e.keyCode === 13) {
            select();
            e.preventDefault();
        }
    });

    ui.xpathExamples.find('.dropdown-menu').on('click', 'a', function(e) {
        var value = $(e.target).text();
        ui.xpath.val(value);
        e.preventDefault();
    });

    ui.examples.find('.dropdown-menu a').on('click', function(e) {
        var value = $(e.target).text();
        loadExample(value);
        e.preventDefault();
    });

    ui.selectOne.on('click', function() {
        select(false);
    });

    ui.selectAll.on('click', function() {
        select(true);
    });

    ui.status.on('click', function() {
        ui.status.html('&nbsp;').attr('class', 'label label-default');
    });

    ui.format.on('click', function() {
        try {
            formatEditor('source');
        } catch (e) {
            setStatus('Source parse error: ' + e.toString(), 'danger');
        }
    });

    function setStatus(text, cssClass) {
        ui.status.html(text).attr('class', 'label label-' + cssClass);
    }

    function trim(str) {
        return str.replace(/^\s+/, '').replace(/\s$/, '');
    }

    function select(selectAll) {
        // collect and test values
        var xpath = ui.xpath.val();
        if (xpath.length === 0) {
            setStatus('XPath cannot be empty', 'danger');
            return;
        }

        var source, schema, mappings;
        try {
            source = getEditorValue('source');
            schema = getEditorValue('schema');
            mappings = getEditorValue('mappings');
        } catch (e) {
            setStatus('Parse error: ' + e.toString(), 'danger');
        }

        if (!source) {
            return;
        }

        // apply jsel
        var dom = jsel(source);

        if (schema) {
            dom.schema(schema);
        }

        if (mappings) {
            dom.map(mappings);
        }
        var results;
        try {
            if (selectAll) {
                results = dom.selectAll(xpath);
                var len = typeof results.length === 'undefined' ? 0 : results.length;
                ui.count.text('Count: ' + len);
                setStatus('Query returned ' + len + ' result' + (len !== 1 ? 's' : ''), 'success');
            } else {
                results = dom.select(xpath);
                ui.count.text('Count: 1');
                setStatus('Query returned 1 result', 'success');
            }
            var output = JSON.stringify(results, null, 4);
            editor.output.setValue(output, -1);
        } catch (e) {
            setStatus(e.toString(), 'danger');
            console.error(e);
        }
    }

    window.onerror = function(msg, url, line, col) {
        setStatus('Uncaught Error - ' + msg + ' (check console)', 'danger');
    };

    // load initial example
    loadExample('Basic');
})();