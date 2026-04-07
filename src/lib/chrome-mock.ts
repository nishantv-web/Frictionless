// Dev-mode chrome API mock — only active outside the extension context
const storage: Record<string, unknown> = {}

const chromeMock = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: storage[key] }),
      set: async (obj: Record<string, unknown>) => { Object.assign(storage, obj) },
    },
    sync: {
      get: async (key: string) => ({ [key]: storage[key] }),
      set: async (obj: Record<string, unknown>) => { Object.assign(storage, obj) },
    },
  },
  runtime: {
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
    sendMessage: async () => {},
  },
  tabs: {
    query: async (_opts: unknown, cb?: (tabs: unknown[]) => void) => {
      cb?.([{ id: 1 }])
      return [{ id: 1 }]
    },
    sendMessage: async () => {},
  },
  sidePanel: {
    open: async () => {},
    setPanelBehavior: async () => {},
  },
}

export function installChromeMock() {
  // @ts-ignore
  const c = typeof chrome !== 'undefined' ? chrome : undefined
  if (!c || !c.storage) {
    // @ts-ignore
    window.chrome = chromeMock
  }
}
