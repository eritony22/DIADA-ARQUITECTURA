import "server-only";

// The Vercel dashboard's "Connect Store" flow for Blob sometimes prefixes
// the token env var with the store's own default name (which itself
// defaults to "BLOB_READ_WRITE_TOKEN"), producing
// BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN instead of the plain
// BLOB_READ_WRITE_TOKEN the @vercel/blob SDK reads by default. Accept
// either so uploads work regardless of which name ended up in the project's
// environment variables.
export const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ??
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
