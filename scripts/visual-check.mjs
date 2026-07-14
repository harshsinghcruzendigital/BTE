import { chromium } from 'playwright-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.SITE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: edgePath, headless: true });

const routes = [
  { path: '/', id: 'home' },
  { path: '/about', id: 'about' },
  { path: '/solutions', id: 'solutions' },
  { path: '/process', id: 'process' },
  { path: '/impact', id: 'impact' },
  { path: '/projects', id: 'projects' },
  { path: '/contact', id: 'contact' },
];

const checks = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const check of checks) {
  const page = await browser.newPage({
    viewport: { width: check.width, height: check.height },
    deviceScaleFactor: 1,
  });
  const routeResults = [];

  for (const route of routes) {
    const consoleErrors = [];
    const onConsole = (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    };
    page.on('console', onConsole);

    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    await page.locator(`#${route.id}`).waitFor({ state: 'visible' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `qa-${check.name}-${route.id}.png` });

    const metrics = await page.evaluate(({ id, path }) => {
      const primaryPage = document.getElementById(id);
      const pageBox = primaryPage?.getBoundingClientRect();
      const activeLink = document.querySelector('.desktop-nav a.active');
      return {
        path: window.location.pathname,
        expectedPath: path,
        primaryPages: document.querySelectorAll('.route-main > section:not(.closing-cta)').length,
        visible: Boolean(primaryPage && pageBox && pageBox.height > 100 && getComputedStyle(primaryPage).opacity !== '0'),
        textLength: primaryPage?.innerText.trim().length || 0,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        activeHref: activeLink?.getAttribute('href') || null,
        accent: getComputedStyle(document.documentElement).getPropertyValue('--green-700').trim(),
        buttonBackground: getComputedStyle(document.querySelector('.button') || document.body).backgroundImage,
      };
    }, route);

    routeResults.push({ id: route.id, ...metrics, consoleErrors });
    page.off('console', onConsole);
  }

  await page.goto(`${baseUrl}/projects`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Biogas', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.project-card').length === 2);
  const filteredProjects = await page.locator('.project-card').count();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.play-card').click();
  const videoSource = await page.locator('.video-dialog source').getAttribute('src');
  await page.locator('.video-dialog > button').click();
  await page.locator('.icon-button').click();
  const darkTheme = await page.evaluate(() => document.documentElement.dataset.theme === 'dark');
  await page.locator('.icon-button').click();

  let mobileNavigation = null;
  if (check.width <= 900) {
    await page.locator('.menu-button').click();
    mobileNavigation = await page.locator('.mobile-nav.open').isVisible();
    await page.locator('.mobile-nav a[href="/solutions"]').click();
    await page.locator('#solutions').waitFor({ state: 'visible' });
  } else {
    await page.locator('.desktop-nav a[href="/solutions"]').click();
    await page.locator('#solutions').waitFor({ state: 'visible' });
  }

  console.log(JSON.stringify({
    viewport: check.name,
    routes: routeResults,
      interactions: {
        filteredProjects,
        videoSource,
        darkTheme,
        mobileNavigation,
        navigationPath: new URL(page.url()).pathname,
      },
  }));
  await page.close();
}

await browser.close();
