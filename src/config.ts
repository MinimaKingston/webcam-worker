// src/config.ts

import * as Storage from './storage/config.js';
import * as Camsecure from './camsecure/config.js';

import type { App } from './app.js';

export interface Config {
	camsecure: Camsecure.Config;
	storage: Storage.Config;
}

export const getConfig = (app: App): Config => {
	return {
		camsecure: Camsecure.getConfig(app),
		storage: Storage.getConfig(app),
	};
};
