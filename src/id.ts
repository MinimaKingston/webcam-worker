// src/id.ts
import { randomBytes } from 'node:crypto';
import basex from 'base-x';

const base62 = basex(
	'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
);

/** Get a string with 64 bits of entropy. */
export const getId64 = (): string => base62.encode(randomBytes(8));
