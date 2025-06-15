import path from 'node:path';

import type { App } from '../app.js';

export interface Config {
	/** Camera(s) URL. */
	baseUrl: string;
	/** Directory for storing local files. */
	filesDir: string;
	/** Directory for storing downloaded files. */
	downloadDir: string;
}

/** Get the camera configuration. */
export const getConfig = ({ env, filesDir, downloadDir }: App): Config => {
	return {
		baseUrl: env.CAMERA_URL ?? '',
		downloadDir,
		filesDir: path.join(filesDir, 'camera-files'),
	};
};
