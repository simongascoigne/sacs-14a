// sync.js
const { chromium } = require('playwright');
const fs = require('fs');

const CLIPBOARD_URL = 'https://fixtures.clipboard.app/isa/fixtures?associationSeasonId=e94f3fa0-158f-11f0-ac93-6bf44416c9ad&associationActivityGradeIds=%5B%22711aa164-d787-11ef-bde6-6911b959edfa%22%5D&organisationIds=%5B472%5D&competitionGroupIds=%5B%222bc0fd94-8c12-4bad-ad4f-50585f703c0b%22%5D&round=_all';

(async () => {
  console.log('Launching headless browser to sync SACS 14A fixtures...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const apiPayloads = [];

  // 1. Intercept background JSON API responses from Clipboard
  page.on('response', async (response) => {
    const contentType = response.headers()['content-type'] || '';
    const url = response.url();
    if (contentType.includes('application/json') && !url.includes('intercom') && !url.includes('sentry')) {
      try {
        const json = await response.json();
        apiPayloads.push({ url, data: json });
      } catch (e) {}
    }
  });

  await page.goto(CLIPBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000); // Ensure all rounds finish rendering

  // 2. Also extract rendered text blocks as a rock-solid fallback
  const domFixtures = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [class*="fixture"], [class*="match"], [class*="row"]'));
    return rows
      .map(r => r.innerText.trim())
      .filter(t => t.includes("St Andrew") || t.includes("SACS") || t.includes("Round"));
  });

  await browser.close();

  const output = {
    team: "St Andrew's 14A",
    updatedAt: new Date().toISOString(),
    sourceUrl: CLIPBOARD_URL,
    apiPayloads,
    domFallback: domFixtures
  };

  fs.writeFileSync('sacs-14a.json', JSON.stringify(output, null, 2));
  console.log('Successfully wrote sacs-14a.json at', output.updatedAt);
})();
