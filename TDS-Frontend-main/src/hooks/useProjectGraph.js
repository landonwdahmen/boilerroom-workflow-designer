// October 2026 explicit persistence. Failed writes retain the local draft and are never replayed.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { emptyGraph, reduceGraph } from '../components/playground/graphState';
import { draftSignature, getGraph, saveGraph } from '../services/graphs';

export function useProjectGraph(projectId, permitted) {
  const [storage, setStorage] = useState({ busy: true, loaded: false, revision: 0, baseline: '', error: '', conflict: false });
  const canEdit = permitted && storage.loaded && !storage.busy;
  const [graph, dispatch] = useReducer((state, action) => action.type === 'restore' ? action.state :
    reduceGraph(state, action, canEdit), undefined, emptyGraph);
  const sequence = useRef(0);
  const dirty = storage.loaded && draftSignature(graph) !== storage.baseline;
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setStorage(previous => ({ ...previous, busy: true, error: '', conflict: false }));
    try {
      const saved = await getGraph(projectId);
      if (sequence.current !== request) return;
      dispatch({ type: 'restore', state: saved.state });
      setStorage({ busy: false, loaded: true, revision: saved.revision, baseline: draftSignature(saved.state), error: '', conflict: false });
    } catch (error) {
      if (sequence.current === request) setStorage(previous => ({ ...previous, busy: false, error: error.message }));
    }
  }, [projectId]);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { load(); return invalidate; }, [load, invalidate]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async () => {
    if (!canEdit || !dirty || storage.conflict) return;
    const request = ++sequence.current;
    const snapshot = graph; const baseline = draftSignature(snapshot);
    setStorage(previous => ({ ...previous, busy: true, error: '' }));
    try {
      const saved = await saveGraph(projectId, storage.revision, snapshot);
      if (sequence.current === request) setStorage({ busy: false, loaded: true, revision: saved.revision, baseline, error: '', conflict: false });
    } catch (error) {
      if (sequence.current === request) setStorage(previous => ({ ...previous, busy: false, conflict: error.status === 409,
        error: error.status === 409 ? 'Save conflict: another administrator saved a newer revision. Your unsaved draft is retained. Review it before explicitly reloading the saved graph.' :
          error.message + ' Your draft is retained; a failed response does not confirm whether a save reached the server.' }));
    }
  };
  const reload = () => {
    if (!storage.busy && (!dirty || window.confirm('Discard unsaved edits and reload the saved graph?'))) load();
  };
  return { graph, dispatch, storage, dirty, canEdit, save, reload };
}
