// October 2026: bounded graph editing. No interpretation or node-driven network requests.
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { getNodeDefinition } from '../../config/playgroundNodes';

export const GRAPH_LIMITS = { nodes: 100, edges: 200, label: 100, property: 4096, coordinate: 100000 };
export const emptyGraph = () => ({ nodes: [], edges: [], error: '' });
const validPosition = position => position && Number.isFinite(position.x) && Number.isFinite(position.y) &&
  Math.abs(position.x) <= GRAPH_LIMITS.coordinate && Math.abs(position.y) <= GRAPH_LIMITS.coordinate;

export function createNode(type, id, position) {
  const definition = getNodeDefinition(type);
  if (!definition || !validPosition(position) || typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const data = { nodeDefinitionId: type, label: definition.label };
  for (const property of definition.properties) {
    data[property.id] = property.type === 'select' ? property.options[0].value :
      property.id === 'path' ? '/api/endpoint' : property.id === 'statusCode' ? '200' : '';
  }
  return { id, type, position: { x: position.x, y: position.y }, data };
}

export function connectionError(nodes, edges, connection) {
  const source = nodes.find(node => node.id === connection.source);
  const target = nodes.find(node => node.id === connection.target);
  if (!source || !target) return 'Both connection endpoints must exist.';
  if (source.id === target.id) return 'A node cannot connect to itself.';
  if (source.type === 'sendResponse' || target.type === 'apiTrigger' ||
      connection.sourceHandle !== 'out' || connection.targetHandle !== 'in') return 'Connect an output to an input; triggers start flows and responses end them.';
  if (edges.some(edge => edge.source === source.id && edge.target === target.id)) return 'These nodes are already connected.';
  if (edges.length >= GRAPH_LIMITS.edges) return 'The local draft is limited to 200 edges.';
  const pending = [target.id]; const visited = new Set();
  while (pending.length) {
    const id = pending.pop();
    if (id === source.id) return 'This connection would create a cycle.';
    if (visited.has(id)) continue;
    visited.add(id);
    edges.filter(edge => edge.source === id).forEach(edge => pending.push(edge.target));
  }
  return '';
}

export function reduceGraph(state, action, canEdit) {
  const fail = error => ({ ...state, error });
  if (action.type === 'notice') return fail(action.message);
  if (action.type === 'nodes') {
    const allowed = canEdit ? ['select','dimensions','position','remove'] : ['select','dimensions'];
    const changes = action.changes.filter(change => allowed.includes(change.type));
    if (changes.some(change => change.type === 'position' && change.position && !validPosition(change.position))) return fail('Node position is outside the local canvas limits.');
    const nodes = applyNodeChanges(changes, state.nodes);
    const ids = new Set(nodes.map(node => node.id));
    return { ...state, nodes, edges: state.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)) };
  }
  if (action.type === 'edges') {
    const changes = action.changes.filter(change => (canEdit ? ['select','remove'] : ['select']).includes(change.type));
    return { ...state, edges: applyEdgeChanges(changes, state.edges) };
  }
  if (!canEdit) return state; // Also gates direct callbacks, not just disabled controls.
  if (action.type === 'add') {
    if (state.nodes.length >= GRAPH_LIMITS.nodes) return fail('The local draft is limited to 100 nodes.');
    const node = createNode(action.nodeType, action.id, action.position);
    if (!node || state.nodes.some(item => item.id === node.id)) return fail('Unsupported node type, ID or position.');
    return { nodes: [...state.nodes.map(item => ({ ...item, selected: false })), { ...node, selected: true }],
      edges: state.edges.map(edge => ({ ...edge, selected: false })), error: '' };
  }
  if (action.type === 'connect') {
    const error = connectionError(state.nodes, state.edges, action.connection);
    if (error) return fail(error);
    const { source, target } = action.connection;
    // Persisted node IDs may be 100 characters and saved edge IDs may use any allowed name.
    const edgeIds = new Set(state.edges.map(edge => edge.id));
    let index = state.edges.length + 1;
    while (edgeIds.has('edge_' + index)) index++;
    const edge = { id: 'edge_' + index, source, target, sourceHandle: 'out', targetHandle: 'in', type: 'default' };
    return { ...state, edges: [...state.edges, edge], error: '' };
  }
  if (action.type === 'update') {
    const node = state.nodes.find(item => item.id === action.id);
    const definition = node && getNodeDefinition(node.type);
    const property = definition?.properties.find(item => item.id === action.property);
    if (!definition || (action.property !== 'label' && !property) || typeof action.value !== 'string' ||
        action.value.length > (action.property === 'label' ? GRAPH_LIMITS.label : GRAPH_LIMITS.property) ||
        (property?.type === 'select' && action.value !== '' && !property.options.some(item => item.value === action.value))) {
      return fail('Unsupported property or value; use the listed fields and limits.');
    }
    return { ...state, error: '', nodes: state.nodes.map(item => item.id === node.id ?
      { ...item, data: { ...item.data, [action.property]: action.value } } : item) };
  }
  if (action.type === 'deleteSelection') {
    const nodes = state.nodes.filter(node => !node.selected);
    const ids = new Set(nodes.map(node => node.id));
    return { nodes, edges: state.edges.filter(edge => !edge.selected && ids.has(edge.source) && ids.has(edge.target)), error: '' };
  }
  return state;
}
