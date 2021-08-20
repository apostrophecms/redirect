module.exports = {
  extend: '@apostrophecms/piece-type',
  options: {
    alias: 'redirect',
    label: 'Redirect',
    pluralLabel: 'Redirects',
    searchable: false,
    editRole: 'editor',
    publishRole: 'editor',
    withType: '@apostrophecms/page',
    localized: false,
    quickCreate: false,
    statusCode: 302,
    openGraph: false, // Disables @apostrophecms/open-graph for redirects
    seo: false // Disables @apostrophecms/seo for redirects
  },
  init(self) {
    self.addUnlocalizedMigration();
  },
  handlers(self) {
    return {
      beforeSave: {
        slugPrefix(req, doc) {
          doc.slug = 'redirect-' + doc.redirectSlug;

          if (!doc.title) {
            doc.title = doc.redirectSlug;
          }
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
        // goldang nonsense the old site had in there, including mixed case
        type: 'string',
        label: 'Old URL',
        help: 'Format with leading / such as /old-url',
        required: true
      },
      title: {
        label: 'Description',
        type: 'string',
        required: true
      },
      urlType: {
        label: 'Link To',
        type: 'select',
        choices: [
          {
            label: 'Internal Page',
            value: 'internal'
          },
          {
            label: 'External URL',
            value: 'external'
          }
        ],
        def: 'internal'
      },
      ignoreQueryString: {
        label: 'Ignore query string when matching.',
        type: 'boolean',
        def: false
      },
      _newPage: {
        type: 'relationship',
        label: 'Page Title',
        withType: '@apostrophecms/page',
        if: {
          urlType: 'internal'
        },
        builders: {
          // Editors+ set up redirects, so it's OK for non-admins to follow them anywhere
          // (they won't actually get access without logging in)
          project: {
            slug: 1,
            title: 1,
            _url: 1
          }
        },
        max: 1
      },
      externalUrl: {
        label: 'URL',
        type: 'url',
        if: {
          urlType: 'external'
        }
      },
      statusCode: {
        label: 'Redirect Type',
        type: 'radio',
        htmlHelp: 'Use <strong>"Temporary"</strong> for temporary redirects or for testing purposes.<br />Use <strong>"Permanent"</strong> after testing, this is an SEO best practice.',
        choices: [
          {
            label: 'Temporary (Status code 302)',
            value: '302'
          },
          {
            label: 'Permanent (Status code 301, Search engines will cache these, proofread carefully)',
            value: '301'
          }
        ],
        def: '302'
      }
    };

    const group = {
      basics: {
        label: 'Basics',
        fields: [
          'title',
          'redirectSlug',
          'urlType',
          '_newPage',
          'externalUrl',
          'statusCode',
          'ignoreQueryString'
        ]
      }
    };

    if (options.statusCode.toString() === '301') {
      add.statusCode.def = options.statusCode.toString();
    }

    add._newPage.withType = self.options.withType;

    return {
      add,
      remove,
      group
    };
  },
  middleware(self, options) {
    return {
      async checkRedirect(req, res, next) {
        const slug = req.url;
        const pathOnly = slug.split('?')[0];
        const redirectRegEx = new RegExp(`^redirect-${self.apos.util.regExpQuote(pathOnly)}(\\?.*)?$`);
        const results = await self.find(req, { slug: redirectRegEx }).toArray();
        let target;
        if (results) {
          if (results.some(result => result.redirectSlug === slug)) {
            target = results.find(result => result.redirectSlug === slug);
          } else if (results.some(result => result.redirectSlug === pathOnly && result.ignoreQueryString)) {
            target = results.find(result => result.redirectSlug === pathOnly && result.ignoreQueryString);
          }

          if (target) {
            let status = parseInt(target.statusCode);

            if (isNaN(status) || !status) {
              status = 302;
            }

            if (target.urlType === 'internal' && target._newPage && target._newPage[0]) {
              return req.res.redirect(status, target._newPage[0]._url);
            } else if (target.urlType === 'external' && target.externalUrl.length) {
              return req.res.redirect(status, target.externalUrl);
            } else {
              return next();
            }
          }
        }
        return next();
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
      }
    }
  }
};
