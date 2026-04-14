import { beforeEach, inject, vi } from 'vitest'

import { closeTrackedTypedPgClients, installTypedPgClientTracking } from './client-tracking'
import { setupTypedPgVitest } from './setup-helper'

installTypedPgClientTracking(vi)
setupTypedPgVitest(
  { beforeEach, inject },
  {
    beforeReset: closeTrackedTypedPgClients,
  },
)
