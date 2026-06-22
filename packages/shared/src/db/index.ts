import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { config } from '../config'

const client = createClient({
  url: config.DATABASE_URL
})

export const db = drizzle(client, { schema })

export * from './schema'