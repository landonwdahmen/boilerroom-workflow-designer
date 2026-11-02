import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PropertyEditor from './PropertyEditor';
import { createNode } from './graphState';
test('edited properties track current graph state across rerenders and reselection', () => {
  const node = createNode('apiTrigger','a',{ x: 0, y: 0 });
  const update = vi.fn();
  const { rerender } = render(<PropertyEditor selectedNode={node} canEdit updateNodeData={update} />);
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Synthetic updated' } });
  expect(update).toHaveBeenCalledWith('a','label','Synthetic updated');
  const current = { ...node, data: { ...node.data, label: 'Synthetic updated' } };
  rerender(<PropertyEditor selectedNode={current} canEdit updateNodeData={update} />);
  expect(screen.getByLabelText('Label')).toHaveValue('Synthetic updated');
  rerender(<PropertyEditor selectedNode={null} canEdit updateNodeData={update} />);
  rerender(<PropertyEditor selectedNode={current} canEdit updateNodeData={update} />);
  expect(screen.getByLabelText('Label')).toHaveValue('Synthetic updated');
});
test('read-only inspection ignores mutation events, including malicious text', () => {
  const node = createNode('customLogic','c',{ x: 0, y: 0 });
  node.data.code = '<script>window.syntheticEditorCanary=true</script>';
  const update = vi.fn();
  render(<PropertyEditor selectedNode={node} canEdit={false} updateNodeData={update} />);
  const field = screen.getByLabelText('Code notes (never executed)');
  expect(field).toHaveAttribute('readonly');
  fireEvent.change(field, { target: { value: 'changed' } });
  expect(update).not.toHaveBeenCalled();
  expect(document.querySelector('script')).toBeNull();
  expect(window.syntheticEditorCanary).toBeUndefined();
});
test('invalid JSON has an actionable non-executing configuration error', () => {
  const node = createNode('sqlTable','t',{ x: 0, y: 0 });
  node.data.tableName='synthetic'; node.data.columns='invalid';
  render(<PropertyEditor selectedNode={node} canEdit updateNodeData={vi.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('valid JSON');
});
