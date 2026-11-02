import { getNodeDefinition } from '../../config/playgroundNodes';
export default function DraggableNodeSource({ nodeType, canEdit = false, onAdd }) {
    const definition = getNodeDefinition(nodeType.id);
    if (!definition) return null;
    const Icon = definition.icon;
    return <button type="button" aria-label={'Add ' + definition.label} disabled={!canEdit} draggable={canEdit}
        onClick={() => { if (canEdit) onAdd(definition.id); }}
        onDragStart={event => {
            if (!canEdit) { event.preventDefault(); return; }
            event.dataTransfer.setData('application/reactflow-nodetypeid', definition.id);
            event.dataTransfer.effectAllowed = 'move';
        }}
        className="w-full bg-white p-3 rounded-lg border shadow-sm text-left disabled:opacity-50">
        <span className="flex items-center gap-2">{Icon && <Icon className="w-5 h-5" style={{ color: definition.color }} />}
            <span className="font-medium">{definition.label}</span></span>
        <span className="block text-xs text-gray-600 my-1">{definition.description}</span>
        <span className="block text-xs text-orange-800">{definition.id === 'customLogic' ? 'Execution disabled' : 'Design only'}</span>
    </button>;
}
