// Original React Flow editor; October 2026 security/stability work. Editing only, no execution.
import { useCallback, useRef, useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import ReactFlow, { ReactFlowProvider, Controls, MiniMap, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { getProjectById } from '../services/projects';
import { useAuth } from '../hooks/useAuth';
import DraggableNodeSource from '../components/playground/DraggableNodeSource';
import ApiNode from '../components/playground/ApiNode';
import PropertyEditor from '../components/playground/PropertyEditor';
import { NODE_DEFINITIONS } from '../config/playgroundNodes';
import { connectionError } from '../components/playground/graphState';

import { useProjectGraph } from '../hooks/useProjectGraph';

const nodeTypes = Object.fromEntries(NODE_DEFINITIONS.map(definition => [definition.id, ApiNode]));

export function PlaygroundEditor({ project, canEdit: permitted, checking = false }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { graph, dispatch, storage, dirty, canEdit, save, reload } = useProjectGraph(project.id, permitted);
    const [instance, setInstance] = useState(null);
    const counter = useRef(0);
    const selectedNodes = graph.nodes.filter(node => node.selected);
    const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
    const hasSelection = selectedNodes.length > 0 || graph.edges.some(edge => edge.selected);
    const addNode = useCallback((nodeType, position) => {
        if (!canEdit) return;
        do { counter.current++; } while (graph.nodes.some(node => node.id === nodeType + '_' + counter.current));
        dispatch({ type: 'add', nodeType, id: nodeType + '_' + counter.current,
            position: position || { x: 80 + ((counter.current - 1) % 3) * 260, y: 80 + Math.floor((counter.current - 1) / 3) * 280 } });
    }, [canEdit, graph.nodes, dispatch]);
    const onDrop = useCallback(event => {
        event.preventDefault();
        if (!canEdit) return;
        if (!instance) { dispatch({ type: 'notice', message: 'Canvas is still loading. Try again.' }); return; }
        const nodeType = event.dataTransfer.getData('application/reactflow-nodetypeid');
        // React Flow 11's supported conversion includes viewport pan/zoom and canvas bounds.
        addNode(nodeType, instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    }, [canEdit, instance, addNode, dispatch]);
    const onNodesChange = useCallback(changes => dispatch({ type: 'nodes', changes }), [dispatch]);
    const onEdgesChange = useCallback(changes => dispatch({ type: 'edges', changes }), [dispatch]);
    const onConnect = useCallback(connection => dispatch({ type: 'connect', connection }), [dispatch]);
    const updateNodeData = useCallback((id, property, value) => dispatch({ type: 'update', id, property, value }), [dispatch]);
    const isValidConnection = useCallback(connection => canEdit && !connectionError(graph.nodes, graph.edges, connection), [canEdit, graph.nodes, graph.edges]);

    return <div className="h-screen flex flex-col bg-gray-100 text-left">
        <header className="bg-white shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
                <button type="button" onClick={() => { if (!dirty || window.confirm('Discard unsaved edits and leave this project?')) navigate(user.role === 'administrator' ? '/admin-dashboard' : '/member-dashboard'); }} className="border rounded p-2">Back to dashboard</button>
                <div><h1 className="text-xl font-semibold">API Flow Designer</h1><p>{project.name}</p></div>
                <div className="flex gap-2">
                {user.role === 'administrator' && <button type="button" onClick={save} disabled={!canEdit || !dirty || storage.conflict}
                    className="border rounded p-2 disabled:opacity-50">Save graph</button>}
                <button type="button" onClick={reload} disabled={storage.busy} className="border rounded p-2 disabled:opacity-50">Reload saved graph</button>
                <button type="button" disabled={!canEdit || !hasSelection} onClick={() => dispatch({ type: 'deleteSelection' })}
                    className="border rounded p-2 disabled:opacity-50">Delete selection</button></div>
            </div>
            <p role="status">{checking ? 'Checking project access…' : user.role === 'administrator' ? 'Administrator: editing project graph.' : 'Read-only: developers may inspect assigned projects.'}</p>
            <p role="status" aria-live="polite">{storage.busy ? (storage.loaded ? 'Saving or loading graph…' : 'Loading saved graph…') :
                !storage.loaded ? 'Graph unavailable. Use Reload saved graph to retry.' : dirty ? 'Unsaved changes — not persisted.' :
                storage.revision === 0 ? 'No saved graph yet.' : 'Saved graph — revision ' + storage.revision + '.'}</p>
            <p className="text-sm text-gray-600">Execution, HTTP requests, SQL operations and API generation are disabled. Explicit save only; query/code/body/parameters are excluded. URLs must have no credentials, query or fragment. Headers allow only Accept/Content-Type with JSON, plain text or octet-stream MIME values.</p>
            {storage.error && <p role="alert" className="p-2 bg-red-50 text-red-700">{storage.error}</p>}
            {graph.error && <p role="alert" className="p-2 bg-red-50 text-red-700">{graph.error}</p>}
        </header>
        <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside aria-label="Node palette" className="w-64 bg-white border-r p-4 overflow-y-auto flex-shrink-0">
                <h2 className="font-semibold">Building Blocks</h2>
                <p className="text-sm my-2">{canEdit ? 'Click to add, or drag to the canvas.' : 'Node creation is disabled in read-only mode.'}</p>
                <div className="space-y-3">{NODE_DEFINITIONS.map(definition =>
                    <DraggableNodeSource key={definition.id} nodeType={definition} canEdit={canEdit} onAdd={addNode} />)}</div>
                <div className="mt-6 text-sm text-gray-600 space-y-2">
                    <p>Select a node to inspect its properties. Administrators can edit configuration, move nodes, connect outputs to inputs and delete selected nodes/edges.</p>
                    <p>Triggers start flows; responses end them. Self-links, duplicate connections and cycles are not allowed.</p>
                    <p>Delete/Backspace removes a canvas selection; editing text does not delete nodes. Ctrl/Cmd+R keeps its normal browser refresh behavior.</p>
                    <p>Storage: 12 KiB total; 100 nodes, 200 edges, 100-character labels, 4096 characters per property. Enter synthetic descriptions only; no credentials or confidential data.</p>
                </div>
            </aside>
            <main aria-label="Workflow canvas" className="flex-1 relative min-w-0">
                {storage.loaded && graph.nodes.length === 0 && <p className="absolute z-10 top-4 left-4 p-3 bg-white border rounded pointer-events-none">
                    {canEdit ? 'Empty local draft. Add a building block to begin.' : (storage.revision === 0 ? 'No saved graph is available.' : 'The saved graph is empty.')}
                </p>}
                {storage.loaded && <ReactFlow nodes={graph.nodes} edges={graph.edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                    onConnect={onConnect} isValidConnection={isValidConnection} nodeTypes={nodeTypes} onInit={setInstance}
                    nodesDraggable={canEdit} nodesConnectable={canEdit} edgesUpdatable={false}
                    disableKeyboardA11y={!canEdit} deleteKeyCode={canEdit ? ['Backspace','Delete'] : null}
                    onDrop={onDrop} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = canEdit ? 'move' : 'none'; }}
                    minZoom={0.2} maxZoom={2} fitView className="bg-gray-100">
                    <Controls showInteractive={false} /><MiniMap /><Background variant="dots" gap={15} size={1} />
                </ReactFlow>}
            </main>
            <PropertyEditor selectedNode={selectedNode} updateNodeData={updateNodeData} canEdit={canEdit} />
        </div>
    </div>;
}

export default function ProjectPlaygroundPageV2() {
    const { projectId } = useParams();
    const { user } = useAuth();
    const { userId, role, organizationId } = user || {};
    const key = [projectId, userId, role, organizationId].join(':');
    const [access, setAccess] = useState({ key: '', project: null, error: '', checking: true });
    useEffect(() => {
        if (!userId || !['administrator','developer'].includes(role)) return undefined;
        let active = true;
        let sequence = 0;
        const check = async () => {
            const request = ++sequence;
            setAccess(previous => previous.key === key ? { ...previous, checking: true } : { key, project: null, error: '', checking: true });
            try {
                const project = await getProjectById(projectId); // Backend-scoped cookie-authenticated lookup, never URL authority.
                if (project.organizationId !== organizationId ||
                    (role === 'developer' && project.assignedTo !== userId)) throw new Error('Project unavailable or not assigned to you.');
                if (active && request === sequence) setAccess({ key, project, error: '', checking: false });
            } catch (error) {
                if (active && request === sequence) setAccess({ key, project: null, error: error.message, checking: false });
            }
        };
        check();
        window.addEventListener('focus', check);
        return () => { active = false; window.removeEventListener('focus', check); };
    }, [key, projectId, userId, role, organizationId]); // Only DB-restored membership fields affect access.
    if (!user) return <Navigate to="/login" replace />;
    if (!['administrator','developer'].includes(user.role)) return <p role="alert">Project access unavailable.</p>;
    if (access.key !== key || (!access.project && access.checking)) return <p role="status">Checking project access…</p>;
    if (!access.project) return <p role="alert" className="p-8">{access.error}</p>;
    return <ReactFlowProvider key={key}><PlaygroundEditor project={access.project}
        canEdit={user.role === 'administrator' && !access.checking} checking={access.checking} /></ReactFlowProvider>;
}
