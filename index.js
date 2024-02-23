module.exports = {
  extend: '@apostrophecms/piece-type',
  options: {
    alias: 'redirect',
    label: 'aposRedirect:label',
    pluralLabel: 'aposRedirect:pluralLabel',
    searchable: false,
    editRole: 'editor',
    publishRole: 'editor',
    withType: '@apostrophecms/page',
    localized: false,
    quickCreate: false,
    statusCode: 302,
    i18n: {
      ns: 'aposRedirect',
      browser: true
    },
    openGraph: false, // Disables @apostrophecms/open-graph for redirects
    seoFields: false, // Disables @apostrophecms/seo for redirects
    skip: [ /\/api\/v1\/.*/ ],
    before: null
  },
  init(self) {
    self.addUnlocalizedMigration();
    self.createIndexes();
  },
  handlers(self) {
    return {
      beforeSave: {
        slugPrefix(req, doc) {
          doc.slug = 'redirect-' + doc.redirectSlug;

          if (!doc.title) {
            doc.title = doc.redirectSlug;
          }
        },
        setCurrentLocale(req, doc) {
          const internalPage = doc._newPage && doc._newPage[0];

          doc.targetLocale = internalPage && doc.urlType === 'internal'
            ? internalPage.aposLocale.replace(/:.*$/, '')
            : null;
        }
      }
    };
  },
  fields(self, options) {
    const remove = [
      'visibility'
    ];
    const add = {
      redirectSlug: {
        // This is *not* type: 'slug' because we want to let you match any
        // nonsense the old site had in there, including mixed case.
        type: 'string',
        label: 'aposRedirect:originalSlug',
        help: 'aposRedirect:originalSlugHelp',
        required: true
      },
      title: {
        label: 'aposRedirect:title',
        type: 'string',
        required: true
      },
      urlType: {
        label: 'aposRedirect:urlType',
        type: 'select',
        choices: [
          {
            label: 'aposRedirect:urlTypeInternal',
            value: 'internal'
          },
          {
            label: 'aposRedirect:urlTypeExternal',
            value: 'external'
          }
        ],
        def: 'internal'
      },
      ignoreQueryString: {
        label: 'aposRedirect:ignoreQuery',
        type: 'boolean',
        def: false
      },
      forwardQueryString: {
        label: 'aposRedirect:forwardQuery',
        type: 'boolean',
        def: false
      },
      _newPage: {
        type: 'relationship',
        label: 'aposRedirect:newPage',
        withType: '@apostrophecms/page',
        if: {
          urlType: 'internal'
        },
        builders: {
          // Editors+ set up redirects, so it's OK for non-admins to follow
          // them anywhere (they won't actually get access without logging in)
          project: {
            slug: 1,
            title: 1,
            _url: 1,
            aposLocale: 1
          }
        },
        max: 1
      },
      externalUrl: {
        label: 'aposRedirect:external',
        type: 'url',
        if: {
          urlType: 'external'
        }
      },
      statusCode: {
        label: 'aposRedirect:statusCode',
        type: 'radio',
        htmlHelp: 'aposRedirect:statusCodeHtmlHelp',
        choices: [
          {
            label: 'aposRedirect:302',
            value: '302'
          },
          {
            label: 'aposRedirect:301',
            value: '301'
          }
        ],
        def: '302'
      }
    };

    const group = {
      basics: {
        label: 'apostrophe:basics',
        fields: [
          'title',
          'redirectSlug',
          'urlType',
          '_newPage',
          'externalUrl',
          'statusCode',
          'ignoreQueryString',
          'forwardQueryString'
        ]
      }
    };

    if (options.statusCode.toString() === '301') {
      add.statusCode.def = options.statusCode.toString();
    }

    add._newPage.withType = options.withType;

    return {
      add,
      remove,
      group
    };
  },
  middleware(self, options) {
    return {
      checkRedirect: {
        before: self.options.before,
        async middleware(req, res, next) {

          try {
            if (self.options.skip.find((regExp) => regExp.test(req.originalUrl))) {
              return next();
            }
          } catch (e) {
            self.apos.util.error('Error checking redirect allow list: ', e);
          }

          try {
            const slug = req.originalUrl;
            const [ pathOnly, queryString ] = slug.split('?');

            const results = await self
              .find(req, { $or: [ { redirectSlug: slug }, { redirectSlug: pathOnly } ] })
              .currentLocaleTarget(false)
              .relationships(false)
              .project({
                _id: 1,
                redirectSlug: 1,
                targetLocale: 1,
                externalUrl: 1,
                urlType: 1,
                ignoreQueryString: 1,
                forwardQueryString: 1
              })
              .toArray();

            if (!results.length) {
              return await emitAndRedirectOrNext();
            }

            const foundTarget = results.find(({ redirectSlug }) => redirectSlug === slug) ||
            results.find(({
              redirectSlug,
              ignoreQueryString
            }) => redirectSlug === pathOnly && ignoreQueryString);

            const shouldForwardQueryString = foundTarget && foundTarget.forwardQueryString;

            const localizedReq = foundTarget.urlType === 'internal' &&
              req.locale !== foundTarget.targetLocale
              ? req.clone({ locale: foundTarget.targetLocale })
              : req;

            const target = foundTarget.urlType === 'internal'
              ? await self.find(localizedReq, { _id: foundTarget._id }).toObject()
              : foundTarget;

            if (!target) {
              return await emitAndRedirectOrNext();
            }

            const parsedCode = parseInt(target.statusCode);
            const status = (parsedCode && !isNaN(parsedCode)) ? parsedCode : 302;
            const qs = shouldForwardQueryString && queryString ? `?${queryString}` : '';

            if (target.urlType === 'internal' && target._newPage && target._newPage[0]) {
              return redirect(status, target._newPage[0]._url + qs);
            } else if (target.urlType === 'external' && target.externalUrl.length) {
              return redirect(status, target.externalUrl + qs);
            }

            return await emitAndRedirectOrNext();
          } catch (e) {
            self.apos.util.error(e);
            return res.status(500).send('error');
          }

          async function redirect(status, url, redirectMethod = 'rawRedirect') {
            const result = {
              status,
              url
            };
            await self.emit('beforeRedirect', req, result);
            return res[redirectMethod](result.status, result.url);
          }

          async function emitAndRedirectOrNext() {
            const result = { status: 302 };
            await self.emit('noMatch', req, result);
            if (result.redirect) {
              return redirect(result.status, result.redirect, 'redirect');
            }
            if (result.rawRedirect) {
              return redirect(result.status, result.rawRedirect);
            }
            return next();
          }
        }
      }
    };
  },
  queries(self, query) {
    return {
      builders: {
        currentLocaleTarget: {
          def: true,
          launder(val) {
            return self.apos.launder.booleanOrNull(val);
          },
          finalize() {
            const active = query.get('currentLocaleTarget');
            const { locale } = query.req;

            if (active && locale) {
              query.and({ $or: [ { targetLocale: null }, { targetLocale: locale } ] });
            }
          }
        }
      }
    };
  },
  methods(self) {
    return {
      addUnlocalizedMigration() {
        self.apos.migration.add('@apostrophecms/redirect:unlocalized', async () => {
          const redirects = await self.apos.doc.db.find({
            type: self.name,
            aposMode: 'published'
          }).toArray();
          for (const redirect of redirects) {
            delete redirect.aposLocale;
            delete redirect.aposMode;
            delete redirect.lastPublishedAt;
            redirect._id = redirect._id.split(':')[0];
            if (redirect.aposDocId) {
              await self.apos.doc.db.removeMany({
                aposDocId: redirect.aposDocId
              });
              await self.apos.doc.db.insertOne(redirect);
            }
          }
        });
      },
      createIndexes() {
        self.apos.doc.db.createIndex({ redirectSlug: 1 });
      }
    };
  }
};
