const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to local dev server
  await page.goto('http://localhost:5173/memio/', { waitUntil: 'networkidle0' });
  
  // Wait for calendar to load
  await page.waitForSelector('.grid');
  await new Promise(r => setTimeout(r, 1000));
  
  // Click on the center cell (e.g. 15th cell)
  const cells = await page.$$('.cursor-pointer');
  if (cells.length > 15) {
    const cell = cells[15];
    await cell.click();
    await new Promise(r => setTimeout(r, 500));
    
    // Add 5 events
    for (let i = 1; i <= 5; i++) {
      await page.type('input[placeholder="?¼ì • ?…ë ¥ (Enter)"]', `Test Event ${i}`);
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 800)); // wait for firebase
    }
  }

  // Define zoom levels
  const zooms = [
    { name: '100', scale: 1 },
    { name: '90', scale: 0.9 },
    { name: '110', scale: 1.1 }
  ];

  const artifactDir = 'C:\\Users\\?¼ì„±\\.gemini\\antigravity-ide\\brain\\3052b50b-e82e-4c48-b0e6-d4f16f7b072e';

  for (const zoom of zooms) {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: zoom.scale });
    await new Promise(r => setTimeout(r, 1000)); // wait for resize
    
    await page.screenshot({ 
      path: path.join(artifactDir, `zoom_${zoom.name}.png`),
      fullPage: false
    });
    console.log(`Saved zoom_${zoom.name}.png`);
  }

  await browser.close();
})();
