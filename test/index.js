const assert = require('assert').strict;
const t = require('apostrophe/test-lib/util.js');

describe('@apostrophecms/redirect', function () {
  let apos;
  let redirectModule;

  this.timeout(t.timeout);

  after(async function() {
    await t.destroy(apos);
  });

  before(async function() {
    apos = await t.create({
      root: module,
      testModule: true,
      modules: getAppConfig()
    });

    redirectModule = apos.modules['@apostrophecms/redirect'];
    await insertPages(apos);
  });

  this.afterEach(async function() {
    await apos.doc.db.deleteMany({ type: '@apostrophecms/redirect' });
  });

  it('should allow to redirect to external URLs', async function() {
    const req = apos.task.getReq();
    const instance = redirectModule.newInstance();
    await redirectModule.insert(req, {
      ...instance,
      title: 'external redirect',
      urlType: 'external',
      redirectSlug: '/page-1',
      externalUrl: 'http://localhost:3000/page-2'
    });
    const redirected = await apos.http.get('http://localhost:3000/page-1');

    assert.equal(redirected, '<title>page 2</title>\n');
  });

  it('should allow to redirect to internal pages', async function() {
    const req = apos.task.getReq();
    const instance = redirectModule.newInstance();
    const page2 = await apos.page.find(req, { title: 'page 2' }).toObject();
    await redirectModule.insert(req, {
      ...instance,
      title: 'internal redirect',
      urlType: 'internal',
      redirectSlug: '/page-1',
      _newPage: [ page2 ]
    });
    const redirected = await apos.http.get('http://localhost:3000/page-1');

    assert.equal(redirected, '<title>page 2</title>\n');
  });

  it('should allow to redirect to internal pages in other locales', async function() {
    const req = apos.task.getReq();
    const reqFr = apos.task.getReq({ locale: 'fr' });
    const instance = redirectModule.newInstance();
    const pageFr = await apos.page.find(reqFr, { title: 'page fr' }).toObject();
    await redirectModule.insert(req, {
      ...instance,
      title: 'internal redirect',
      urlType: 'internal',
      redirectSlug: '/page-1',
      _newPage: [ pageFr ]
    });

    const redirected = await apos.http.get('http://localhost:3000/page-1');
    assert.equal(redirected, '<title>page fr</title>\n');
  });
});

async function insertPages(apos) {
  const req = apos.task.getReq();
  const frReq = apos.task.getReq({ locale: 'fr' });
  const defaultPageModule = apos.modules['default-page'];
  const pageInstance = defaultPageModule.newInstance();

  await apos.page.insert(req, '_home', 'lastChild', {
    ...pageInstance,
    title: 'page 1',
    slug: '/page-1'
  });
  await apos.page.insert(req, '_home', 'lastChild', {
    ...pageInstance,
    title: 'page 2',
    slug: '/page-2'
  });
  await apos.page.insert(frReq, '_home', 'lastChild', {
    ...pageInstance,
    title: 'page fr',
    slug: '/page-fr'
  });
}

function getAppConfig() {
  return {
    '@apostrophecms/express': {
      options: {
        session: { secret: 'supersecret' },
        port: 3000
      }
    },
    '@apostrophecms/i18n': {
      options: {
        defaultLocale: 'en',
        locales: {
          en: { label: 'English' },
          fr: {
            label: 'French',
            prefix: '/fr'
          }
        }
      }
    },
    '@apostrophecms/redirect': {},
    'default-page': {},
    article: {
      extend: '@apostrophecms/piece-type',
      options: {
        alias: 'article'
      }
    },
    topic: {
      extend: '@apostrophecms/piece-type',
      options: {
        alias: 'topic'
      },
      fields: {
        add: {
          description: {
            label: 'Description',
            type: 'string'
          }
        }
      }
    }
  };
}
