// October 2026: transport only for declarative graphs; never evaluate or fetch node configuration.
import api from './api';
import { createNode, connectionError } from '../components/playground/graphState';
import { getNodeDefinition } from '../config/playgroundNodes';

const fields = {
  apiTrigger: ['label', 'path', 'method'], httpRequest: ['label', 'url', 'method', 'headers'],
  databaseQuery: ['label'], customLogic: ['label'], sendResponse: ['label', 'statusCode', 'headers'],
  sqlTable: ['label', 'tableName', 'columns']
};
const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const object = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).every(key => keys.includes(key));
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max &&
  !Array.from(value).some(character => character.charCodeAt(0) < 32 || (character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159));
const identifier = value => typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(value);
const fail = () => { throw new Error('Graph is invalid or unsupported. Check labels, connections and the documented design-only fields.'); };
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;

export function validateDocument(graph) {
  if (!object(graph, ['schemaVersion','nodes','edges']) || graph.schemaVersion !== 1 || !Array.isArray(graph.nodes) ||
      !Array.isArray(graph.edges) || graph.nodes.length > 100 || graph.edges.length > 200 || bytes(graph) > 12288) fail();
  const ids = new Set();
  for (const node of graph.nodes) {
    const allowed = fields[node?.type];
    if (!allowed || !object(node, ['id','type','position','data']) || !idPattern.test(node.id) || ids.has(node.id) ||
        !object(node.position, ['x','y']) || !createNode(node.type, node.id, node.position) || !object(node.data, allowed) ||
        !text(node.data.label, 100) || Object.values(node.data).some(value => typeof value !== 'string' || value.length > 4096)) fail();
    ids.add(node.id);
    const data = node.data;
    if (['apiTrigger','httpRequest'].includes(node.type) && !['GET','POST','PUT','DELETE','PATCH'].includes(data.method)) fail();
    if (node.type === 'apiTrigger' && (!text(data.path, 4096) || !data.path.startsWith('/') || /[?#]/.test(data.path))) fail();
    if (node.type === 'httpRequest') {
      try {
        const url = new URL(data.url);
        if (!text(data.url, 4096) || !['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) fail();
      } catch { fail(); }
    }
    if (node.type === 'sendResponse' && !/^[1-5][0-9]{2}$/.test(data.statusCode)) fail();
    if (data.headers) {
      try {
        const headers = JSON.parse(data.headers);
        if (!object(headers, ['Accept','Content-Type']) || Object.values(headers).some(value =>
          !['application/json','text/plain','application/octet-stream'].includes(value))) fail();
      } catch { fail(); }
    }
    if (node.type === 'sqlTable') {
      try {
        const columns = JSON.parse(data.columns); const names = new Set();
        if (!identifier(data.tableName) || !Array.isArray(columns) || columns.length < 1 || columns.length > 50) fail();
        for (const column of columns) {
          if (!object(column, ['name','type','length','primaryKey','autoIncrement','notNull']) || !identifier(column.name) ||
              names.has(column.name.toLowerCase()) || !['INTEGER','TEXT','VARCHAR','BOOLEAN','UUID','TIMESTAMP','NUMERIC'].includes(column.type) ||
              ['primaryKey','autoIncrement','notNull'].some(key => key in column && typeof column[key] !== 'boolean') ||
              ('length' in column && (column.type !== 'VARCHAR' || !Number.isInteger(column.length) || column.length < 1 || column.length > 4096))) fail();
          names.add(column.name.toLowerCase());
        }
      } catch { fail(); }
    }
  }
  const edges = []; const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (!object(edge, ['id','source','target','sourceHandle','targetHandle','type']) || typeof edge.id !== 'string' || !idPattern.test(edge.id) ||
        edgeIds.has(edge.id) || edge.type !== 'default' || connectionError(graph.nodes, edges, edge)) fail();
    edges.push(edge); edgeIds.add(edge.id);
  }
  return graph;
}

// Only known persisted fields leave the editor. Empty excluded defaults may be omitted; entered text may not.
export function serializeGraph(state) {
  const nodes = state.nodes.map(node => {
    const allowed = fields[node.type]; const definition = getNodeDefinition(node.type);
    if (!allowed || !definition) fail();
    for (const property of definition.properties) {
      if (!allowed.includes(property.id) && node.data[property.id] !== '' && node.data[property.id] !== undefined)
        throw new Error(property.label + ' is not saved in this milestone. Clear it explicitly before saving; query/code/body/parameters remain disabled.');
    }
    const data = {};
    for (const key of allowed) if (node.data[key] !== undefined) data[key] = node.data[key];
    return { id: node.id, type: node.type, position: { x: node.position.x, y: node.position.y }, data };
  });
  const edges = state.edges.map(({ id, source, target, sourceHandle, targetHandle }) =>
    ({ id, source, target, sourceHandle, targetHandle, type: 'default' }));
  const graph = { schemaVersion: 1, nodes, edges };
  if (bytes(graph) > 12288) throw new Error('Graph exceeds 12 KiB. Reduce labels, properties or nodes before saving.');
  return validateDocument(graph);
}

// Includes excluded edited text for dirty detection, excluding selection, measurements and other React Flow state.
export const draftSignature = state => JSON.stringify({ nodes: state.nodes.map(node =>
  ({ id: node.id, type: node.type, position: node.position, data: node.data })), edges: state.edges.map(edge =>
  ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle })) });

export function decodeEnvelope(value, projectId) {
  try {
    if (!object(value, ['projectId','revision','createdAt','updatedAt','graph']) || !uuidPattern.test(value.projectId) ||
        value.projectId.toLowerCase() !== projectId.toLowerCase() || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        (value.revision === 0 ? value.createdAt !== null || value.updatedAt !== null :
          ![value.createdAt,value.updatedAt].every(date => typeof date === 'string' && /Z$/.test(date) && Number.isFinite(Date.parse(date))) ||
          Date.parse(value.updatedAt) < Date.parse(value.createdAt))) fail();
    validateDocument(value.graph);
    if (value.revision === 0 && (value.graph.nodes.length || value.graph.edges.length)) fail();
    const state = { nodes: value.graph.nodes.map(node => ({ ...createNode(node.type, node.id, node.position),
      data: { ...createNode(node.type, node.id, node.position).data, ...node.data } })),
      edges: value.graph.edges.map(edge => ({ ...edge })), error: '' };
    return { ...value, state };
  } catch { throw new Error('The API returned an invalid or unsupported saved graph. No graph was loaded.'); }
}
const path = projectId => {
  if (!uuidPattern.test(projectId)) throw new Error('Invalid project identifier.');
  return '/auth/projects/' + projectId + '/graph';
};
export async function getGraph(projectId) {
  const response = await api.get(path(projectId));
  return decodeEnvelope(response.data, projectId);
}
export async function saveGraph(projectId, expectedRevision, state) {
  const graph = serializeGraph(state);
  const response = await api.put(path(projectId), { expectedRevision, graph });
  const decoded = decodeEnvelope(response.data, projectId);
  if (decoded.revision !== expectedRevision + 1 || JSON.stringify(decoded.graph) !== JSON.stringify(graph))
    throw new Error('Save response could not be verified. Your draft is retained; reload to check the saved graph.');
  return decoded;
}
