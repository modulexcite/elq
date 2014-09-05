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
     * @property respondAfter
     * @private
     * @type Number
     * @default 100
     */
    respondAfter = 100,

    /**
     * The number of links remaining to be fetched and rendered locally
     *
     * @property remainingLinks
     * @private
     * @type Number
     * @default 0
     */
    remainingLinks = 0,

    /**
     * A hash of cached links to avoid re-fetching
     *
     * @property cachedLinks
     * @private
     * @type Object
     * @default {}
     */
    cachedLinks = {},

    /**
     * A hash of registered media queries to avoid duplication
     *
     * @property registeredSelectors
     * @private
     * @type Object
     * @default {}
     */
    registeredSelectors = {},

    /**
     * A regular expression for finding valid element queries
     *
     * @property elqSyntax
     * @private
     * @type Regexp Object
     */
    elqSyntax = new RegExp(
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
            '[^())]+' +
          ')' +
        ')' +
      '\\)',                                      //     end pseudo )
      'g'
    ),

    /**
     * A regular expression for temporarily replacing strings that may contain
     * characters that break the elqSyntax regular expression ,}) etc.
     *
     * @property cssString
     * @private
     * @type Regexp Object
     */
    cssString = new RegExp(
      '([^\\\\])' +    // $1: non-escaped starting delimiter
      '([\'"])' +      // $2: delimiter
      '(.*?[^\\\\])' + // $3: string contents
      '\\2',           //     closing matching delimiter
      'g'
    ),


    /**
     * The number of pixels corresponding to one rem at context change time
     *
     * @property pixelsPerREM
     * @private
     * @type Number
     * @default undefined
     */
    pixelsPerREM,

    /**
     * An object to store private methods
     *
     * @property privateMethods
     * @private
     * @type Object
     * @default {}
     */
    privateMethods = {},

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
        selectors = Object.keys(registeredSelectors),
        length    = selectors.length,
        index,
        processElements,
        processContexts;

      processContexts = function (
        selector,
        pixelsPerEM,
        element,
        parentWidth,
        parentHeight
      ) {
        var
          registeredSelector = registeredSelectors[selector],
          conditions         = Object.keys(registeredSelector),
          length             = conditions.length,
          added              = [],
          removed            = [],
          changed,
          index;

        for (index = 0; index < length; index += 1) {

          changed = registeredSelector[conditions[index]](
            parentWidth,
            parentHeight,
            element,
            pixelsPerEM,
            pixelsPerREM
          );

          added = added.concat(changed.added);
          removed = removed.concat(changed.removed);

        }

        if (added.length || removed.length) {
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent(
            'elq-change',
            true,
            true,
            {
              'addedClasses': added,
              'removedClasses': removed,
              'contextWidth': parentWidth,
              'contextHeight': parentHeight
            }
          );
          element.dispatchEvent(event);
        }
      };

      processElements = function (selector) {
        var
          elements = document.querySelectorAll(selector),
          length = elements.length,
          index,
          element,
          parent,
          pixelsPerEM,
          parentWidth,
          parentHeight;

        for (index = 0; index < length; index += 1) {
          element     = elements[index];
          parent      = element.parentNode;
          pixelsPerEM = document.defaultView.getComputedStyle(
            parent,
            null
          ).getPropertyValue('fontSize');

          parentWidth = parent.clientWidth +
            (2 * (parseInt(parent.style.padding, 10) || 0)) + // padding
            (parseInt(parent.style.paddingLeft, 10) || 0) +   // paddingLeft
            (parseInt(parent.style.paddingRight, 10) || 0);   // paddingRight

          parentHeight = parent.clientHeight +
            (2 * (parseInt(parent.style.padding, 10) || 0)) + // padding
            (parseInt(parent.style.paddingTop, 10) || 0) +    // paddingTop
            (parseInt(parent.style.paddingBottom, 10) || 0);  // paddingBottom

          processContexts(
            selector,
            pixelsPerEM,
            element,
            parentWidth,
            parentHeight
          );
        }
      };

      for (index = 0; index < length; index += 1) {
        processElements(selectors[index]);
      }

      return length ? true : false;
    };

  /* FLASH */ elq._revealed = privateMethods; /* UNFLASH */

  /**
   * Fetch an external CSS link and render it as an inline style element
   *
   * @method fetchExternalCSS
   * @private
   * @param  {DOM Object} link The link to fetch
   * @return {Boolean}         True if link was fetched
   */
  privateMethods.fetchExternalCSS = function (link) {
    var
      success = false,
      href    = link.getAttribute('href'),
      media   = link.getAttribute('media') || '',
      style,
      request;

    if (!cachedLinks[href + media]) {
      success = true;
      style   = document.createElement('style');
      request = new XMLHttpRequest();

      if (media) {
        style.setAttribute('media', media);
      }

      style.setAttribute('href', href);
      style.className = 'elq-fetched';

      link.parentNode.insertBefore(style, link.nextSibling);
      cachedLinks[href + media] = true;

      request.onreadystatechange = function () {
        if (request.readyState === 4) {
          if (request.status === 200) {
            style.innerHTML += request.responseText;
          } else {
            privateMethods.unfetchExternalCSS(link);
          }

          remainingLinks -= 1;

          if (!remainingLinks) {
            privateMethods.parseCSS();
          }
        }
      };

      request.open('GET', href, true);
      request.send();
    } else {
      remainingLinks -= 1;
    }

    return success;
  };

  /**
   * Removes generated style and fetched css from internal cache
   *
   * @method unfetchExternalCSS
   * @private
   * @param  {DOM Object} link The link that was fetched
   * @return {Boolean}         True if style was deleted
   */
  privateMethods.unfetchExternalCSS = function(link) {
    var
      success = false,
      href    = link.getAttribute('href'),
      media   = link.getAttribute('media'),
      style   = link.nextSibling;

    if (
      style &&
      (style.tagName.toLowerCase() === 'style') &&
      (style.getAttribute('href') === href) &&
      (style.getAttribute('media') === media) &&
      (style.className === 'elq-fetched')
    ) {
      media = media || '';
      style.parentNode.removeChild(style);
      delete(cachedLinks[href + media]);
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
  privateMethods.respondToContext = function () {
    var
      respondAfterTimeout = function respondAfterTimeout() {
        var
          lastClientWidth = document.lastClientWidth || 0,
          lastClientHeight = document.lastClientHeight || 0;

        if (document.clientWidth !== lastClientWidth ||
          document.clientHeight !== lastClientHeight) {
          clearTimeout(respondTimeout);
          respondTimeout = setTimeout(
            privateMethods.respondToContext,
            respondAfter
          );
          document.lastClientWidth = document.clientWidth;
          document.lastClientHeight = document.clientHeight;
        }
      };

    pixelsPerREM = document.defaultView.getComputedStyle(
      document.querySelector('html'),
      null
    ).getPropertyValue('fontSize');

    window.removeEventListener('resize', respondAfterTimeout);
    window.removeEventListener('orientationchange', respondAfterTimeout);
    window.addEventListener('resize', respondAfterTimeout);
    window.addEventListener('orientationchange', respondAfterTimeout);

    return respond();
  };

  /**
   * Parses all CSS and registers found element queries
   *
   * @method parseCSS
   * @private
   * @return {Boolean} True if any element queries were found
   */
  privateMethods.parseCSS = function () {
    var
      success = false,
      styles  = document.querySelectorAll('style'),
      length  = styles.length,
      index,
      style,
      css,
      strings = [],
      replaceCSS = function (unused, selector, media) {
        return selector + '.' + elq.register(selector, media);
      },
      replaceStrings = function (unused, beforeDelimiter, delimiter, string) {
        strings.push(delimiter + string + delimiter);
        return (beforeDelimiter + '-=STRING=-');
      },
      restoreStrings = function (unused) {
        var restored = strings.shift();
        return restored;
      };

    for (index = 0; index < length; index += 1) {
      style = styles[index];

      css = style.innerHTML;
      css = css.replace(/\s+/g, ' ');
      css = css.replace(/(^|\})\s*/g, '$1\n');
      css = css.replace(cssString, replaceStrings);

      while (elqSyntax.test(css)) {
        success = true;
        css = css.replace(elqSyntax, replaceCSS);
      }

      css = css.replace(/-=STRING=-/g, restoreStrings);

      style.innerHTML = css;
    }

    privateMethods.respondToContext();

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
  privateMethods.mediaToCondition = function (media) {
    media = '(' + media + ')';
    media = media.replace(/\s*,\s*/g, ')||(');
    media = media.replace(/\s*not\s*([^|]+)\s*/g, '!($1)');
    media = media.replace(/\s+and\s+/g, '&&');
    media = media.replace(
      /\s*(?:(min|max)-)?(width|height)\s*:\s*(\d+)(px|em|rem)\s*/g,
      function (unused, mm, hw, val, units) {
        var operator, left, right;

        operator = mm === 'min' ? '>=' : mm === 'max' ? '<=' : '==';
        left = hw === 'width' ? 'elw' : 'elh';
        right = val;

        if (units === 'em') {
          left = '(' + left + '/pxpem)';
        } else if (units === 'rem') {
          left = '(' + left + '/pxprem)';
        }

        return left + operator + right;
      }
    );
    media = media.replace(
      /\s*(?:(min|max)-)?aspect-ratio\s*:\s*(\d+)\/(\d+)\s*/g,
      function (unused, mm, w, h) {
        var operator, left, right;

        operator = mm === 'min' ? '>=' : mm === 'max' ? '<=' : '==';
        left = '(elw/elh)';
        right = '(' + w + '/' + h + ')';

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
      if (!registeredSelectors[selector]) {
        registeredSelectors[selector] = {};
      }
      registeredSelectors[selector][media] =
        new Function( // jshint ignore:line
          'elw', 'elh', 'el', 'pxpem', 'pxprem', // params
          'var ' +
            'changed = { added: [], removed: [] },' +
            'classes = el.className.split(/\\s+/),' +
            'exists,' +
            'i,' +
            'len = classes.length;' +
          'for (i = 0; i < len; i += 1) {' +
            'if (classes[i] === \'' + elqClass + '\') {' +
              'exists = i + 1;' +
            '}' +
          '}' +
          'if (' + privateMethods.mediaToCondition(media) + ') {' +
            'if (!exists) {' +
              'classes.push(\'' + elqClass + '\');' +
              'changed.added.push(\'' + elqClass + '\');' +
            '}' +
          '} else {' +
            'if (exists) {' +
              'classes.splice(exists - 1, 1);' +
              'changed.removed.push(\'' + elqClass + '\');' +
            '}' +
          '}' +
          'if (changed.added.length || changed.removed.length) {' +
            'el.className = classes.join(\' \');' +
          '}' +
          'return changed;'
        );
    }

    privateMethods.respondToContext();

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
      success = registeredSelectors[selector][media] ? true : false;
      delete(registeredSelectors[selector][media]);
    } else {
      success = Object.keys(registeredSelectors).length ?
        true :
        false;
      registeredSelectors = {};
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
      length,
      index;

    links          = links || document.querySelectorAll('link[href*=".css"]');
    length         = links.length;
    remainingLinks = length;

    if (!length) {
      privateMethods.parseCSS();
    } else {
      for (index = 0; index < length; index += 1) {
        privateMethods.fetchExternalCSS(links[index]);
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
   * @method respondAfter
   * @param  {Number} Milliseconds after which to render
   * @return {Number} Milliseconds after which to render
   */
  elq.respondAfter = function (milliseconds) {
    return respondAfter = +milliseconds >= 0 ? milliseconds : respondAfter;
  };

  return elq;
}(window.elq || {}, document));
