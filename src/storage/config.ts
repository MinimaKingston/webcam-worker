// src/storage/config.ts

import type { App } from '../app.js';

export interface Config {
	bucket: string;
	endpoint: string;
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
}

/** Get the storage configuration. */
export const getConfig = ({ env }: App): Config => {
	return {
		bucket: env.STORAGE_BUCKET ?? '',
		endpoint: env.STORAGE_ENDPOINT ?? '',
		region: env.STORAGE_REGION ?? '',
		credentials: {
			accessKeyId: env.STORAGE_KEY ?? '',
			secretAccessKey: env.STORAGE_SECRET ?? '',
		},
	};
};
