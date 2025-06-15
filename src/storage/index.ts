// src/storage/index.ts

import type { Config } from './config.js';

import { Storage } from './storage.js';
export type { ListObject, Storage } from './storage.js';

let storageInstance: Storage | null = null;

export const getStorage = (config: Config): Storage => {
	if (storageInstance == null) {
		storageInstance = new Storage(config);
	}
	return storageInstance;
};
