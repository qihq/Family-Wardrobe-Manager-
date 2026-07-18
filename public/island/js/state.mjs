export const initialState = {
  auth: { status: 'checking', isAdmin: false },
  route: {
    section: 'wardrobe',
    filters: { q: '', member: [], type: [], season: [], status: [], favorite: false },
    sort: { field: 'createdAt', direction: 'desc' }
  },
  members: [],
  clothes: [],
  loading: { clothes: false, mutation: false },
  selectedItemId: null,
  requestVersion: 0,
  notice: null
};

export function createStore(startState) {
  let state = startState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState(updater) {
      const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach(listener => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
