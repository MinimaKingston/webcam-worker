import { downloadRecordings } from './download.js';

import type { App } from '../app.js';

export class Camsecure {
	protected isDownloading = false;
	protected lastDownload = -Infinity;
	protected downloadInterval = 6 * 60000; // 6 minutes.

	constructor({ emitter }: App) {
		// app.emitter.on('ready', async (app: App) => this.init(app));
		// app.emitter.on('exit', async (app: App) => this.exit(app));
		emitter.on('loop', async (app: App) => this.loop(app));
	}

	/** Invoked every tick. */
	async loop({ logger, emitter, config }: App) {
		// Exit if we are already downloading.
		if (this.isDownloading) return;

		// Exit if we downloaded within the throttle interval.
		if (performance.now() < this.lastDownload + this.downloadInterval) return;

		// Exit if the camera url is not set (used to turn off live downloads if we
		// only want to process backlog).
		if (!config.camsecure.baseUrl) return;

		this.isDownloading = true;
		this.lastDownload = performance.now();

		try {
			await downloadRecordings({ logger, emitter }, { ...config.camsecure });
		} catch (err) {
			// Errors should be handled in the download.
			logger.fatal(err, 'Unexpected error in recording download');
		} finally {
			this.isDownloading = false;
		}
	}
}
