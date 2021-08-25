# Changelog

## 1.0.1 (2021-08-26)

- Localization is inappropriate for redirects since it's necessary to be able to redirect from any URL. Previously `autopublish: true` was used by the module, but `localize: false` is more appropriate as it eliminates multiple locale versions altogether. A migration has been added to take care of existing redirects in this transition.
- Fixes README code examples for the `withType` and `statusCode` options.

## 1.0.0
- Initial port from Apostrophe 2.0
