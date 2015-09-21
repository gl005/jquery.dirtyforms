/*!
CkEditor helper module (for jQuery Dirty Forms) | v2.0.0-beta00004 | github.com/snikch/jquery.dirtyforms
(c) 2012-2015 Mal Curtis
License MIT
*/

// Support for UMD: https://github.com/umdjs/umd/blob/master/jqueryPluginCommonjs.js
// This allows for tools such as Browserify to compose the components together into a single HTTP request.
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'window', 'document'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = factory(require('jquery'), window, document);
    } else {
        // Browser globals
        factory(jQuery, window, document);
    }
}(function ($, window, document, undefined) {
    // Use ECMAScript 5's strict mode
    "use strict";

    var ignoreSelector = '.cke_dialog_ui_button,.cke_tpl_list a';

    var ckeditor = {
        ignoreSelector: ignoreSelector,
        isDirty: function ($form) {
            var $editors = ckeditors($form),
                isDirty = false;
            if ($editors.length > 0) {
                $.DirtyForms.dirtylog('Checking ' + $editors.length + ' ckeditors for dirtyness.');
                $editors.each(function (editorIndex) {
                    if (this.checkDirty()) {
                        isDirty = true;

                        $.DirtyForms.dirtylog('CKEditor with index ' + editorIndex + ' was dirty, exiting...');
                        // Return false to break out of the .each() function
                        return false;
                    }
                });
            }
            return isDirty;
        },
        setClean: function ($form) {
            ckeditors($form).each(function () { this.resetDirty(); });
        },

        // Support for Dirty Forms < 2.0
        ignoreAnchorSelector: ignoreSelector
    };
    var ckeditors = function (form) {
        var $form = form.jquery ? form : $(form);
        var editors = [];
        if (!window.CKEDITOR || !window.CKEDITOR.instances) {
            return $(editors);
        }
        try {
            for (var key in window.CKEDITOR.instances) {
                if (window.CKEDITOR.instances.hasOwnProperty(key)) {
                    var editor = window.CKEDITOR.instances[key];
                    if ($(editor.element.$).parents().index($form) != -1) {
                        $.DirtyForms.dirtylog('Adding CKEditor with key ' + key);
                        editors.push(editor);
                    }
                }
            }
        }
        catch (e) {
            // Ignore, means there was no CKEDITOR variable
        }
        return $(editors);
    };
    $.DirtyForms.helpers.push(ckeditor);
}));
