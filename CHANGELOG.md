# Changelog

## 1.2.0 (2021-12-22)

- Adds `noMatch` event for implementing fallbacks, and also documents how to preempt this module if desired.

## 1.1.0 (2021-10-28)

- Adds English (`en`) locale strings for static text.
- Adds Spanish (`es`) localization to static text. Thanks to [Eugenio Gonzalez](https://github.com/egonzalezg9) for the contribution.
- Adds Slovak (`sk`) locale strings for static text. Thanks to [Michael Huna](https://github.com/Miselrkba) for the contribution.


## 1.0.1 (2021-08-26)

- Localization is inappropriate for redirects since it's necessary to be able to redirect from any URL. Previously `autopublish: true` was used by the module, but `localize: false` is more appropriate as it eliminates multiple locale versions altogether. A migration has been added to take care of existing redirects in this transition.
- Fixes README code examples for the `withType` and `statusCode` options.

## 1.0.0
- Initial port from Apostrophe 2.0
