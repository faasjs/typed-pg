#!/usr/bin/env -S npx tsx

import { main } from './main'

main().finally(() => process.exit(0))
