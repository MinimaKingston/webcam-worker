import path from 'node:path';

import type { App } from '../app.js';

export interface Config {
	/** Camera(s) URL. */
	baseUrl: string;
	/** Directory for storing local files (must be relative). */
	filesDir: string;
}

/** Get the camera configuration. */
export const getConfig = ({ env, filesDir }: App): Config => {
	return {
		baseUrl: env.CAMERA_URL ?? '',
		filesDir: path.join(filesDir, 'camera-files'),
	};
};
