/**
 * @title elq.js
 * @overview Parses CSS for element queries, supports them in JavaScript
 * @copyright (c) 2014
 * @license CC BY (http://creativecommons.org/licenses/by/4.0/)
 * @author Art Lawry
*/

/**
 * Parses CSS for element queries and implements them with JavaScript
 *
 * @class elq
 * @param  {Object} elq      The elq module for loose augmentation
 * @param  {Object} document document object for DOM manipulation
 * @return {Object}          The augmented elq module
 */
window.elq = (function (elq, document) {

  'use strict';

  var

    /**
     * Allows pre-processing after a window resize with less resources
     *
     * @property respondTimeout
     * @private
     * @type Object
     * @default undefined
     */
    respondTimeout,

    /**
     * Default value for milliseconds after a resize/orientation to respond
     *
     * @property respondDelay
     * @private
     * @type Number
     * @default 100
     */
    respondDelay = 100,

    /**
     * The number of links remaining to be fetched and rendered locally
     *
     * @property unfetchedLinks
     * @private
     * @type Number
     * @default 0
     */
    unfetchedLinks = 0,

    /**
     * A hash of cached links to avoid re-fetching
     *
     * @property linkCache
     * @private
     * @type Object
     * @default {}
     */
    linkCache = {},

    /**
     * functions that apply classes based on registered element queries
     * contextFunctions[selector][media]
     *
     * @property contextFunctions
     * @private
     * @type Object
     * @default {}
     */
    contextFunctions = {},

    /**
     * A regular expression for finding valid element queries
     *
     * @property elementQuery
     * @private
     * @type Regexp Object
     */
    elementQuery = new RegExp(
      '\\s*([^,}]+)' +                            // $1: selector
      '\\:media\\(' +                             //     pseudo :media(
        '(' +                                     // $2: media query
          '(?:' +
            '(?:' +                               //     one "or" group
              '(?:\\s*not)?\\s*' +                //     optional "not"
              '(?:\\([^)]+\\))' +                 //     one "and" group
              '(?:\\s*and\\s*(?:\\([^)]+\\)))*' + //     optional "and" groups
            ')' +
            '(?:' +                               //     optional "or" groups
              '\\s*,' +                           //     "or" seperator
              '(?:\\s*not)\\s*' +                 //     optional "not"
              '(?:\\([^)]+\\))' +                 //     one "and" group
              '(?:\\s*and\\s*(?:\\([^)]+\\)))*' + //     optional and group
            ')*' +
          '|' +
            '[^()]+' +
          ')' +
        ')' +
      '\\)',                                      //     end pseudo )
      'g'
    ),

    /**
     * A regular expression for temporarily replacing strings that may contain
     * characters that break the elementQuery regular expression ,}) etc.
     *
     * @property quotedText
     * @private
     * @type Regexp Object
     */
    quotedText = new RegExp(
      '([^\\\\])' +    // $1: non-escaped starting delimiter
      '([\'"])' +      // $2: delimiter
      '(.*?[^\\\\])' + // $3: string contents
      '\\2',           //     closing matching delimiter
      'g'
    ),


    /**
     * The number of pixels corresponding to one rem at context change time
     *
     * @property rempx
     * @private
     * @type Number
     * @default undefined
     */
    rempx,

    /**
     * An object to store private methods
     *
     * @property _private
     * @private
     * @type Object
     * @default {}
     */
    _private = {},

    /**
     * A function that applies context classes when context changes
     * Exposed later as elq.respond
     *
     * @property respond
     * @private
     * @type Function
     */
    respond = function () {
      var
        selectors = Object.keys(contextFunctions),
        len       = selectors.length,
        i,
        findContexts,
        processContext;

      processContext = function (
        selector,
        empx,
        element,
        contextWidth,
        contextHeight
      ) {
        var
          contextFunction = contextFunctions[selector],
          conditions      = Object.keys(contextFunction),
          len             = conditions.length,
          addedClasses    = [],
          removedClasses  = [],
          changes,
          elqChangeEvent,
          i;

        for (i = 0; i < len; i ++) {
          changes = contextFunction[conditions[i]](
            contextWidth,
            contextHeight,
            element,
            empx,
            rempx
          );

          addedClasses = addedClasses.concat(changes.added);
          removedClasses = removedClasses.concat(changes.added);
        }

        if (addedClasses.length || removedClasses.length) {
          elqChangeEvent = document.createEvent('CustomEvent');

          elqChangeEvent.initCustomEvent(
            'elq-change',
            true,
            true,
            {
              'addedClasses':   addedClasses,
              'removedClasses': removedClasses,
              'contextWidth':   contextWidth,
              'contextHeight':  contextHeight
            }
          );

          element.dispatchEvent(elqChangeEvent);
        }
      };

      findContexts = function (selector) {
        var
          elements = document.querySelectorAll(selector),
          len      = elements.length,
          i,
          element,
          context,
          empx,
          contextWidth,
          contextHeight;

        for (i = 0; i < len; i ++) {
          element = elements[i];
          context = element.parentNode;
          empx    = document.defaultView.getComputedStyle(
            context,
            null
          ).getPropertyValue('fontSize');

          contextWidth = context.clientWidth +
            (2 * (parseInt(context.style.padding, 10) || 0)) + // padding
            (parseInt(context.style.paddingLeft, 10) || 0) +   // left
            (parseInt(context.style.paddingRight, 10) || 0);   // right

          contextHeight = context.clientHeight +
            (2 * (parseInt(context.style.padding, 10) || 0)) + // padding
            (parseInt(context.style.paddingTop, 10) || 0) +    // top
            (parseInt(context.style.paddingBottom, 10) || 0);  // bottom

          processContext(
            selector,
            empx,
            element,
            contextWidth,
            contextHeight
          );
        }
      };

      for (i = 0; i < len; i ++) {
        findContexts(selectors[i]);
      }

      return len ? true : false;
    };

  /* FLASH */ elq._private = _private; /* UNFLASH */

  /**
   * Fetch an external CSS link and render it as an inline style element
   *
   * @method fetchLink
   * @private
   * @param  {DOM Object} link The link to fetch
   * @return {Boolean}         True if link was fetched
   */
  _private.fetchLink = function (link) {
    var
      success = false,
      href    = link.getAttribute('href'),
      media   = link.getAttribute('media') || '',
      style,
      request;

    if (!linkCache[href + media]) {
      success = true;
      style   = document.createElement('style');
      request = new XMLHttpRequest();

      if (media) {
        style.setAttribute('media', media);
      }

      style.setAttribute('href', href);
      style.className = 'elq-fetched';

      link.parentNode.insertBefore(style, link.nextSibling);
      linkCache[href + media] = true;

      request.onreadystatechange = function () {
        if (request.readyState === 4) {

          if (request.status === 200) {
            style.innerHTML += request.responseText;
          } else {
            _private.removeFetchedLink(link);
          }

          unfetchedLinks -= 1;

          if (!unfetchedLinks) {
            _private.expandElementQueries();
          }
        }
      };

      request.open('GET', href, true);
      request.send();
    } else {
      unfetchedLinks -= 1;
    }

    return success;
  };

  /**
   * Removes generated style and fetched css from internal cache
   *
   * @method removeFetchedLink
   * @private
   * @param  {DOM Object} link The link that was fetched
   * @return {Boolean}         True if style was deleted
   */
  _private.removeFetchedLink = function(link) {
    var
      success = false,
      href    = link.getAttribute('href'),
      media   = link.getAttribute('media'),
      style   = link.nextSibling;

    if (
      style &&
      (style.tagName.toLowerCase() === 'style') &&
      (style.getAttribute('href')  === href) &&
      (style.getAttribute('media') === media) &&
      (style.className             === 'elq-fetched')
    ) {
      media = media || '';
      style.parentNode.removeChild(style);
      delete(linkCache[href + media]);
      success = true;
    }

    return success;
  };

  /**
   * Listen for context change and modify all selectors
   *
   * @method respondToContext
   * @private
   * @return {Boolean} True if any selectors were found
   */
  _private.respondToContext = function () {
    var checkContext;

    checkContext = function () {
      var
        lastWidth  = document.lastWidth || 0,
        lastHeight = document.lastHeight || 0;

      if (document.clientWidth !== lastWidth ||
        document.clientHeight  !== lastHeight) {
        clearTimeout(respondTimeout);
        respondTimeout = setTimeout(
          _private.respondToContext,
          respondDelay
        );
        document.lastWidth  = document.clientWidth;
        document.lastHeight = document.clientHeight;
      }
    };

    rempx = document.defaultView.getComputedStyle(
      document.querySelector('html'),
      null
    ).getPropertyValue('fontSize');

    window.removeEventListener('resize', checkContext);
    window.removeEventListener('orientationchange', checkContext);
    window.addEventListener('resize', checkContext);
    window.addEventListener('orientationchange', checkContext);

    return respond();
  };

  /**
   * Parses all CSS and registers found element queries
   *
   * @method expandElementQueries
   * @private
   * @return {Boolean} True if any element queries were found
   */
  _private.expandElementQueries = function () {
    var
      i,
      style,
      css,
      success = false,
      styles  = document.querySelectorAll('style'),
      len     = styles.length,
      strings = [],
      replaceCSS = function (unused, selector, media) {
        return selector + '.' + elq.register(selector, media);
      },
      replaceStrings = function (unused, nonEscape, delimiter, string) {
        strings.push(delimiter + string + delimiter);
        return (nonEscape + '-=STRING=-');
      },
      restoreStrings = function (unused) {
        var restored = strings.shift();
        return restored;
      };

    for (i = 0; i < len; i ++) {
      style = styles[i];

      css = style.innerHTML;
      css = css.replace(quotedText, replaceStrings);
      css = css.replace(/\s+/g, ' ');
      css = css.replace(/(^|\})\s*/g, '$1\n');

      while (elementQuery.test(css)) {
        success = true;
        css     = css.replace(elementQuery, replaceCSS);
      }

      css = css.replace(/-=STRING=-/g, restoreStrings);

      style.innerHTML = css;
    }

    _private.respondToContext();

    return success;
  };

  /**
   * Converts the media query portion of an element query into a condition
   *
   * @method mediaToCondition
   * @private
   * @param  {String} media The media query portion of the element query
   * @return {String}       The modified condition
   */
  _private.mediaToCondition = function (media) {
    media = '(' + media + ')';
    media = media.replace(/\s*,\s*/g, ')||(');
    media = media.replace(/\s*not\s*([^|]+)\s*/g, '!($1)');
    media = media.replace(/\s+and\s+/g, '&&');
    media = media.replace(
      /\s*(?:(min|max)-)?(width|height)\s*:\s*(\d+)(px|em|rem)\s*/g,
      function (unused, minMax, heightWidth, value, units) {
        var
          operator = minMax === 'min' ? '>=' : minMax === 'max' ? '<=' : '==',
          left = heightWidth === 'width' ? 'contextWidth' : 'contextHeight',
          right = value;

        if (units === 'em') {
          left = '(' + left + '/empx)';
        } else if (units === 'rem') {
          left = '(' + left + '/rempx)';
        }

        return left + operator + right;
      }
    );
    media = media.replace(
      /\s*(?:(min|max)-)?aspect-ratio\s*:\s*([1-9]\d*)\/([1-9]\d*)\s*/g,
      function (unused, minMax, aspextX, aspectY) {
        var
          operator = minMax === 'min' ? '>=' : minMax === 'max' ? '<=' : '==',
          left = '(contextWidth/contextHeight)',
          right = '(' + aspextX + '/' + aspectY + ')';

        return left + operator + right;
      }
    );

    while (/\(\(([^)]+)\)\)/.test(media)) {
      media = media.replace(/\(\(([^)]+)\)\)/g, '($1)');
    }

    return media;
  };

  /**
   * Registers an element query
   *
   * @method register
   * @param  {String} selector The selector matching this element query
   * @param  {String} media    The media matching this element query
   * @param  {String} elqClass Optional predetermined class to apply
   * @return {String}          The class associated with this element query
   */
  elq.register = function (selector, media, elqClass) {

    if (selector && media) {
      if (!elqClass) {
        elqClass = media.replace(
          /^\W*(\w.*\w)\W*$/,
          function (unused, media) {
            media = media.replace(/\W+/g, '-');
            return 'elq-' + media;
          }
        );
      }
      if (!contextFunctions[selector]) {
        contextFunctions[selector] = {};
      }
      contextFunctions[selector][media] =
        new Function( // jshint ignore:line
          // params
          'contextWidth', 'contextHeight', 'element', 'empx', 'rempx',

          // function
          'var ' +
            'changes = { added: [], removed: [] },' +
            'classes = element.className.split(/\\s+/),' +
            'exists,' +
            'i,' +
            'len = classes.length;' +
          'for (i = 0; i < len; i ++) {' +
            'if (classes[i] === \'' + elqClass + '\') {' +
              'exists = i + 1;' +
            '}' +
          '}' +
          'if (' + _private.mediaToCondition(media) + ') {' +
            'if (!exists) {' +
              'classes.push(\'' + elqClass + '\');' +
              'changes.added.push(\'' + elqClass + '\');' +
            '}' +
          '} else {' +
            'if (exists) {' +
              'classes.splice(exists - 1, 1);' +
              'changes.removed.push(\'' + elqClass + '\');' +
            '}' +
          '}' +
          'if (changes.added.length || changes.removed.length) {' +
            'element.className = classes.join(\' \');' +
          '}' +
          'return changes;'
        );
    }

    _private.respondToContext();

    return elqClass;
  };

  /**
   * Unregisters an element query
   *
   * @method unregister
   * @param  {String} selector The selector matching this element query
   * @param  {String} media    The media matching this element query
   * @return {Boolean}         True if selector existed
   */
  elq.unregister = function (selector, media) {
    var
      success = false;

    if (selector && media) {
      success = contextFunctions[selector][media] ? true : false;
      delete(contextFunctions[selector][media]);
    } else {
      success = Object.keys(contextFunctions).length ?
        true :
        false;
      contextFunctions = {};
    }

    return success;
  };

  /**
   * Processes the entire page for element queries
   *
   * @method process
   * @param  {Array} Option array of DOM links to process
   * @return {Boolean} True
   */
  elq.process = function (links) {
    var
      i,
      len;

    links = links || document.querySelectorAll('link[href*=".css"]');
    len   = links.length;

    unfetchedLinks = len;

    if (!len) {
      _private.expandElementQueries();
    } else {
      for (i = 0; i < len; i ++) {
        _private.fetchLink(links[i]);
      }
    }

    return true;
  };

  /**
   * Loop through each selector and process matching elements
   *
   * Fires an 'elq-change' event if any classes are added or removed by elq.
   * Custom event contains:
   *   event.detail.contextHeight
   *   event.detail.contextWidth
   *   event.detail.addedClasses
   *   event.detail.removedClasses
   *
   * @method respond
   * @return {Boolean} True if any selectors were found
   */
  elq.respond = respond;

  /**
   * Adjust how often a resize/orientation event will throttle
   *
   * @method respondDelay
   * @param  {Number} Milliseconds after which to render
   * @return {Number} Milliseconds after which to render
   */
  elq.delay = function (milliseconds) {
    return respondDelay = +milliseconds >= 0 ? milliseconds : respondDelay;
  };

  return elq;
}(window.elq || {}, document));
