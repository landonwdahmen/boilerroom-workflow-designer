// October 2026: real Edge save/load/conflict checks. All graph content is synthetic design metadata.
const path = require('node:path');
module.exports = async function verifyGraphStorage({ admin, developer, projectId, check, reportDirectory, refreshDeveloper }) {
  const url = 'https://localhost:3000/playground/' + projectId;
  const nodes = page => page.locator('.react-flow__node');
  const node = (page,id) => page.locator('.react-flow__node[data-id="' + id + '"]');
  async function read(page) {
    return page.evaluate(async id => {
      const response = await fetch('https://localhost:8836/api/auth/projects/' + id + '/graph', { credentials: 'include', cache: 'no-store' });
      if (response.status !== 200) throw new Error('Graph read failed');
      return response.json(); // Only this task's synthetic graph, never session/CSRF payloads.
    }, projectId);
  }
  async function save(page, status=200) {
    const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/graph') && r.request().method() === 'PUT');
    await page.getByRole('button', { name:'Save graph',exact:true }).click();
    check('Explicit graph save HTTP ' + status, (await response).status() === status);
  }
  async function fit(page) {
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForFunction(() => {
      const pane=document.querySelector('.react-flow__pane').getBoundingClientRect();
      return Array.from(document.querySelectorAll('.react-flow__node')).every(element => {
        const box=element.getBoundingClientRect(); return box.left>=pane.left && box.top>=pane.top && box.right<=pane.right && box.bottom<=pane.bottom;
      });
    });
  }
  await admin.goto(url); await admin.getByText('No saved graph yet.',{ exact:true }).waitFor();
  for (const label of ['API Trigger','HTTP Request','Database Query','Custom Logic','Send Response','SQL Table'])
    await admin.getByRole('button', { name:'Add '+label,exact:true }).click();
  const trigger=node(admin,'apiTrigger_1'), request=node(admin,'httpRequest_2'), response=node(admin,'sendResponse_5');
  await request.locator('h3').click();
  await admin.getByLabel('URL *',{ exact:true }).fill('https://example.invalid/synthetic-design');
  await admin.getByLabel('Method *',{ exact:true }).selectOption('POST');
  await admin.getByLabel('Headers',{ exact:true }).fill('{"Content-Type":"application/json"}');
  await node(admin,'sqlTable_6').locator('h3').click();
  await admin.getByLabel('Table Name *',{ exact:true }).fill('synthetic_saved_metadata');
  await admin.getByLabel('Columns *',{ exact:true }).fill('[{"name":"id","type":"INTEGER","primaryKey":true}]');
  await node(admin,'customLogic_4').locator('h3').click();
  await admin.getByLabel('Code notes (never executed)',{ exact:true }).fill('synthetic excluded code');
  await admin.getByRole('button',{ name:'Save graph',exact:true }).click();
  check('Excluded code is rejected visibly without silent discard', await admin.getByRole('alert').isVisible() &&
    await admin.getByLabel('Code notes (never executed)',{ exact:true }).inputValue()==='synthetic excluded code' && (await read(admin)).revision===0);
  await admin.getByLabel('Code notes (never executed)',{ exact:true }).fill('');
  await admin.getByLabel('Label',{ exact:true }).fill('<img src=x onerror="window.syntheticSavedCanary=true">');
  check('Unsaved edits never claim persistence', await admin.getByText('Unsaved changes — not persisted.',{ exact:true }).isVisible());
  // Explicit in-app navigation must offer discard; cancellation retains the entered graph.
  let warning=false;
  admin.once('dialog', async dialog => { warning=dialog.type()==='confirm'; await dialog.dismiss(); });
  await admin.getByRole('button',{ name:'Back to dashboard',exact:true }).click();
  check('Unsaved navigation cancellation retains graph',warning && admin.url()===url && await nodes(admin).count()===6);
  await fit(admin);
  const header=await request.locator('h3').boundingBox();
  await admin.mouse.move(header.x+header.width/2,header.y+header.height/2); await admin.mouse.down();
  await admin.mouse.move(header.x+header.width/2+40,header.y+header.height/2+25,{ steps:12 }); await admin.mouse.up();
  async function connect(from,to) {
    const a=await from.locator('.source').boundingBox(),b=await to.locator('.target').boundingBox();
    await admin.mouse.move(a.x+a.width/2,a.y+a.height/2); await admin.mouse.down();
    await admin.mouse.move(b.x+b.width/2,b.y+b.height/2,{ steps:15 }); await admin.mouse.up();
  }
  await connect(trigger,request); await connect(request,response);
  await admin.waitForFunction(()=>document.querySelectorAll('.react-flow__edge').length===2);
  await save(admin); await admin.getByText('Saved graph — revision 1.',{ exact:true }).waitFor();
  const first=await read(admin);
  check('Initial browser graph has six categories and two persisted edges',first.revision===1 && first.graph.nodes.length===6 && first.graph.edges.length===2);
  check('Persistence strips runtime fields and excluded execution defaults',first.graph.nodes.every(item=>!('selected' in item) && !('nodeDefinitionId' in item.data) && !('code' in item.data) && !('query' in item.data)));
  await admin.reload(); await admin.getByText('Saved graph — revision 1.',{ exact:true }).waitFor();
  check('Refresh restores committed nodes and edges',await nodes(admin).count()===6 && await admin.locator('.react-flow__edge').count()===2);
  await request.locator('h3').click();
  check('Refresh restores node properties',await admin.getByLabel('URL *',{ exact:true }).inputValue()==='https://example.invalid/synthetic-design' &&
    await admin.getByLabel('Method *',{ exact:true }).inputValue()==='POST');
  check('Reloaded HTML label remains escaped inert text',await node(admin,'customLogic_4').locator('img,script,iframe').count()===0 && await admin.evaluate(()=>window.syntheticSavedCanary===undefined));
  await admin.getByRole('button',{ name:'Back to dashboard',exact:true }).click();
  await admin.goto(url); await admin.getByText('Saved graph — revision 1.',{ exact:true }).waitFor();
  const reopened=await read(admin);
  check('Reopening project restores positions, edges and properties',JSON.stringify(reopened.graph)===JSON.stringify(first.graph) && await nodes(admin).count()===6);
  // A separate tab loads revision 1 before the first tab commits revision 2.
  const stale=await admin.context().newPage(); stale.setDefaultTimeout(15000);
  await stale.goto(url); await stale.getByText('Saved graph — revision 1.',{ exact:true }).waitFor();
  await trigger.locator('h3').click(); await admin.getByLabel('Label',{ exact:true }).fill('Synthetic browser revision two');
  await save(admin); await admin.getByText('Saved graph — revision 2.',{ exact:true }).waitFor();
  await node(stale,'apiTrigger_1').locator('h3').click(); await stale.getByLabel('Label',{ exact:true }).fill('Synthetic stale draft retained');
  await save(stale,409);
  check('Stale conflict preserves local content and blocks blind retry',await stale.getByRole('alert').isVisible() &&
    await stale.getByLabel('Label',{ exact:true }).inputValue()==='Synthetic stale draft retained' && await stale.getByRole('button',{ name:'Save graph',exact:true }).isDisabled());
  const second=await read(admin);
  check('Conflict leaves newer committed graph intact',second.revision===2 && second.graph.nodes.find(item=>item.id==='apiTrigger_1').data.label==='Synthetic browser revision two');
  stale.once('dialog',dialog=>dialog.accept()); await stale.getByRole('button',{ name:'Reload saved graph',exact:true }).click();
  await stale.getByText('Saved graph — revision 2.',{ exact:true }).waitFor();
  await node(stale,'apiTrigger_1').locator('h3').click();
  check('Explicit conflict reload displays newer committed data',await stale.getByLabel('Label',{ exact:true }).inputValue()==='Synthetic browser revision two');
  await stale.close();
  await refreshDeveloper();
  await developer.goto(url); await developer.getByText('Saved graph — revision 2.',{ exact:true }).waitFor();
  await node(developer,'apiTrigger_1').locator('h3').click();
  check('Assigned developer inspects persisted graph read-only',await nodes(developer).count()===6 && await developer.locator('.react-flow__edge').count()===2 &&
    await developer.getByLabel('Label',{ exact:true }).inputValue()==='Synthetic browser revision two' && await developer.getByLabel('Label',{ exact:true }).getAttribute('readonly')!==null &&
    await developer.getByRole('button',{ name:'Save graph',exact:true }).count()===0);
  await developer.keyboard.press('Delete');
  check('Populated developer graph cannot be deleted',await nodes(developer).count()===6 && await developer.getByRole('button',{ name:'Delete selection',exact:true }).isDisabled());
  await developer.screenshot({ path:path.join(reportDirectory,'developer-saved-graph.png'),fullPage:true });
  await admin.screenshot({ path:path.join(reportDirectory,'administrator-saved-graph.png'),fullPage:true });
  // Malformed storage responses are denied before mounting the graph renderer.
  await admin.route('**/api/auth/projects/'+projectId+'/graph',route=>route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify({ projectId,revision:2,graph:{ schemaVersion:999,nodes:[],edges:[] } }) }));
  await admin.reload(); await admin.getByRole('alert').waitFor();
  check('Invalid graph response fails safely without editable canvas',await admin.locator('.react-flow').count()===0 &&
    await admin.getByRole('alert').innerText()==='The API returned an invalid or unsupported saved graph. No graph was loaded.');
  await admin.unroute('**/api/auth/projects/'+projectId+'/graph');
  await admin.getByRole('button',{ name:'Reload saved graph',exact:true }).click();
  await admin.getByText('Saved graph — revision 2.',{ exact:true }).waitFor();
};
