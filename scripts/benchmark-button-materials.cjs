// Comparative headless desktop sample, not a physical-phone FPS certification.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const out = path.resolve(__dirname, '../output/playwright/liquid-glass-button-pilot');
(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).origin === 'http://127.0.0.1:4310' || r.request().url().startsWith('data:') ? r.continue() : r.abort());
  const page = await context.newPage(), report = { completed: false, browserVersion: browser.version(), samples: [], productionDataUsed: false, physicalDeviceBenchmark: false };
  try {
    await page.goto('http://127.0.0.1:4310/dev/ui'); await page.waitForSelector('[data-button-engine=zak]');
    const pane = kind => page.getByRole('region', { name: kind === 'quick' ? 'A · QuickLiquid เดิม' : 'B · Liquid Glass ใหม่', exact: true });
    await pane('quick').getByLabel('ผู้รับบริการตัวอย่าง').fill('ตัวอย่างวัด interaction');
    const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
    let expected = 0;
    for (const kind of ['quick','zak']) {
      const button = pane(kind).getByRole('button', { name: 'บันทึกตัวอย่าง', exact: true });
      await button.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
      const box = await button.boundingBox(); await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
      const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name,x.value]));
      const before = await metrics();
      await page.evaluate(() => {
        window.__buttonFrames = { running: true, gaps: [], start: performance.now(), last: null };
        const sample = time => { const s=window.__buttonFrames; if(!s.running)return; if(s.last!==null)s.gaps.push(time-s.last);s.last=time;requestAnimationFrame(sample); };
        requestAnimationFrame(sample);
      });
      for(let i=0;i<20;i++) { await page.mouse.down(); await page.waitForTimeout(100); await page.mouse.up(); await page.waitForTimeout(250); }
      const frames = await page.evaluate(() => { const s=window.__buttonFrames;s.running=false;return {elapsed:performance.now()-s.start,gaps:s.gaps,quality:document.documentElement.dataset.lgQuality||'auto'}; });
      const after = await metrics(); expected += 20;
      assert.match(await page.getByTestId('button-material-counts').innerText(), new RegExp('บันทึกตัวอย่าง '+expected+' ครั้ง'));
      const gaps=frames.gaps.sort((a,b)=>a-b), percentile=q=>gaps[Math.min(gaps.length-1,Math.floor(gaps.length*q))]||null;
      report.samples.push({engine:kind,submitCount:20,elapsedMs:frames.elapsed,rafSamples:gaps.length,rafMedianMs:percentile(.5),rafP95Ms:percentile(.95),framesOver50ms:gaps.filter(x=>x>50).length,taskDurationSeconds:after.TaskDuration-before.TaskDuration,scriptDurationSeconds:after.ScriptDuration-before.ScriptDuration,heapUsedDeltaBytes:after.JSHeapUsedSize-before.JSHeapUsedSize,adaptiveQuality:frames.quality});
    }
    report.completed=true;
    report.limitations=['One warmed headless desktop context with both A/B panes present','No claim of mobile FPS, battery use or memory-leak absence','Frame timing includes browser automation and host load; metrics are descriptive'];
    console.log(JSON.stringify(report,null,2));
  } finally { fs.writeFileSync(path.join(out,'performance-sample.json'),JSON.stringify(report,null,2)); await browser.close(); }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
