import { formatBytes, formatDuration } from '../utils/format.js';

import { getStorage } from '../storage/index.js';
import {
	parseCameraFilename,
	getDate,
	downloadStoredVideoFiles,
	listStoredVideoFiles,
} from '../camera-file/camera-file.js';

import type { Logger } from '../logger.js';

export const downloadAndDeleteFromStorage = async ({
	logger,
	baseDir,
}: {
	logger: Logger;
	baseDir: string;
}) => {
	// @ts-expect-error @FIXME
	const storage = getStorage();

	// Get the oldest video file.
	const [oldestFile] = await listStoredVideoFiles({ truncate: 1 });

	const fileinfo = parseCameraFilename(oldestFile.Key);

	const age = new Date().valueOf() - getDate(fileinfo).valueOf();

	const maxDays = 25;
	if (age <= maxDays * 86400000) {
		const info = { age, maxDays };
		logger.info(
			{ info },
			'Last file is %s old (<= %d days), run complete',
			formatDuration(info.age, { unitCount: 2 }),
			maxDays,
		);
		return;
	}

	const date = `${fileinfo.year}-${fileinfo.month}-${fileinfo.day}`;
	const files = await listStoredVideoFiles({ date });

	{
		const info = { date, files: files.length };
		logger.info({ info }, 'Processing %d files for %s', info.files, info.date);
	}

	await downloadStoredVideoFiles(files, { storage, logger, baseDir });

	{
		const info = { date, ...(await storage.deleteFiles(files)) };
		logger.info(
			{ info },
			'Deleted %d files (%s) for %s in %s',
			info.files,
			formatBytes(info.bytes),
			info.date,
			formatDuration(info.time),
		);
	}
};
