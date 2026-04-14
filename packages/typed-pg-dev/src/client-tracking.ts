type ClosableClient = {
  quit: () => Promise<void>
}

interface TypedPgModuleShape {
  createClient: (...args: unknown[]) => ClosableClient
}

interface VitestMockRuntime {
  doMock: (
    path: string,
    factory: () => Promise<Record<string, unknown>> | Record<string, unknown>,
  ) => void
  importActual: <T>(path: string) => Promise<T>
}

const TRACKED_TYPED_PG_CLIENTS_KEY = '__typedPgVitestTrackedClients'
const TRACKING_INSTALLED_KEY = '__typedPgVitestClientTrackingInstalled'

function getTrackedTypedPgClients() {
  const globalScope = globalThis as Record<string, unknown>

  if (!(globalScope[TRACKED_TYPED_PG_CLIENTS_KEY] instanceof Set)) {
    globalScope[TRACKED_TYPED_PG_CLIENTS_KEY] = new Set<ClosableClient>()
  }

  return globalScope[TRACKED_TYPED_PG_CLIENTS_KEY] as Set<ClosableClient>
}

function trackTypedPgClient(client: ClosableClient) {
  const trackedClients = getTrackedTypedPgClients()

  if (trackedClients.has(client)) return client

  trackedClients.add(client)

  const originalQuit = client.quit.bind(client)

  client.quit = async () => {
    trackedClients.delete(client)
    await originalQuit()
  }

  return client
}

export async function closeTrackedTypedPgClients() {
  const trackedClients = getTrackedTypedPgClients()
  const clients = [...trackedClients]

  trackedClients.clear()

  await Promise.allSettled(clients.map((client) => client.quit()))
}

export function installTypedPgClientTracking(vi: VitestMockRuntime) {
  const globalScope = globalThis as Record<string, unknown>

  if (globalScope[TRACKING_INSTALLED_KEY]) return

  globalScope[TRACKING_INSTALLED_KEY] = true

  vi.doMock('typed-pg', async () => {
    const typedPgModule = await vi.importActual<TypedPgModuleShape & Record<string, unknown>>(
      'typed-pg',
    )

    return {
      ...typedPgModule,
      createClient(...args: unknown[]) {
        return trackTypedPgClient(typedPgModule.createClient(...args))
      },
    }
  })
}
