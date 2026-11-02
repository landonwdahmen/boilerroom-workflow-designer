import { createNode, reduceGraph, emptyGraph, connectionError, GRAPH_LIMITS } from './graphState';
import { NODE_DEFINITIONS, validateNode } from '../../config/playgroundNodes';
const add = (state, nodeType, id) => reduceGraph(state, { type: 'add', nodeType, id, position: { x: 20, y: 30 } }, true);
const connect = (state, source, target) => reduceGraph(state, { type: 'connect', connection: { source, target, sourceHandle: 'out', targetHandle: 'in' } }, true);
const patch = (state, id, property, value, editable = true) => reduceGraph(state, { type: 'update', id, property, value }, editable);

test.each(NODE_DEFINITIONS.map(node => [node.id]))('adds %s with its registered renderer and bounded editable properties', type => {
  const graph = add(emptyGraph(), type, 'n1');
  expect(graph.nodes[0]).toMatchObject({ type, id: 'n1', position: { x: 20, y: 30 }, data: { nodeDefinitionId: type } });
  expect(graph.nodes[0].data.label).toBeTruthy();
});
test('rejects unknown types, duplicate IDs, unbounded nodes and nonfinite positions', () => {
  expect(add(emptyGraph(), '__proto__', 'n1').nodes).toHaveLength(0);
  const state = add(emptyGraph(), 'apiTrigger', 'n1');
  expect(add(state, 'apiTrigger', 'n1').nodes).toHaveLength(1);
  expect(createNode('apiTrigger', 'n2', { x: NaN, y: 1 })).toBeNull();
  let full = emptyGraph(); for (let i = 0; i < GRAPH_LIMITS.nodes; i++) full = add(full, 'apiTrigger', 'n' + i);
  expect(add(full, 'apiTrigger', 'extra').nodes).toHaveLength(100);
  expect(add(full, 'apiTrigger', 'extra').error).toContain('100');
});
test('connects endpoints and rejects missing, self, reversed, duplicate and cyclic edges', () => {
  let state = add(add(add(emptyGraph(), 'apiTrigger', 'a'), 'httpRequest', 'b'), 'sendResponse', 'c');
  state = connect(connect(state, 'a', 'b'), 'b', 'c');
  expect(state.edges).toHaveLength(2);
  expect(connect(state, 'missing', 'b').edges).toHaveLength(2);
  expect(connect(state, 'b', 'b').error).toContain('itself');
  expect(connect(state, 'b', 'a').error).toContain('output');
  expect(connect(state, 'c', 'b').error).toContain('output');
  expect(connect(state, 'a', 'b').error).toContain('already');
  let cycle = add(add(emptyGraph(), 'httpRequest', 'a'), 'httpRequest', 'b');
  cycle = connect(cycle, 'a', 'b');
  expect(connect(cycle, 'b', 'a').error).toContain('cycle');
  expect(connectionError(state.nodes, state.edges, { source: 'a', target: 'c', sourceHandle: 'wrong', targetHandle: 'in' })).toContain('output');
});

test('new edges stay bounded and avoid IDs already loaded from persisted graphs', () => {
  const source = 'a'.repeat(100), target = 'b'.repeat(100);
  let state = add(add(add(emptyGraph(), 'httpRequest', source), 'httpRequest', target), 'sendResponse', 'end');
  state = connect(connect(state, source, target), source, 'end');
  state.edges[0].id = 'edge_3'; state.edges[1].id = 'edge_4';
  state = connect(state, target, 'end');
  expect(state.edges.map(edge => edge.id)).toEqual(['edge_3','edge_4','edge_5']);
  expect(state.edges.every(edge => edge.id.length <= 100)).toBe(true);
});
test('edge limit is enforced without adding dangling data', () => {
  const state = add(add(emptyGraph(), 'httpRequest', 'a'), 'httpRequest', 'b');
  expect(connectionError(state.nodes, Array.from({ length: 200 }, (_, i) => ({ source: 'other'+i, target: 'end'+i })),
    { source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' })).toContain('200');
});
test('position, selection and edits retain latest state and do not mutate prior snapshots', () => {
  const before = add(emptyGraph(), 'apiTrigger', 'a');
  const edited = patch(patch(before, 'a', 'label', 'Synthetic label'), 'a', 'path', '/synthetic');
  const moved = reduceGraph(edited, { type: 'nodes', changes: [{ type: 'position', id: 'a', position: { x: 60, y: 90 } }, { type: 'select', id: 'a', selected: true }] }, true);
  expect(before.nodes[0].data.label).toBe('API Trigger');
  expect(moved.nodes[0]).toMatchObject({ selected: true, position: { x: 60, y: 90 }, data: { label: 'Synthetic label', path: '/synthetic' } });
});
test('node removal deletes incident edges atomically while preserving unrelated nodes/edges', () => {
  let state = add(add(add(emptyGraph(), 'httpRequest', 'a'), 'httpRequest', 'b'), 'httpRequest', 'c');
  state = connect(connect(state, 'a', 'b'), 'a', 'c');
  state = reduceGraph(state, { type: 'nodes', changes: [{ type: 'remove', id: 'b' }] }, true);
  expect(state.nodes.map(n => n.id)).toEqual(['a','c']);
  expect(state.edges.map(edge => edge.target)).toEqual(['c']);
});
test('edge-only and selected-node deletion preserve consistent state', () => {
  let state = connect(add(add(emptyGraph(), 'httpRequest', 'a'), 'httpRequest', 'b'), 'a', 'b');
  state = reduceGraph(state, { type: 'edges', changes: [{ type: 'select', id: state.edges[0].id, selected: true }] }, true);
  state = reduceGraph(state, { type: 'nodes', changes: [{ type: 'select', id: 'b', selected: false }] }, true);
  state = reduceGraph(state, { type: 'deleteSelection' }, true);
  expect(state.edges).toHaveLength(0); expect(state.nodes).toHaveLength(2);
  state = reduceGraph(state, { type: 'nodes', changes: [{ type: 'select', id: 'a', selected: true }] }, true);
  expect(reduceGraph(state, { type: 'deleteSelection' }, true).nodes.map(n => n.id)).toEqual(['b']);
});
test('unknown properties, prototype keys, type changes, oversized text and invalid method are rejected', () => {
  const state = add(emptyGraph(), 'apiTrigger', 'a');
  for (const [key, value] of [['__proto__','x'], ['nodeDefinitionId','customLogic'], ['label','a'.repeat(101)], ['method','EXECUTE'], ['path', {}]]) {
    const next = patch(state, 'a', key, value);
    expect(next.nodes).toBe(state.nodes); expect(next.error).toBeTruthy();
  }
  expect({}.polluted).toBeUndefined();
});
test('read-only callbacks allow inspection but never add/move/edit/connect/delete nodes or edges', () => {
  const state = connect(add(add(emptyGraph(), 'httpRequest', 'a'), 'httpRequest', 'b'), 'a', 'b');
  for (const action of [{ type: 'add', nodeType: 'apiTrigger', id: 'new', position: { x: 0, y: 0 } }, { type: 'deleteSelection' },
    { type: 'connect', connection: { source: 'b', target: 'a' } }, { type: 'update', id: 'a', property: 'label', value: 'changed' }]) {
    expect(reduceGraph(state, action, false)).toBe(state);
  }
  expect(reduceGraph(state, { type: 'nodes', changes: [{ type: 'position', id: 'a', position: { x: 99, y: 99 } }, { type: 'remove', id: 'b' }] }, false).nodes).toEqual(state.nodes);
  expect(reduceGraph(state, { type: 'edges', changes: [{ type: 'remove', id: state.edges[0].id }] }, false).edges).toEqual(state.edges);
  expect(reduceGraph(state, { type: 'nodes', changes: [{ type: 'select', id: 'a', selected: true }] }, false).nodes[0].selected).toBe(true);
});
test('validation uses type metadata rather than instance ID and handles JSON text safely', () => {
  expect(validateNode(createNode('apiTrigger','apiTrigger_128',{ x: 0, y: 0 })).isValid).toBe(true);
  let state = add(emptyGraph(), 'sqlTable', 't');
  state = patch(patch(state, 't','tableName','synthetic'), 't','columns','[{"name":"id","type":"INTEGER"}]');
  expect(validateNode(state.nodes[0]).isValid).toBe(true);
  expect(validateNode(patch(state,'t','columns','not JSON').nodes[0]).isValid).toBe(false);
  const badUrl = patch(add(emptyGraph(),'httpRequest','h'),'h','url','javascript:window.syntheticCanary=true');
  expect(validateNode(badUrl.nodes[0]).isValid).toBe(false);
  expect(validateNode({ id: 'unknown', type: 'unknown', data: {} }).isValid).toBe(false);
});
test('code/HTML/SQL-shaped input remains inert text through edits and validation', () => {
  delete window.syntheticEditorCanary;
  const payload = 'window.syntheticEditorCanary=true; fetch("https://outside.invalid");';
  let state = add(emptyGraph(), 'customLogic', 'c');
  state = patch(patch(state,'c','code',payload),'c','label','<img src=x onerror="window.syntheticEditorCanary=true">');
  expect(validateNode(state.nodes[0]).isValid).toBe(true);
  expect(state.nodes[0].data.code).toBe(payload);
  expect(window.syntheticEditorCanary).toBeUndefined();
});
