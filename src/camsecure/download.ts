import { existsSync } from 'node:fs';

import path from 'node:path';

import { formatBytes, formatDuration } from '../utils/format.js';

import { parseCameraFilename } from '../camera-file/camera-file.js';

import {
	fetchCameraLinks,
	fetchDayLinksForCamera,
	fetchFileLinks,
	downloadCameraFile,
	type DayLink,
	type FileLink,
} from './api.js';

import type { Config } from './config.js';

import type { Emitter, Logger } from '../app.js';

interface Options {
	maxTime: number;
	maxFiles: number;
}

const defaults: Options = {
	maxTime: 180000, // 3 minutes.
	maxFiles: Infinity, // No limit.
};

const getInitialState = () => ({
	downloaded: [] as string[],
	skipped: [] as string[],
	info: {
		files: 0,
		errors: 0,
		bytes: 0,
		first: '',
		last: '',
		skippedFiles: 0,
		skippedFirst: '',
		skippedLast: '',
		time: 0, // -performance.now(),
		aborted: false as false | string,
	},
});

let state = getInitialState();

export const downloadRecordings = async (
	{ logger, emitter }: { logger: Logger; emitter: Emitter },
	{ baseUrl, filesDir, downloadDir }: Config,
	options: Partial<Options> = {},
) => {
	state = getInitialState();
	const { info, downloaded, skipped } = state;
	info.time = -performance.now();

	const dayLinks: DayLink[] = [];
	const cameraLinks = await fetchCameraLinks(baseUrl);
	for (const cameraLink of cameraLinks) {
		dayLinks.push(...(await fetchDayLinksForCamera(cameraLink.path, baseUrl)));
	}

	const { maxTime, maxFiles } = { ...defaults, ...options };

	// Iterate over all the camera files on the server, ignoring the last one
	// because it is incomplete.
	let prevFileLink: FileLink | null = null;
	let nextFileLink: FileLink | null = null;
	let fileLink: FileLink | null = null;

	const onExit = emitter.once('exit');
	onExit.then(() => {
		info.aborted = 'process exit';
		logComplete(logger);
	});

	for (const dayLink of dayLinks) {
		// If day has been completed continue.
		const fileLinks = await fetchFileLinks(dayLink.path, baseUrl);
		for (nextFileLink of fileLinks) {
			// Check we are OK to go on.
			if (info.files >= maxFiles) {
				info.aborted = 'max files';
				break;
			}
			if (performance.now() + info.time >= maxTime) {
				info.aborted = 'max time';
				break;
			}

			// Make sure we ignore the last link.
			if (prevFileLink === null) {
				prevFileLink = nextFileLink;
				continue;
			}

			fileLink = prevFileLink;
			prevFileLink = nextFileLink;

			const f = parseCameraFilename(fileLink.filename);

			// If it has already been downloaded continue.
			// const localFile = path.join(filesDir, f.year, f.month, f.day, f.filename);
			const downloadFile = path.join(downloadDir, f.year, f.month, f.day, f.filename);

			if (existsSync(downloadFile)) {
				logger.debug('Skipping %s, already downloaded', f.filename);
				info.skippedFiles++;
				skipped.push(f.filename);
				continue;
			}
			logger.debug('Downloading %s', f.filename);

			const filePath = fileLink.directPath;
			try {
				const [res] = await downloadCameraFile(filePath, downloadDir, baseUrl);
				// res.contentLength, res.etag, res.lastModified, res.localFile;
				{
					// Isolate scope for info.
					const info = { ...res, filename: fileLink.filename };
					logger.debug(
						{ info },
						'Downloaded %s (%s bytes)',
						info.localPath,
						formatBytes(info.contentLength),
					);
				}

				downloaded.push(fileLink.filename);
				info.files++;
				info.bytes += res.contentLength;
			} catch (err) {
				info.errors++;
				logger.warn(
					{ err, info: { filePath } },
					'Error downloading %s',
					filePath,
				);
			}
		}
		if (info.aborted) break;
	}

	onExit.off();

	if (nextFileLink === null) {
		logger.error('No files on the server');
	} else if (!info.aborted) {
		logger.debug('Ignored last file %s as incomplete', nextFileLink.filename);
	}

	logComplete(logger);
};

const logComplete = (logger: Logger) => {
	const { info, downloaded, skipped } = state;

	info.time += performance.now();

	const na = 'n/a';
	info.first = downloaded[0] ?? na;
	info.last = downloaded[downloaded.length - 1] ?? na;
	info.skippedFirst = skipped[0] ?? na;
	info.skippedLast = skipped[skipped.length - 1] ?? na;

	if (info.aborted) {
		logger.warn(
			{ info },
			'Downloaded %d files (%s) from %s to %s, skipped %d files from %s to %s ABORTED due to %s after %s',
			info.files,
			formatBytes(info.bytes),
			info.first,
			info.last,
			info.skippedFiles,
			info.skippedFirst,
			info.skippedLast,
			info.aborted,
			formatDuration(info.time),
		);
	} else {
		logger.info(
			{ info },
			'Downloaded %d files (%s) from %s to %s, skipped %d files from %s to %s in %s',
			info.files,
			formatBytes(info.bytes),
			info.first,
			info.last,
			info.skippedFiles,
			info.skippedFirst,
			info.skippedLast,
			formatDuration(info.time),
		);
	}
};
