// sync.js
const { chromium } = require('playwright');
const fs = require('fs');

// Notice we removed organisationIds=[472] so we get ALL games in 14s Div 2 to build the full division ladder!
const FIXTURES_URL = 'https://fixtures.clipboard.app/isa/fixtures?associationSeasonId=e94f3fa0-158f-11f0-ac93-6bf44416c9ad&associationActivityGradeIds=%5B%22711aa164-d787-11ef-bde6-6911b959edfa%22%5D&competitionGroupIds=%5B%222bc0fd94-8c12-4bad-ad4f-50585f703c0b%22%5D&round=_all';

const LADDER_URL = 'https://fixtures.clipboard.app/isa/ladder?associationSeasonId=e94f3fa0-158f-11f0-ac93-6bf44416c9ad&associationActivityGradeIds=%5B%22711aa164-d787-11ef-bde6-6911b959edfa%22%5D&competitionGroupIds=%5B%222bc0fd94-8c12-4bad-ad4f-50585f703c0b%22%5D';

(async () => {
  console.log('Syncing 14s Div 2 fixtures and ladder...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Scrape all 14s Division 2 fixtures
  await page.goto(FIXTURES_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  const domFixtures = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [class*="fixture"], [class*="match"], [class*="row"]'));
    return rows
      .map(r => r.innerText.trim())
      .filter(t => t.startsWith('Round '));
  });

  // 2. Scrape official ladder page rows (if published)
  await page.goto(LADDER_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const domLadder = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [class*="ladder"], [class*="table"], [class*="row"]'));
    return rows.map(r => r.innerText.trim()).filter(Boolean);
  });

  await browser.close();

  const output = {
    team: "St Andrew's 14A",
    division: "14s - Division 2",
    updatedAt: new Date().toISOString(),
    domFallback: domFixtures,
    domLadder: domLadder
  };

  fs.writeFileSync('sacs-14a.json', JSON.stringify(output, null, 2));
  console.log('Successfully updated sacs-14a.json with full division fixtures & ladder!');
})();
