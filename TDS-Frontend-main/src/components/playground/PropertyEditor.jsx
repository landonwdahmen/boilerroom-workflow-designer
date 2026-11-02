import { getNodeDefinition, validateNode } from '../../config/playgroundNodes';
import { GRAPH_LIMITS } from './graphState';

export default function PropertyEditor({ selectedNode, updateNodeData, canEdit = false }) {
  if (!selectedNode) return <aside aria-label="Node properties" className="w-80 bg-white border-l p-4 flex-shrink-0">
    <p>Select one node to inspect its properties.</p>
  </aside>;
  const definition = getNodeDefinition(selectedNode.data?.nodeDefinitionId);
  if (!definition) return <aside aria-label="Node properties"><p role="alert">Unsupported node type.</p></aside>;
  const validation = validateNode(selectedNode);
  const update = (property, value) => { if (canEdit) updateNodeData(selectedNode.id, property, value); };
  return <aside aria-label="Node properties" className="w-80 bg-white border-l p-4 overflow-y-auto flex-shrink-0">
    <h2 className="font-semibold mb-2">Node Properties</h2>
    <p className="text-sm text-gray-600">{definition.description}</p>
    <p className="text-sm my-2">{canEdit ? 'Configuration only; use Save graph to persist changes. Query/code/body/parameters are excluded.' : 'Read-only configuration.'}</p>
    {!validation.isValid && <p role="status" className="text-sm text-orange-800 my-2">Incomplete configuration: {validation.error}</p>}
    <label htmlFor="node-label" className="block mt-4">Label</label>
    <input id="node-label" type="text" value={selectedNode.data.label || ''} maxLength={GRAPH_LIMITS.label}
      readOnly={!canEdit} onChange={event => update('label', event.target.value)} className="w-full border rounded p-2" />
    {definition.properties.map(property => {
      const id = 'node-property-' + property.id;
      const common = { id, value: selectedNode.data[property.id] || '', required: property.required,
        onChange: event => update(property.id, event.target.value), className: 'w-full border rounded p-2',
        'aria-describedby': id + '-help' };
      return <div key={property.id} className="mt-4">
        <label htmlFor={id} className="block">{property.label}{property.required ? ' *' : ''}</label>
        {property.type === 'select' ? <select {...common} disabled={!canEdit}>
          <option value="">Select method</option>{property.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : property.type === 'textarea' ? <textarea {...common} readOnly={!canEdit} maxLength={GRAPH_LIMITS.property} rows={4} placeholder={property.placeholder} /> :
          <input {...common} type="text" readOnly={!canEdit} maxLength={GRAPH_LIMITS.property} placeholder={property.placeholder} />}
        <p id={id + '-help'} className="text-sm text-gray-600">{property.description}</p>
      </div>;
    })}
  </aside>;
}
