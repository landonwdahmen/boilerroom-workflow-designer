import { vi } from 'vitest';
import api from './api';
import { createNode, emptyGraph } from '../components/playground/graphState';
import { serializeGraph, validateDocument, decodeEnvelope, draftSignature, getGraph, saveGraph } from './graphs';
vi.mock('./api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const projectId = 'a0000000-0000-0000-0000-000000000001';
const envelope = (graph, revision = 1) => ({ projectId, revision, graph,
  createdAt: '2026-10-24T12:00:00Z', updatedAt: '2026-10-24T12:00:00Z' });
const state = () => ({ ...emptyGraph(), nodes: [createNode('apiTrigger','trigger',{ x: 123.5,y: -45 })] });
test('round trip reconstructs trusted catalog defaults and excludes React Flow internals', () => {
  const original = state(); original.nodes[0].selected = true; original.nodes[0].width = 224;
  const graph = serializeGraph(original); const saved = decodeEnvelope(envelope(graph),projectId);
  expect(graph.nodes[0].data.nodeDefinitionId).toBeUndefined();
  expect(graph.nodes[0].selected).toBeUndefined(); expect(saved.state.nodes[0].data.nodeDefinitionId).toBe('apiTrigger');
  expect(saved.state.nodes[0].position).toEqual({ x:123.5,y:-45 });
  expect(draftSignature(saved.state)).toBe(draftSignature(original));
});
test.each(['databaseQuery','customLogic','httpRequest'])('nonempty excluded %s data is rejected rather than discarded', type => {
  const value = { ...emptyGraph(), nodes: [createNode(type,'node',{ x:0,y:0 })] };
  value.nodes[0].data[type === 'databaseQuery' ? 'query' : type === 'customLogic' ? 'code' : 'body'] = 'Synthetic excluded text';
  expect(() => serializeGraph(value)).toThrow('Clear it explicitly');
});
test('label-only disabled placeholders can be saved with empty execution defaults', () => {
  const value = { ...emptyGraph(), nodes: [createNode('databaseQuery','query',{ x:0,y:0 }),createNode('customLogic','code',{ x:1,y:1 })] };
  expect(serializeGraph(value).nodes[0].data).toEqual({ label:'Database Query' });
});
test.each([
  graph => { graph.schemaVersion=2; }, graph => { graph.nodes[0].type='untrusted'; },
  graph => { graph.nodes[0].data.onClick='execute'; }, graph => { graph.nodes[0].position.x=Infinity; },
  graph => { graph.nodes.push(graph.nodes[0]); }, graph => { graph.edges.push({ id:'edge',source:'trigger',target:'missing',sourceHandle:'out',targetHandle:'in',type:'default' }); }
])('malformed or unsupported document cannot reach the renderer', mutate => {
  const graph=serializeGraph(state()); mutate(graph); expect(() => validateDocument(graph)).toThrow();
});
test('credential-bearing metadata and arbitrary headers are rejected', () => {
  const node=createNode('httpRequest','request',{ x:0,y:0 }); const value={ ...emptyGraph(),nodes:[node] };
  node.data.url='https://example.invalid/design?key=synthetic'; expect(() => serializeGraph(value)).toThrow();
  node.data.url='https://example.invalid/design'; node.data.headers='{"Authorization":"synthetic-placeholder"}';
  expect(() => serializeGraph(value)).toThrow(); node.data.headers='{"Content-Type":"application/json"}';
  expect(serializeGraph(value).nodes).toHaveLength(1);
});
test.each([value => { value.projectId='b0000000-0000-0000-0000-000000000001'; }, value => { value.revision=-1; },
  value => { value.createdAt='invalid'; }, value => { value.revision=0; }])('invalid API envelope is rejected safely', mutate => {
  const value=envelope(serializeGraph(state())); mutate(value); expect(() => decodeEnvelope(value,projectId)).toThrow('No graph was loaded');
});
test('GET decodes and PUT uses expected revision plus full replacement', async () => {
  const value=state(); const graph=serializeGraph(value);
  api.get.mockResolvedValue({ data:envelope(graph,2) }); api.put.mockResolvedValue({ data:envelope(graph,3) });
  expect((await getGraph(projectId)).revision).toBe(2);
  expect((await saveGraph(projectId,2,value)).revision).toBe(3);
  expect(api.put).toHaveBeenCalledWith('/auth/projects/'+projectId+'/graph',{ expectedRevision:2,graph });
});
test('unexpected save revision or content is not reported as success', async () => {
  api.put.mockResolvedValue({ data:envelope(serializeGraph(state()),4) });
  await expect(saveGraph(projectId,2,state())).rejects.toThrow('Save response could not be verified');
});
test('aggregate bound applies even when individual fields fit', () => {
  const value={ ...emptyGraph(),nodes:Array.from({ length:100 },(_,i)=>createNode('apiTrigger','n'+i,{ x:i,y:i })) };
  expect(() => serializeGraph(value)).toThrow('12 KiB');
});
