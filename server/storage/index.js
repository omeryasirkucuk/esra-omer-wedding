// Storage driver selector. STORAGE_DRIVER=s3 uses Amazon S3; anything else
// (default) uses the local filesystem. Both implement the same interface, so
// no route code changes when switching.
import { localStorageDriver } from './localFileStorage.js'
import { s3StorageDriver } from './s3Storage.js'

const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase()

export const storage = driver === 's3' ? s3StorageDriver : localStorageDriver

console.log(`[storage] driver: ${storage.name}`)
