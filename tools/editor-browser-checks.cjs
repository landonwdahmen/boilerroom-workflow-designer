// M4A: real React Flow interactions; no graph execution, storage or external services.
const path = require('node:path');
module.exports = async function verifyEditor({ admin, developer, projectId, check, reportDirectory }) {
  const nodes = page => page.locator('.react-flow__node');
  const edges = page => page.locator('.react-flow__edge');
  const node = (page, id) => page.locator('.react-flow__node[data-id="' + id + '"]');
  const waitCount = (page, selector, count) => page.waitForFunction(({ selector, count }) => document.querySelectorAll(selector).length === count, { selector, count });
  const types = ['API Trigger','HTTP Request','Database Query','Custom Logic','Send Response','SQL Table'];
  await admin.goto('https://localhost:3000/playground/' + projectId);
  await admin.getByText('Empty local draft. Add a building block to begin.', { exact: true }).waitFor();
  check('Editor empty local draft is explicit', await admin.getByText('Empty local draft. Add a building block to begin.', { exact: true }).isVisible());
  check('Editor has no execution or generation control', await admin.getByRole('button', { name: /Generate Implementation|Run flow/ }).count() === 0);
  for (const label of types) await admin.getByRole('button', { name: 'Add ' + label, exact: true }).click();
  await waitCount(admin, '.react-flow__node', 6);
  check('Editor adds all six existing categories', await nodes(admin).count() === 6);
  const trigger = node(admin, 'apiTrigger_1'), http = node(admin, 'httpRequest_2'), database = node(admin, 'databaseQuery_3');
  const custom = node(admin, 'customLogic_4'), response = node(admin, 'sendResponse_5'), table = node(admin, 'sqlTable_6');
  check('Trigger uses custom renderer with output only', await trigger.locator('h3').count() === 1 && await trigger.locator('.source').count() === 1 && await trigger.locator('.target').count() === 0);
  check('Response uses custom renderer with input only', await response.locator('h3').count() === 1 && await response.locator('.target').count() === 1 && await response.locator('.source').count() === 0);
  await http.locator('h3').click();
  await admin.getByLabel('URL *', { exact: true }).fill('https://outside.invalid/inert-metadata');
  await admin.getByLabel('Method *', { exact: true }).selectOption('POST');
  await admin.getByLabel('Headers', { exact: true }).fill('{');
  check('Invalid JSON has visible configuration guidance', await admin.getByText(/Incomplete configuration: Headers needs valid JSON/).isVisible());
  await admin.getByLabel('Headers', { exact: true }).fill('{"Content-Type":"application/json"}');
  await admin.getByLabel('Request Body', { exact: true }).fill('{"synthetic":true}');
  await trigger.locator('h3').click();
  await admin.getByLabel('Path *', { exact: true }).fill('/synthetic-descriptive-path');
  await http.locator('h3').click();
  check('Properties survive deselection and reselection', await admin.getByLabel('URL *', { exact: true }).inputValue() === 'https://outside.invalid/inert-metadata' && await admin.getByLabel('Method *', { exact: true }).inputValue() === 'POST');
  await database.locator('h3').click();
  await admin.getByLabel('Query', { exact: true }).fill('SELECT synthetic_metadata_only;');
  await table.locator('h3').click();
  await admin.getByLabel('Table Name *', { exact: true }).fill('synthetic_metadata_table');
  await admin.getByLabel('Columns *', { exact: true }).fill('[{"name":"id","type":"INTEGER"}]');
  check('Table configuration accepts JSON text without creating a table', await admin.getByText(/Incomplete configuration:/).count() === 0);
  await custom.locator('h3').click();
  await admin.getByLabel('Code notes (never executed)', { exact: true }).fill('window.syntheticEditorCanary=true; fetch("https://outside.invalid/never-call");');
  await admin.getByLabel('Label', { exact: true }).fill('<img src=x onerror="window.syntheticEditorCanary=true">');
  check('Code and HTML remain inert in real browser', await admin.evaluate(() => window.syntheticEditorCanary === undefined) && await custom.locator('img,script,iframe').count() === 0);
  await admin.getByLabel('Label', { exact: true }).fill('Synthetic custom notes');
  await admin.getByLabel('Label', { exact: true }).press('End');
  await admin.getByLabel('Label', { exact: true }).press('Backspace');
  check('Backspace in property input edits text without deleting nodes', await nodes(admin).count() === 6 && await admin.getByLabel('Label', { exact: true }).inputValue() === 'Synthetic custom note');
  // React Flow may auto-zoom the first added node. Fit all measured nodes before coordinate-driven gestures.
  await admin.locator('.react-flow__controls-fitview').click();
  await admin.waitForFunction(() => {
    const bounds = document.querySelector('.react-flow__pane').getBoundingClientRect();
    return Array.from(document.querySelectorAll('.react-flow__node')).every(element => {
      const rect = element.getBoundingClientRect();
      return rect.left >= bounds.left && rect.top >= bounds.top && rect.right <= bounds.right && rect.bottom <= bounds.bottom;
    });
  });
  const before = await http.boundingBox();
  const header = await http.locator('h3').boundingBox();
  await admin.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
  await admin.mouse.down(); await admin.mouse.move(header.x + header.width / 2 + 55, header.y + header.height / 2 + 45, { steps: 12 }); await admin.mouse.up();
  const after = await http.boundingBox();
  if (Math.abs(after.x - before.x) <= 30 || Math.abs(after.y - before.y) <= 20) {
    // Numeric geometry only; never dump node metadata or browser content.
    console.log(JSON.stringify({ dragGeometry: { before, after, header } }));
  }
  check('Node position changes through real drag', Math.abs(after.x - before.x) > 30 && Math.abs(after.y - before.y) > 20);
  async function connect(from, to) {
    const source = await from.locator('.source').boundingBox(), target = await to.locator('.target').boundingBox();
    await admin.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await admin.mouse.down(); await admin.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 }); await admin.mouse.up();
  }
  await connect(trigger, http); await waitCount(admin, '.react-flow__edge', 1);
  await connect(http, response); await waitCount(admin, '.react-flow__edge', 2);
  check('Nodes connect through real handles', await edges(admin).count() === 2);
  await connect(trigger, http);
  check('Duplicate connection is rejected by canvas', await edges(admin).count() === 2);
  // Select the actual SVG edge using a point on its curve, then delete only that edge.
  const point = await edges(admin).first().locator('.react-flow__edge-interaction').evaluate(element => {
    const p = element.getPointAtLength(element.getTotalLength() * 0.4);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(element.getScreenCTM());
    return { x: screen.x, y: screen.y };
  });
  await admin.mouse.click(point.x, point.y);
  await admin.getByRole('button', { name: 'Delete selection', exact: true }).click();
  await waitCount(admin, '.react-flow__edge', 1);
  check('Selected edge removal preserves nodes', await nodes(admin).count() === 6 && await edges(admin).count() === 1);
  await http.locator('h3').click();
  await admin.getByRole('button', { name: 'Delete selection', exact: true }).click();
  await waitCount(admin, '.react-flow__node', 5);
  check('Node removal also removes incident edges', await edges(admin).count() === 0);
  await table.locator('h3').click();
  await admin.keyboard.press('Delete');
  await waitCount(admin, '.react-flow__node', 4);
  check('Canvas Delete shortcut removes selected node', await table.count() === 0);
  // Native drag/drop uses a known type ID and actual canvas coordinates; unknown types are rejected.
  const canvas = admin.locator('.react-flow__pane');
  const bounds = await canvas.boundingBox();
  const transfer = await admin.evaluateHandle(() => new DataTransfer());
  await admin.evaluate(data => data.setData('application/reactflow-nodetypeid','apiTrigger'), transfer);
  await canvas.dispatchEvent('drop', { dataTransfer: transfer, clientX: bounds.x + 250, clientY: bounds.y + 500 });
  await waitCount(admin, '.react-flow__node', 5);
  check('Native type-ID drop creates a node', await nodes(admin).count() === 5);
  await admin.evaluate(data => data.setData('application/reactflow-nodetypeid','unexpected-untrusted-type'), transfer);
  await canvas.dispatchEvent('drop', { dataTransfer: transfer, clientX: bounds.x + 150, clientY: bounds.y + 400 });
  check('Unexpected drop is rejected safely', await admin.getByRole('alert').isVisible() && await nodes(admin).count() === 5);
  await admin.screenshot({ path: path.join(reportDirectory, 'administrator-editor.png'), fullPage: true });
  await admin.evaluate(() => window.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'r') window.syntheticRefreshPrevented = event.defaultPrevented;
  }));
  await admin.keyboard.press('Control+r');
  check('Refresh shortcut is not intercepted to execute a graph', await admin.evaluate(() => window.syntheticRefreshPrevented !== true));
  // CDP keyboard events do not reliably invoke native browser accelerators in headless Edge.
  admin.once('dialog', dialog => dialog.accept());
  await admin.reload();
  await admin.getByText('Empty local draft. Add a building block to begin.', { exact: true }).waitFor();
  check('Explicit page reload clears unsaved draft without execution', await nodes(admin).count() === 0 && await admin.evaluate(() => window.syntheticEditorCanary === undefined));
  await developer.goto('https://localhost:3000/playground/' + projectId);
  await developer.getByText('Read-only: developers may inspect assigned projects.', { exact: true }).waitFor();
  for (const label of types) check('Developer cannot add ' + label, await developer.getByRole('button', { name: 'Add ' + label, exact: true }).isDisabled());
  const developerCanvas = developer.locator('.react-flow__pane');
  const developerTransfer = await developer.evaluateHandle(() => { const value = new DataTransfer(); value.setData('application/reactflow-nodetypeid','apiTrigger'); return value; });
  await developerCanvas.dispatchEvent('drop', { dataTransfer: developerTransfer, clientX: 500, clientY: 400 });
  await developer.keyboard.press('Delete');
  check('Developer drop and keyboard mutation are denied', await nodes(developer).count() === 0 && await developer.getByRole('button', { name: 'Delete selection', exact: true }).isDisabled());
  check('Read-only canvas has no interactivity unlock', await developer.locator('.react-flow__controls-interactive').count() === 0);
  check('Read-only empty graph does not pretend to load an admin draft', await developer.getByText('No saved graph is available.', { exact: true }).isVisible());
};
