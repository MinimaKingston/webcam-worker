import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';

import { formatBytes, formatDuration } from '../utils/format.js';

import { getStorage } from '../storage/index.js';
import type { ListObject, Storage } from '../storage/index.js';
import type { Logger } from '../logger.js';

export interface CameraFilename {
	filename: string;
	camera: string;
	year: string;
	month: string;
	day: string;
	hour: string;
	minute: string;
	second: string;
	ext: string;
}

export interface ListStoredVideoFilesOptions {
	/** yyyy or yyyy-mm or yyyy-mm-dd  */
	date?: string;
	/** The maximum number of keys to return (will throw if truncated). */
	limit?: number;
	/** The maximum number of keys to return (truncation is silently ignored). */
	truncate?: number;
}

const filenameRegex =
	/(([^_/]+)_(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)-(\d\d)\.(.+))$/;

/**
 * List video files.
 */
export const listStoredVideoFiles = async (
	options: ListStoredVideoFilesOptions = {},
): Promise<ListObject[]> => {
	const Prefix = `video-files/${(options.date ?? '').replaceAll('-', '/')}`;
	const MaxKeys = options.truncate ?? options.limit ?? undefined;
	const ignoreTruncate = options.truncate == null ? undefined : true;
	// @ts-expect-error @FIXME
	const storage = getStorage();
	return storage.listObjects({ ignoreTruncate, params: { Prefix, MaxKeys } });
};

export const parseCameraFilename = (path: string): CameraFilename => {
	const parts = path.match(filenameRegex);
	if (!parts) {
		throw new Error(`Error parsing camera file name from ${path}`);
	}
	const [, filename, camera, year, month, day, hour, minute, second, ext] =
		parts;
	return { filename, camera, year, month, day, hour, minute, second, ext };
};

export const getDate = (file: CameraFilename): Date => {
	const { year, month, day, hour, minute, second } = file;
	return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
};

export const downloadStoredVideoFiles = async (
	files: ListObject[],
	{
		storage,
		logger,
		baseDir,
	}: { storage: Storage; logger: Logger; baseDir: string },
) => {
	const info = { files: 0, bytes: 0, time: -performance.now() };
	let ok = true;

	for (const file of files) {
		const { Key } = file;
		const f = parseCameraFilename(Key);

		if (f.ext !== 'mp4') {
			// Only need to download mp4 files.
			continue;
		}

		const contents = await storage.getFile(Key);
		const { LastModified, ETag, ContentLength, Body } = contents;
		// @ts-expect-error not sure what is wrong with this
		const statusCode = Body == null ? null : Body.statusCode;

		if (statusCode !== 200) {
			ok = false;
			const info = { statusCode, Key };
			logger.error(
				{ info },
				'Could not download %s, status = %d',
				Key,
				statusCode,
			);
			break;
		}

		const dir = path.join(baseDir, 'files/video-files', f.year, f.month, f.day);
		await mkdir(dir, { recursive: true });
		const ws = createWriteStream(path.join(dir, f.filename));
		// @ts-expect-error not sure what is wrong with this
		await Body.pipe(ws);
		{
			// Isolate scope for info.
			const info = { Key, LastModified, ETag, ContentLength };
			logger.debug({ info }, 'Downloaded %s (%d bytes)', Key, ContentLength);
		}
		info.files++;
		info.bytes += ContentLength ?? 0;
	}
	info.time += performance.now();

	logger.info(
		{ info },
		'Downloaded %d files (%s) in %s',
		info.files,
		formatBytes(info.bytes),
		formatDuration(info.time),
	);

	if (!ok) {
		logger.error('Could not download all files, aborting');
		return;
	}
};
