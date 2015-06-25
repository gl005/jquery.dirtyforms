/*!
	Copyright 2010 Mal Curtis
*/

// Support for UMD: https://github.com/umdjs/umd/blob/master/jqueryPluginCommonjs.js
// This allows for tools such as Browserify to compose the components together into a single HTTP request.
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    if (typeof $(document).on !== 'function') {
        if (typeof $(document).delegate === 'function') {
            // Patch jQuery 1.4.2 - 1.7 with an on function (that uses delegate).
            $.fn.on = function (events, selector, data, handler) {
                return $(this).delegate(selector, events, data, handler);
            };
        } else {
            throw ('jQuery 1.4.2 or higher is required by jquery.dirtyforms');
        }
    }

    // Public General Plugin methods $.DirtyForms
    $.extend({
        DirtyForms: {
            debug: false,
            message: 'You\'ve made changes on this page which aren\'t saved. If you leave you will lose these changes.',
            title: 'Are you sure you want to do that?',
            dirtyClass: 'dirty',
            listeningClass: 'dirtylisten',
            ignoreClass: 'ignoredirty',
            choiceContinue: false,
            helpers: [],
            dialog: {
                refire: function (content, ev) {
                    $.facebox(content);
                },
                fire: function (message, title) {
                    var content = '<h1>' + title + '</h1><p>' + message + '</p><p><a href="#" class="ignoredirty button medium red continue">Continue</a><a href="#" class="ignoredirty button medium cancel">Stop</a>';
                    $.facebox(content);
                },
                bind: function () {
                    var close = function (decision) {
                        return function (e) {
                            e.preventDefault();
                            $(document).trigger('close.facebox');
                            decision(e);
                        };
                    };
                    $('#facebox .cancel, #facebox .close, #facebox_overlay').click(close(decidingCancel));
                    $('#facebox .continue').click(close(decidingContinue));
                },
                stash: function () {
                    var fb = $('#facebox');
                    return ($.trim(fb.html()) === '' || fb.css('display') != 'block') ?
					   false :
					   $('#facebox .content').clone(true);
                },
                selector: '#facebox .content'
            },

            isDirty: function () {
                return $(':dirtylistening').dirtyForms('isDirty');
            },

            disable: function () {
                settings.disabled = true;
            },

            ignoreParentDocs: function () {
                settings.watchParentDocs = false;
            },

            choiceCommit: function (e) {
                choiceCommit(e);
            },

            isDeciding: function () {
                return settings.deciding;
            },

            decidingContinue: function (e) {
                decidingContinue(e);
            },

            decidingCancel: function (e) {
                decidingCancel(e);
            },

            dirtylog: function (msg) {
                dirtylog(msg);
            }
        }
    });

    // Create a custom selector $('form:dirty')
    $.extend($.expr[":"], {
        dirtylistening: function (a) {
            return $(a).hasClass(settings.listeningClass);
        },
        dirty: function (a) {
            return $(a).hasClass(settings.dirtyClass);
        }
    });

    // Public Element methods ( $('form').dirtyForms('methodName', args) )
    var methods = {
        init: function () {
            dirtylog('Adding forms to watch');
            bindExit();

            return this.each(function (e) {
                var $form = $(this);
                if (!$form.is('form')) return;
                dirtylog('Adding form ' + $form.attr('id') + ' to forms to watch');

                $form.addClass(settings.listeningClass)
                    // exclude all HTML 4 except text and password, but include HTML 5 except search
                    .on('focus change', "textarea,input:not([type='checkbox'],[type='radio'],[type='button']," +
					    "[type='image'],[type='submit'],[type='reset'],[type='file'],[type='search'])", onFocus)
                    .on('change', "input[type='checkbox'],input[type='radio'],select", onSelectionChange)
                    .on('click', "input[type='reset']", onReset);

                // Initialize settings with the currently focused element (autofocus)
                var focused = $form.find(inputSelector).filter(':focus');
                if (focused) {
                    settings.focused.element = focused;
                    settings.focused.value = focused.val();
                }
            });
        },
        // Returns true if any of the supplied elements are dirty
        isDirty: function () {
            var isDirty = false,
                node = this;
            if (settings.disabled) return false;
            if (focusedIsDirty()) {
                isDirty = true;
                return true;
            }
            this.each(function (e) {
                if ($(this).hasClass(settings.dirtyClass)) {
                    isDirty = true;
                    return true;
                }
            });
            $.each(settings.helpers, function (key, obj) {
                if ("isDirty" in obj) {
                    if (obj.isDirty(node)) {
                        isDirty = true;
                        return true;
                    }
                }
                // For backward compatibility, we call isNodeDirty (deprecated)
                if ("isNodeDirty" in obj) {
                    if (obj.isNodeDirty(node)) {
                        isDirty = true;
                        return true;
                    }
                }
            });

            dirtylog('isDirty returned ' + isDirty);
            return isDirty;
        },
        // Marks the element(s) that match the selector dirty
        setDirty: function () {
            dirtylog('setDirty called');
            return this.each(function (e) {
                $(this).addClass(settings.dirtyClass).parents('form').addClass(settings.dirtyClass);
            });
        },
        // "Cleans" this dirty form by essentially forgetting that it is dirty
        setClean: function () {
            dirtylog('setClean called');
            settings.focused = { element: false, value: false };

            return this.each(function (e) {
                var node = this, $node = $(this);

                // remove the current dirty class
                $node.removeClass(settings.dirtyClass);

                if ($node.is('form')) {
                    // remove all dirty classes from children
                    $node.find(':dirty').removeClass(settings.dirtyClass);
                } else {
                    // if this is last dirty child, set form clean
                    var $form = $node.parents('form');
                    if ($form.find(':dirty').length === 0) {
                        $form.removeClass(settings.dirtyClass);
                    }
                }

                // Clean helpers
                $.each(settings.helpers, function (key, obj) {
                    if ("setClean" in obj) {
                        obj.setClean(node);
                    }
                });
            });
        }

        // ADD NEW METHODS HERE
    };

    $.fn.dirtyForms = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.dirtyForms');
        }
    };

    // Deprecated Methods for Backward Compatibility
    // DO NOT ADD MORE METHODS LIKE THESE, ADD METHODS WHERE INDICATED ABOVE
    $.fn.setDirty = function () {
        return this.dirtyForms('setDirty');
    };
    $.fn.isDirty = function () {
        return this.dirtyForms('isDirty');
    };
    $.fn.cleanDirty = function () {
        return this.dirtyForms('setClean');
    };

    // Private Properties and Methods
    var settings = $.DirtyForms = $.extend({
        watchParentDocs: true,
        disabled: false,
        exitBound: false,
        formStash: false,
        dialogStash: false,
        deciding: false,
        decidingEvent: false,
        currentForm: false,
        hasFirebug: "console" in window && "firebug" in window.console,
        hasConsoleLog: "console" in window && "log" in window.console,
        focused: { "element": false, "value": false }
    }, $.DirtyForms);

    var onReset = function () {
        $(this).parents('form').dirtyForms('setClean');
        if (settings.onFormCheck) {
            settings.onFormCheck();
        }
    };

    var onSelectionChange = function () {
        if ($(this).hasClass(settings.ignoreClass)) return;
        $(this).dirtyForms('setDirty');
        if (settings.onFormCheck) {
            settings.onFormCheck();
        }
    };

    var onFocus = function () {
        var $this = $(this);
        if (focusedIsDirty() && !$this.hasClass(settings.ignoreClass)) {
            settings.focused.element.dirtyForms('setDirty');
            if (settings.onFormCheck) {
                settings.onFormCheck();
            }
        }
        settings.focused.element = $this;
        settings.focused.value = $this.val();
    };

    var focusedIsDirty = function () {
        // Check, whether the value of focused element has changed
        return settings.focused.element &&
			(settings.focused.element.val() !== settings.focused.value);
    };

    var dirtylog = function (msg) {
        if (!settings.debug) return;
        msg = "[DirtyForms] " + msg;
        if (settings.hasFirebug) {
            console.log(msg);
        } else if (settings.hasConsoleLog) {
            window.console.log(msg);
        } else {
            alert(msg);
        }
    };

    var bindExit = function () {
        if (settings.exitBound) return;

        var inIframe = (top !== self);

        $(document).on('click', 'a[href]', aBindFn);
        $(document).on('submit', 'form', formBindFn);
        if (settings.watchParentDocs && inIframe) {
            $(top.document).on('click', 'a[href]', aBindFn);
            $(top.document).on('submit', 'form', formBindFn);
        }

        $(window).bind('beforeunload', beforeunloadBindFn);
        if (settings.watchParentDocs && inIframe) {
            $(top.window).bind('beforeunload', beforeunloadBindFn);
        }

        settings.exitBound = true;
    };

    var getIgnoreAnchorSelector = function () {
        var result = '';
        $.each(settings.helpers, function (key, obj) {
            if ("ignoreAnchorSelector" in obj) {
                if (result.length > 0) { result += ','; }
                result += obj.ignoreAnchorSelector;
            }
        });
        return result;
    };

    var aBindFn = function (ev) {
        // Filter out any anchors the helpers wish to exclude
        if (!$(this).is(getIgnoreAnchorSelector())) {
            bindFn(ev);
        }
    };

    var formBindFn = function (ev) {
        settings.currentForm = this;
        bindFn(ev);
    };

    var beforeunloadBindFn = function (ev) {
        var result = bindFn(ev);

        if (result && settings.doubleunloadfix !== true) {
            dirtylog('Before unload will be called, resetting');
            settings.deciding = false;
        }

        settings.doubleunloadfix = true;
        setTimeout(function () { settings.doubleunloadfix = false; }, 200);

        // Bug Fix: Only return the result if it is a string,
        // otherwise don't return anything.
        if (typeof (result) == 'string') {
            ev = ev || window.event;

            // For IE and Firefox prior to version 4
            if (ev) {
                ev.returnValue = result;
            }

            // For Safari
            return result;
        }
    };

    var bindFn = function (ev) {
        var $element = $(ev.target), eventType = ev.type;
        dirtylog('Entering: Leaving Event fired, type: ' + eventType + ', element: ' + ev.target + ', class: ' + $element.attr('class') + ' and id: ' + ev.target.id);

        if (eventType == 'beforeunload' && settings.doubleunloadfix) {
            dirtylog('Skip this unload, Firefox bug triggers the unload event multiple times');
            settings.doubleunloadfix = false;
            return false;
        }

        if ($element.hasClass(settings.ignoreClass) || isDifferentTarget($element)) {
            dirtylog('Leaving: Element has ignore class or has target=\'_blank\'');
            if (!ev.isDefaultPrevented()) {
                clearUnload();
            }
            return false;
        }

        if (settings.deciding) {
            dirtylog('Leaving: Already in the deciding process');
            return false;
        }

        if (ev.isDefaultPrevented()) {
            dirtylog('Leaving: Event has been stopped elsewhere');
            return false;
        }

        if (!settings.isDirty()) {
            dirtylog('Leaving: Not dirty');
            if (!ev.isDefaultPrevented()) {
                clearUnload();
            }
            return false;
        }

        if (eventType == 'submit' && $element.dirtyForms('isDirty')) {
            dirtylog('Leaving: Form submitted is a dirty form');
            if (!ev.isDefaultPrevented()) {
                clearUnload();
            }
            return true;
        }

        if (settings.dialog) {
            settings.deciding = true;
            settings.decidingEvent = ev;
            dirtylog('Setting deciding active');

            dirtylog('Saving dialog content');
            settings.dialogStash = settings.dialog.stash();
            dirtylog(settings.dialogStash);
        }

        // Callback for page access in current state
        $(document).trigger('defer.dirtyforms');

        if (eventType == 'beforeunload') {
            dirtylog('Returning to beforeunload browser handler with: ' + settings.message);
            return settings.message;
        }
        if (!settings.dialog) return;

        ev.preventDefault();
        ev.stopImmediatePropagation();

        if ($element.is('form') && $element.parents(settings.dialog.selector).length > 0) {
            dirtylog('Stashing form');
            settings.formStash = $element.clone(true).hide();
        } else {
            settings.formStash = false;
        }

        dirtylog('Deferring to the dialog');
        settings.dialog.fire(settings.message, settings.title);
        settings.dialog.bind();
    };

    var isDifferentTarget = function ($element) {
        var aTarget = $element.attr('target');
        return typeof aTarget === 'string' ? aTarget.toLowerCase() === '_blank' : false;
    };

    var choiceCommit = function (ev) {
        if (settings.deciding) {
            $(document).trigger('choicecommit.dirtyforms');
            if (settings.choiceContinue) {
                decidingContinue(ev);
            } else {
                decidingCancel(ev);
            }
            $(document).trigger('choicecommitAfter.dirtyforms');
        }
    };

    var decidingCancel = function (ev) {
        ev.preventDefault();
        $(document).trigger('decidingcancelled.dirtyforms');
        if (settings.dialog !== false && settings.dialogStash !== false) {
            dirtylog('Refiring the dialog with stashed content');
            settings.dialog.refire(settings.dialogStash.html(), ev);
        }
        $(document).trigger('decidingcancelledAfter.dirtyforms');
        settings.deciding = settings.currentForm = settings.decidingEvent = settings.dialogStash = false;
    };

    var decidingContinue = function (ev) {
        clearUnload(); // fix for chrome/safari
        ev.preventDefault();
        settings.dialogStash = false;
        $(document).trigger('decidingcontinued.dirtyforms');
        refire(settings.decidingEvent);
        settings.deciding = settings.currentForm = settings.decidingEvent = false;
    };

    var clearUnload = function () {
        // I'd like to just be able to unbind this but there seems
        // to be a bug in jQuery which doesn't unbind onbeforeunload
        dirtylog('Clearing the beforeunload event');
        $(window).unbind('beforeunload', beforeunloadBindFn);
        window.onbeforeunload = null;
        $(document).trigger('beforeunload.dirtyforms');
    };

    var refire = function (e) {
        $(document).trigger('beforeRefire.dirtyforms');
        $(document).trigger('beforeunload.dirtyforms');
        if (e.type === 'click') {
            dirtylog("Refiring click event");
            var event = new $.Event('click');
            $(e.target).trigger(event);
            if (!event.isDefaultPrevented()) {
                var href = $(e.target).attr('href');
                dirtylog('Sending location to ' + href);
                location.href = href;
                return;
            }
        } else {
            dirtylog("Refiring " + e.type + " event on " + e.target);
            var target;
            if (settings.formStash) {
                dirtylog('Appending stashed form to body');
                target = settings.formStash;
                $('body').append(target);
            }
            else {
                target = $(e.target);
                if (!target.is('form'))
                    target = target.closest('form');
            }
            target.trigger(e.type);
        }
    };

}));
