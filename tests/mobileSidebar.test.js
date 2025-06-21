const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
// Remove external script tags to keep the test self-contained
const sanitized = html
  .replace(/<script[^>]*src=.*?<\/script>/g, '')
  .replace(/<link[^>]*href=.*?>/g, '');

const dom = new JSDOM(sanitized, { runScripts: 'dangerously', resources: 'usable' });

function waitForDOMContentLoaded() {
  return new Promise((resolve) => {
    if (dom.window.document.readyState === 'complete' || dom.window.document.readyState === 'interactive') {
      resolve();
    } else {
      dom.window.addEventListener('DOMContentLoaded', resolve, { once: true });
    }
  });
}

(async () => {
  await waitForDOMContentLoaded();
  const dash = dom.window.document.getElementById('dashboardContent');
  const cars = dom.window.document.getElementById('carsContent');
  const carsTab = dom.window.document.getElementById('mobileCarsTab');
  if (!carsTab.dataset.section) {
    console.error('data-section missing on mobileCarsTab');
    process.exit(1);
  }
  carsTab.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  const carsVisible = !cars.classList.contains('d-none');
  const dashHidden = dash.classList.contains('d-none');
  if (carsVisible && dashHidden) {
    console.log('Mobile sidebar navigation works');
    process.exit(0);
  } else {
    console.error('Mobile sidebar navigation failed');
    process.exit(1);
  }
})();
