[![CircleCI](https://circleci.com/gh/apostrophecms/redirect/tree/main.svg?style=svg)](https://circleci.com/gh/apostrophecms/redirect/tree/main)
[![Chat on Discord](https://img.shields.io/discord/517772094482677790.svg)](https://chat.apostrophecms.org)
# Manage site redirects for Apostrophe 3

## Note
Apostrophe 2 supported creating relationships to multiple doc types from a single interface. This feature is still being ported to Apostrophe 3, as such redirects can only specify a single doc type to redirect to.
## Installation

First make sure you have an [Apostrophe project](http://apostrophecms.org/)!

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
  statusCode: 301
}
```
> Note that permanent redirects are cached by Google for a long time. It is a good idea to encourage users to test with a temporary redirect first, then switch to permanent which is an SEO best practice — as long as it's correct.

### `withType`
*Defaults to `@apostrophecms/page`*
By passing `withType` to your configuration you can specify the document type your internal redirects can redirect to.

```javascript
// Other modules, then...
'@apostrophecms/redirect': {
  withType: 'article'
}
```

## Usage

While logged in as an admin, click the "Redirects" button. A list of redirects appears, initially empty. Add as many redirects as you like. The "from" URL must begin with a `/`. The "to" URL may be anything and need not be on your site. The "description" field is for your own convenience.

By default a redirect includes any query string (the `?` and whatever follows it, up to but not including any `#`) on incoming requests when matching for redirection. You can toggle the "ignore query string when matching" option in a redirect definition to ignore query strings on incoming requests and only match on the base URL path. A redirect that does not use this option will always match first, so you can match various specific query strings and then have a fallback rule for other cases.

Be aware that each redirect is live as soon as you save it and that it is possible to make a mess with redirects. In a pinch, you can remove unwanted redirects via the MongoDB command line client (look for `{ type: "@apostrophecms/redirect" }` in the `aposDocs` collection in MongoDB).

Also be aware that Apostrophe already creates "soft redirects" every time you change the slug of a page. So you shouldn't need manually created "hard redirects" in that situation.
