// src/components/playground/ApiNode.js
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getNodeDefinition } from '../../config/playgroundNodes';
import { ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline';

const ApiNode = memo(({ data, type, isConnectable, selected }) => {
    const nodeDefinition = getNodeDefinition(data.nodeDefinitionId || type);
    const Icon = type === 'apiTrigger' ? BoltIcon : 
                type === 'sendResponse' ? ArrowPathIcon : 
                nodeDefinition?.icon;
    const color = type === 'apiTrigger' ? '#2563eb' : 
                 type === 'sendResponse' ? '#16a34a' : 
                 nodeDefinition?.color || '#718096';

    // Helper function to get method badge color
    const getMethodColor = (method) => {
        switch (method?.toUpperCase()) {
            case 'GET':
                return 'bg-blue-100 text-blue-800';
            case 'POST':
                return 'bg-green-100 text-green-800';
            case 'PUT':
                return 'bg-yellow-100 text-yellow-800';
            case 'DELETE':
                return 'bg-red-100 text-red-800';
            case 'PATCH':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Helper function to get status code badge color
    const getStatusCodeColor = (statusCode) => {
        if (statusCode?.startsWith('2')) return 'bg-green-100 text-green-800';
        if (statusCode?.startsWith('4')) return 'bg-red-100 text-red-800';
        if (statusCode?.startsWith('5')) return 'bg-orange-100 text-orange-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className={`relative bg-white rounded-lg shadow-md border border-gray-200 w-56 ${
            selected ? 'ring-2 ring-orange-500' : type === 'apiTrigger' ? 'border-blue-200' :
            type === 'sendResponse' ? 'border-green-200' : ''
        }`}>
            {/* Header */}
            <div 
                className="flex items-center p-3 border-b border-gray-100 gap-2"
                style={{ 
                    backgroundColor: `${color}15`,
                    borderBottom: `1px solid ${color}30`
                }}
            >
                {Icon && <Icon className="w-5 h-5" style={{ color }} />}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                        {data.label || nodeDefinition?.label || 'Node'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                        {type === 'apiTrigger' ? 'Trigger description only' :
                         type === 'sendResponse' ? 'Response description only' :
                         data.description || nodeDefinition?.description}
                    </p>
                </div>
            </div>

            {/* Body - Display node-specific properties */}
            <div className="p-3 text-xs space-y-2 max-h-36 overflow-hidden break-words">
                {/* For API Trigger nodes */}
                {type === 'apiTrigger' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(data.method)}`}>
                                {data.method || 'GET'}
                            </span>
                            <span className="text-gray-600 truncate font-mono">
                                {data.path || '/{path}'}
                            </span>
                        </div>
                        {data.headers && (
                            <div className="text-gray-500">
                                <span className="font-medium">Headers:</span> {data.headers}
                            </div>
                        )}
                    </div>
                )}

                {/* For Send Response nodes */}
                {type === 'sendResponse' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusCodeColor(data.statusCode)}`}>
                                {data.statusCode || '200'}
                            </span>
                            <span className="text-gray-600">
                                {data.statusCode?.startsWith('2') ? 'Success' :
                                 data.statusCode?.startsWith('4') ? 'Client Error' :
                                 data.statusCode?.startsWith('5') ? 'Server Error' : 'Response'}
                            </span>
                        </div>
                        {data.headers && (
                            <div className="text-gray-500">
                                <span className="font-medium">Headers:</span> {data.headers}
                            </div>
                        )}
                        {data.body && (
                            <div className="text-gray-500">
                                <span className="font-medium">Body:</span> {data.body}
                            </div>
                        )}
                    </div>
                )}

                {/* For HTTP Request nodes */}
                {type === 'httpRequest' && data.method && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(data.method)}`}>
                                {data.method}
                            </span>
                            <span className="text-gray-600 truncate font-mono">
                                {data.url || 'https://'}
                            </span>
                        </div>
                        {data.headers && (
                            <div className="text-gray-500">
                                <span className="font-medium">Headers:</span> {data.headers}
                            </div>
                        )}
                        {data.body && (
                            <div className="text-gray-500">
                                <span className="font-medium">Body:</span> {data.body}
                            </div>
                        )}
                    </div>
                )}

                {/* For Database Query nodes */}
                {type === 'databaseQuery' && data.query && (
                    <div className="font-mono text-gray-600 truncate">
                        {data.query}
                    </div>
                )}

                {/* For SQL Table nodes */}
                {type === 'sqlTable' && data.tableName && (
                    <div className="font-mono text-gray-600">
                        <span className="font-medium">Table:</span> {data.tableName}
                    </div>
                )}

                {/* For Custom Logic nodes */}
                {type === 'customLogic' && data.code && (
                    <div className="font-mono text-gray-600 truncate">
                        {data.code}
                    </div>
                )}
            </div>

            <p className="px-3 pb-2 text-xs text-orange-800">{type === 'customLogic' ? 'Execution disabled' : 'Design only'}</p>
            {/* Input/Output Handles */}
            {type !== 'apiTrigger' && (
                <Handle
                    id="in" isConnectable={isConnectable} type="target"
                    position={Position.Top}
                    className="w-3 h-3 !bg-gray-400 hover:!bg-gray-500"
                />
            )}
            {type !== 'sendResponse' && (
                <Handle
                    id="out" isConnectable={isConnectable} type="source"
                    position={Position.Bottom}
                    className="w-3 h-3 !bg-gray-400 hover:!bg-gray-500"
                />
            )}
        </div>
    );
});

ApiNode.displayName = 'ApiNode';

export default ApiNode;
