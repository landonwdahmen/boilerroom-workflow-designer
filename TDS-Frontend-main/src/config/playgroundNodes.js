// src/config/playgroundNodes.js
import {
    PlayIcon,
    ServerIcon,
    CodeBracketIcon,
    ArrowPathIcon,
    TableCellsIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';

export const NODE_TYPES = {
    API_TRIGGER: 'apiTrigger',
    HTTP_REQUEST: 'httpRequest',
    DATABASE_QUERY: 'databaseQuery',
    CUSTOM_LOGIC: 'customLogic',
    SEND_RESPONSE: 'sendResponse',
    SQL_TABLE: 'sqlTable'
};

export const NODE_CATEGORIES = {
    TRIGGERS: 'Triggers',
    ACTIONS: 'Actions',
    DATA: 'Data',
    LOGIC: 'Logic',
    RESPONSE: 'Response'
};

export const NODE_DEFINITIONS = [
    {
        id: NODE_TYPES.API_TRIGGER,
        type: 'input',
        label: 'API Trigger',
        category: NODE_CATEGORIES.TRIGGERS,
        description: 'Describe a trigger; no endpoint is created.',
        icon: PlayIcon,
        rfType: 'apiTrigger',
        color: '#60A5FA', // blue-400
        properties: [
            {
                id: 'path',
                label: 'Path',
                type: 'text',
                required: true,
                placeholder: '/api/endpoint',
                description: 'The API endpoint path'
            },
            {
                id: 'method',
                label: 'Method',
                type: 'select',
                required: true,
                options: [
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'DELETE', label: 'DELETE' },
                    { value: 'PATCH', label: 'PATCH' }
                ],
                description: 'The HTTP method for this endpoint'
            }
        ]
    },
    {
        id: NODE_TYPES.HTTP_REQUEST,
        type: 'default',
        label: 'HTTP Request',
        category: NODE_CATEGORIES.ACTIONS,
        description: 'Describe a request; no network requests are sent.',
        icon: ArrowPathIcon,
        rfType: 'httpRequest',
        color: '#34D399', // emerald-400
        properties: [
            {
                id: 'url',
                label: 'URL',
                type: 'text',
                required: true,
                placeholder: 'https://api.example.com/endpoint',
                description: 'The URL to make the request to'
            },
            {
                id: 'method',
                label: 'Method',
                type: 'select',
                required: true,
                options: [
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'DELETE', label: 'DELETE' },
                    { value: 'PATCH', label: 'PATCH' }
                ],
                description: 'The HTTP method for this request'
            },
            {
                id: 'headers',
                label: 'Headers',
                type: 'textarea',
                required: false,
                placeholder: '{\n  "Content-Type": "application/json"\n}',
                description: 'JSON metadata only. Do not enter credentials, cookies or secrets.'
            },
            {
                id: 'body',
                label: 'Request Body',
                type: 'textarea',
                required: false,
                placeholder: '{\n  "key": "value"\n}',
                description: 'JSON metadata only; no requests are sent. Do not enter secrets.'
            }
        ]
    },
    {
        id: NODE_TYPES.DATABASE_QUERY,
        type: 'default',
        label: 'Database Query',
        category: NODE_CATEGORIES.DATA,
        description: 'Describe a query; no SQL is executed.',
        icon: ServerIcon,
        rfType: 'databaseQuery',
        color: '#F472B6', // pink-400
        properties: [
            {
                id: 'query',
                label: 'Query',
                type: 'textarea',
                required: false,
                placeholder: 'SELECT * FROM users WHERE id = ?',
                description: 'Temporary inert notes only. Not saved; clear before saving the label-only placeholder.'
            },
            {
                id: 'parameters',
                label: 'Parameters',
                type: 'textarea',
                required: false,
                placeholder: '[\n  "user123"\n]',
                description: 'Temporary JSON notes only. Not saved; clear before saving.'
            }
        ]
    },
    {
        id: NODE_TYPES.CUSTOM_LOGIC,
        type: 'default',
        label: 'Custom Logic',
        category: NODE_CATEGORIES.LOGIC,
        description: 'Plain-text code notes; execution disabled.',
        icon: CodeBracketIcon,
        rfType: 'customLogic',
        color: '#A78BFA', // violet-400
        properties: [
            {
                id: 'code',
                label: 'Code notes (never executed)',
                type: 'textarea',
                required: false,
                placeholder: '// Your custom JavaScript code here\nreturn { result: "value" };',
                description: 'Inert text only. Never interpreted or executed.'
            }
        ]
    },
    {
        id: NODE_TYPES.SEND_RESPONSE,
        type: 'output',
        label: 'Send Response',
        category: NODE_CATEGORIES.RESPONSE,
        description: 'Describe a response; no API response is generated.',
        icon: PaperAirplaneIcon,
        rfType: 'sendResponse',
        color: '#FBBF24', // amber-400
        properties: [
            {
                id: 'statusCode',
                label: 'Status Code',
                type: 'text',
                required: true,
                placeholder: '200',
                description: 'HTTP status code for the response'
            },
            {
                id: 'headers',
                label: 'Response Headers',
                type: 'textarea',
                required: false,
                placeholder: '{\n  "Content-Type": "application/json"\n}',
                description: 'JSON object containing response headers'
            }
        ]
    },
    {
        id: NODE_TYPES.SQL_TABLE,
        type: 'default',
        label: 'SQL Table',
        category: NODE_CATEGORIES.DATA,
        description: 'Describe a table; no database table is created.',
        icon: TableCellsIcon,
        rfType: 'sqlTable',
        color: '#F472B6', // pink-400
        properties: [
            {
                id: 'tableName',
                label: 'Table Name',
                type: 'text',
                required: true,
                placeholder: 'users',
                description: 'Name of the SQL table'
            },
            {
                id: 'columns',
                label: 'Columns',
                type: 'textarea',
                required: true,
                placeholder: '[\n  {\n    "name": "id",\n    "type": "INTEGER",\n    "primaryKey": true,\n    "autoIncrement": true,\n    "notNull": true\n  },\n  {\n    "name": "name",\n    "type": "VARCHAR",\n    "length": 255,\n    "notNull": true\n  }\n]',
                description: 'JSON array of column definitions'
            }
        ]
    }
];

export const getNodeDefinition = (nodeId) => {
    return NODE_DEFINITIONS.find(def => def.id === nodeId);
};

export const getNodesByCategory = () => {
    const nodesByCategory = {};
    NODE_DEFINITIONS.forEach(node => {
        if (!nodesByCategory[node.category]) {
            nodesByCategory[node.category] = [];
        }
        nodesByCategory[node.category].push(node);
    });
    return nodesByCategory;
};

// Validation diagnoses configuration; it never evaluates expressions or performs I/O.
export const validateNode = (node) => {
    const definition = getNodeDefinition(node?.data?.nodeDefinitionId);
    if (!definition || node.type !== definition.rfType) return { isValid: false, error: 'Unsupported node type.' };
    if (typeof node.data.label !== 'string' || !node.data.label.trim() || node.data.label.length > 100) return { isValid: false, error: 'Label is required (maximum 100 characters).' };
    for (const property of definition.properties) {
        const value = node.data[property.id];
        if (typeof value !== 'string' || value.length > 4096) return { isValid: false, error: property.label + ' must be text of at most 4096 characters.' };
        if (property.required && !value.trim()) return { isValid: false, error: property.label + ' is required.' };
        if (!value.trim()) continue;
        if (property.type === 'select' && !property.options.some(option => option.value === value)) return { isValid: false, error: 'Select a listed method.' };
        if (property.id === 'path' && !value.startsWith('/')) return { isValid: false, error: 'Path must start with /.' };
        if (property.id === 'statusCode' && !/^[1-5][0-9]{2}$/.test(value)) return { isValid: false, error: 'Status code must be 100–599.' };
        if (property.id === 'url') {
            try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error(); }
            catch { return { isValid: false, error: 'URL must describe an HTTP or HTTPS address; it is never fetched.' }; }
        }
        if (['headers','parameters','columns','body'].includes(property.id)) {
            try {
                const parsed = JSON.parse(value);
                if (property.id === 'headers' && (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' ||
                    Object.values(parsed).some(item => typeof item !== 'string'))) throw new Error();
                if (property.id === 'parameters' && !Array.isArray(parsed)) throw new Error();
                if (property.id === 'columns' && (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 50 ||
                    parsed.some(column => !column || typeof column.name !== 'string' || !column.name.trim() ||
                        typeof column.type !== 'string' || !column.type.trim()))) throw new Error();
            } catch { return { isValid: false, error: property.label + ' needs valid JSON of the described shape (columns: 1–50 named/type objects).' }; }
        }
    }
    return { isValid: true };
};
