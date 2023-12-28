import { create, object, string } from 'superstruct'

export const schema = object({
  COGNITO_USER_POOLS_ID: string(),
})

// error early if env vars are not set
console.debug('parsing environment variables')
export const env = create(process.env, schema)
console.debug('parsing environment variables successful')
