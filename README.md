# elq.js

elq.js (pronounced elk) is a Tiny library that can parse CSS, detect element-queries, and implement them in JavaScript.

## What are element-queries?

Element-queries are cousins to media-queries, but rather than checking the context of the screen/browser/device they check the context of their containing element.

```css
@media (min-width: 800px) {
  a {
    color: red;
  }
}
```

This media-query will make anchors red if the viewport is at least 800px wide.

```css
a:media(min-width: 800px) {
  color: red;
}
```

This element-query does the same thing in elq.js, except it changes the links color when it's _container_ is at least 800px wide. This means that links all over the page get styled based on their unique context. This system allows modules to be created around tiny chunks of content that each know how to render themselves given the space they are rendered in.

## Syntax

The syntax for elq.js is not an official element-query syntax (once an official syntax emerges, elk will be updated to support both syntaxes) but it should be recognizable.

```css
SELECTOR:media(MEDIASYNTAX) {
  /* styles to apply to SELECTOR when container matches MEDIASYNTAX */
}
```

MEDIASYNTAX can be any combination of comma (or) or and separated parentheseticals  with the following properties:

* `width`, `min-width`, `max-width`
* `height`, `min-height`, `max-height`
* `aspect-ratio`, `min-aspect-ratio`, `max-aspect-ratio`

You can use any other media properties by nesting an element-query in a media-query targeting those properties.

## Using elq.js

At the bottom of your page, include the following.

```html
<script src="elq.js"></script>
<script>
  elq.process();
</script>
```

`elq.process()` will iterate through all CSS in the page and do the following:

* fetch external css (won't work in a file:// context)
* add local `<style>` tag immediately after external css containing external css
* modify all `<style>` tag contents replacing element-queries with classes
* evaluate contexts on window resize or orientatin change and modify classes

If you need to dynamically add css after initial page load, just run `elq.process()` again after the new css has been added.

If you removed element-queries or css and want to re-process, run `elq.unregister()` followed by `elq.process()`;

Alternatively, you can use `elq.register(SELECTOR, MEDIASYNTAX, CSSCLASS)` and `elq.unregister(SELECTOR, MEDIASYNTAX)` to add or remove element-queries directly from JavaScript without the need for element-queries in the css.

Full documentation is available in the `/docs` folder.

## JavaScrip callbacks

Whenever elq adds or removes a class, it fires an `elq-change` event that can be listened for to trigger a callback. An example:

```js
document.getElementById('someId').addEventListener('elq-change', function(e) {
  // e.target = element on which the event was triggered
  // e.detail.addedClasses = array of added classes
  // e.detail.removedClasses = array of removed classes
  // e.deteil.contextHeight = height of the context
  // e.detail.contextWidth = width pf the context
});
```

This allows you to enhance your modules as their context changes.
