[![Chat on Discord](https://img.shields.io/discord/517772094482677790.svg)](https://chat.apostrophecms.org)
# Manage site redirects for Apostrophe 3

## Installation

First make sure you have an [Apostrophe project](https://apostrophecms.com)!

Then:

```javascript
npm install @apostrophecms/redirect
```

## Configuration

In `app.js`, add the module to your configuration:

  ```js
  require('apostrophe')({
    shortName: 'MYPROJECT',
    modules: {
      '@apostrophecms/redirect': {}
    }
  });
  ```
### `statusCode`
*Defaults to `302`*
By passing `statusCode` to your configuration you can change the default status code value.
Accepted values are `301` and `302`

```javascript
// Other modules, then...
'@apostrophecms/redirect': {
  options: {
    statusCode: 301
  }
}
```
> Note that permanent redirects are cached by Google for a long time. It is a good idea to encourage users to test with a temporary redirect first, then switch to permanent which is an SEO best practice — as long as it's correct.

### `withType`
*Defaults to `@apostrophecms/page`*
By passing `withType` to your configuration you can specify the document type your internal redirects can redirect to.

```javascript
// Other modules, then...
'@apostrophecms/redirect': {
  options: {
    withType: 'article'
  }
}
```

**Note:** Apostrophe 2 supported creating relationships to multiple doc types from a single interface. This feature is still being ported to Apostrophe 3, as such redirects can only specify a single doc type to redirect to.

## Usage

While logged in as an admin, click the "Redirects" button. A list of redirects appears, initially empty. Add as many redirects as you like. The "from" URL must begin with a `/`. The "to" URL may be anything and need not be on your site. The "description" field is for your own convenience.

By default a redirect includes any query string (the `?` and whatever follows it, up to but not including any `#`) on incoming requests when matching for redirection. You can toggle the "ignore query string when matching" option in a redirect definition to ignore query strings on incoming requests and only match on the base URL path. A redirect that does not use this option will always match first, so you can match various specific query strings and then have a fallback rule for other cases.

Be aware that each redirect is live as soon as you save it and that it is possible to make a mess with redirects. In a pinch, you can remove unwanted redirects via the MongoDB command line client (look for `{ type: "@apostrophecms/redirect" }` in the `aposDocs` collection in MongoDB).

Also be aware that Apostrophe already creates "soft redirects" every time you change the slug of a page, provided the page has been accessed at least once at the old URL. So you shouldn't need manually created "hard redirects" in that situation.

## Extending the module

### Providing a fallback handler

If you wish to handle redirects in another way when this module does not find a match, you can do so by listening for the `@apostrophecms/redirect:noMatch` event. This event handler receives `req, result`. To issue a redirect, set `result.redirect` in your event handler. To issue a "raw" redirect to which any sitewide prefix is not appended automatically, set `result.rawRedirect` in your event handler. **Do not** call `req.res.redirect()` yourself in your event handler.

For example:

```javascript
// modules/redirect-fallback/index.js
module.exports = {
  handlers(self) {
    return {
      '@apostrophecms/redirect:noMatch': {
        // will be awaited, you can do queries here if needed
        async fallback(req, result) {
          if (req.url.match(/pattern/)) {
            result.redirect = '/destination';
          }
        }
      }
    }
  }
}
```

### Preempting the redirect module

If your goal is to preempt this module by making a decision to redirect differently in some cases before this module looks for a match, register your own middleware and perform the redirect there. Use `before` to specify that your own module's middleware comes first.

For example:

```javascript
// modules/early-redirect/index.js
module.exports = {
  middleware(self) {
    return {
      earlyRedirect: {
        before: '@apostrophecms/redirect',
        middleware(req, res, next) {
          if (req.url.match(/pattern/)) {
            return res.redirect('/destination');
          } else {
            return next();
          }
        }
      }
    };
  }
};
```


## Redirecting to other locales

It's possible to redirect from a locale to another one, with external redirections, 
since you define manually the url to redirect to.

But also with internal redirects (relationship to page), even if relationships don't support relationships to other locales.

A query builder exist called `currentLocaleTarget` that hide redirects that have relationships to other locales (different from the current one).
If you want to get all redirects whatever the locale of their internal redirects you can undo this behavior using the query builder:
```javascript
const redirects = await self.apos.modules['@apostrophecms/redirect']
    .find(req)
    .currentLocaleTarget(false)
    .toArray();
```
