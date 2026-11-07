/* Inventory and layout evidence are separate from functional acceptance. */
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const {
    chromium
  } = require(process.argv[2]),
  phase = process.argv[4] || 'before';
if (!['before', 'after'].includes(phase)) throw Error('Expected before/after phase');
const resourcePhase = process.argv[5] === 'resources-equipment';
const out = path.resolve(__dirname, '../output/playwright/' + (resourcePhase ? 'resources-equipment' : 'ui-coverage-history'));
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  phase,
  completed: false,
  productionDataUsed: false,
  errors: [],
  nextRoutes: [],
  referenceViews: [],
  referenceLayout: [],
  navigation: [],
  limitations: ['Reference render checks are not functional acceptance', 'No Firebase/authenticated production SIT or physical-device/user UAT']
};
function pages(dir) {
  return fs.readdirSync(dir, {
    withFileTypes: true
  }).flatMap(e => e.isDirectory() ? pages(path.join(dir, e.name)) : e.name === 'page.js' ? [path.join(dir, e.name)] : []);
}
report.nextRoutes = pages(path.resolve(__dirname, '../frontend/app')).map(file => {
  const source = fs.readFileSync(file, 'utf8'),
    route = '/' + path.relative(path.resolve(__dirname, '../frontend/app'), path.dirname(file)).replaceAll('\\', '/');
  return {
    route: route === '/.' ? '/' : route,
    lines: source.split('\n').length,
    developmentOnly: /NODE_ENV.*development/.test(source),
    imports: [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1]).filter(name => name.includes('components/') || name.includes('workspace')),
    featureMigrated: /^\/dev\/(record|calendar|history|resources|equipment(?:\/usage)?)$/.test(route),
    authenticatedFunctionalityVerified: false
  };
});
async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.argv[3]
  });
  try {
    const ctx = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1000
      },
      serviceWorkers: 'block'
    });
    await ctx.route('**/*', r => ['http://127.0.0.1:4197', 'http://127.0.0.1:4310'].includes(new URL(r.request().url()).origin) || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort());
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push({
      message: e.message,
      route: page.url(),
      stack: e.stack
    }));
    await page.goto('http://127.0.0.1:4197/#/worklogs');
    await page.waitForFunction(() => document.documentElement.dataset.refinementsEReady === 'true');
    report.referenceViews = await page.evaluate(() => window.designReview.routes);
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({
        width,
        height: width === 390 ? 844 : 1000
      });
      await page.evaluate(theme => window.designReview.setTheme(theme), theme);
      for (const view of report.referenceViews.filter(view => !resourcePhase || ['resources','equipment','usage','condition'].includes(view.id))) {
        await page.goto('http://127.0.0.1:4197/#/' + view.id);
        await page.waitForFunction(id => window.designReview.getSummary().route === id, view.id);
        await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity && a.effect?.getComputedTiming().duration <= 800).map(a => a.finished.catch(() => {}))), new Promise(resolve => setTimeout(resolve, 2000))]));
        const state = await page.evaluate(() => ({
          textLength: document.querySelector('#content').textContent.trim().length,
          heading: document.querySelector('#content h1,#content h2')?.textContent || '',
          overflow: document.documentElement.scrollWidth > innerWidth + 1
        }));
        report.referenceLayout.push({
          route: view.id,
          width,
          theme,
          ...state
        });
        if (resourcePhase || view.id === 'worklogs') await page.screenshot({
          path: path.join(out, `reference-${view.id}-${width}-${theme}.png`),
          fullPage: true
        });
      }
    }
    console.log('PASS reference layout inventory: ' + report.referenceLayout.length + ' states');
    await page.setViewportSize({
      width: 1440,
      height: 1000
    });
    await page.goto('http://127.0.0.1:4310/dev/record');
    await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
    await page.locator('.record-inspector summary').click();
    await page.locator('.record-inspector select').selectOption('superadmin');
    await page.locator('.ui-tools-disclosure').click();
    const links = await page.locator('.ui-sidebar a.ui-sidebar-link').evaluateAll(nodes => nodes.map(n => ({
      href: n.getAttribute('href'),
      label: n.getAttribute('aria-label')
    })));
    for (const link of links) {
      await page.goto('http://127.0.0.1:4310/dev/record');
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      await page.locator('.record-inspector summary').click();
      await page.locator('.record-inspector select').selectOption('superadmin');
      await page.locator('.ui-tools-disclosure').click();
      await page.locator(`.ui-sidebar a.ui-sidebar-link[href="${link.href}"]`).click();
      const destinations = { '/admin/record': '/dev/record', '/calendar': '/dev/calendar', '/worklogs': '/dev/history', ...(resourcePhase ? { '/resources':'/dev/resources', '/admin/equipment-items':'/dev/equipment', '/admin/equipment-health':'/dev/equipment/usage' } : {}) };
      if (destinations[link.href]) await page.waitForURL('**' + destinations[link.href]);
      const result = await page.evaluate(() => ({
        path: location.pathname,
        heading: document.querySelector('main h1')?.textContent || '',
        modal: document.querySelector('dialog[open] h2')?.textContent || '',
        status: document.querySelector('.record-live-status')?.textContent || ''
      }));
      report.navigation.push({
        ...link,
        ...result,
        pageImplemented: Boolean(destinations[link.href])
      });
    }
    if (phase === 'after' && !resourcePhase) {
      report.anonymousGuards = [];
      for (const route of report.nextRoutes.filter(row => !row.developmentOnly && !['/login', '/pending', '/'].includes(row.route))) {
        await page.goto('http://127.0.0.1:4310' + route.route, {
          timeout: 90000
        });
        let redirected = true;
        try {
          await page.waitForURL('**/login', {
            timeout: 7000
          });
        } catch {
          redirected = false;
        }
        report.anonymousGuards.push({
          route: route.route,
          redirectedToLogin: redirected,
          finalPath: new URL(page.url()).pathname,
          authenticatedContentVerified: false
        });
        console.log('GUARD ' + route.route + ': ' + redirected);
      }
    }
    report.summary = {
      allPagesReady: false,
      nextRoutes: report.nextRoutes.length,
      developmentRoutes: report.nextRoutes.filter(r => r.developmentOnly).length,
      featurePreviews: report.nextRoutes.filter(r => r.featureMigrated).length,
      approvedViews: report.referenceViews.length,
      referenceStates: report.referenceLayout.length,
      referenceOverflowStates: report.referenceLayout.filter(r => r.overflow).length,
      navigationDestinations: report.navigation.length,
      fullPreviewDestinations: report.navigation.filter(r => r.pageImplemented).length
    };
    assert.equal(report.errors.length, 0);
    report.completed = true;
    console.log(JSON.stringify(report.summary));
  } finally {
    fs.writeFileSync(path.join(out, `coverage-${phase}.json`), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
