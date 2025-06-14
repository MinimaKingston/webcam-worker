/**
 * Handle the upstream Camsecure API.
 *
 * Camsecure does not currently implement a proper API, we have to scrape the
 * file download pages.
 */
import path from 'node:path';

import { parseCameraFilename } from '../camera-file/camera-file.js';

import { fetchText, fetchFile } from '../utils/fetch.js';

// Regular expressions for extracting links from HTML.
//                   href="(     =./  {name }&     )"
const cameraLinkRegEx = /href="([^=]+=\.\/([^&]+)&[^"]*)"/g;
//                 href="(      /{yyyy}&     )"
const yearLinkRegEx = /href="([^&]+\/(\d{4})&[^"]+)"/g;
//                  href="(        /yyyy/{mm}&    )"
const monthLinkRegEx = /href="([^&]+\/\d{4}\/(\d{2})&[^"]+)"/g;
//                  href="(        /yyyy/mm/{dd}&    )"
const dayLinkRegEx = /href="([^&]+\/\d{4}\/\d{2}\/(\d{2})&[^"]+)"/g;

const fileLinkRegEx = /href="(download.php\?fname=\.\/(.+?([^/]+?\.mp4)))"/g;

/** A link to a camera. */
export interface CameraLink {
	camera: string;
	path: string;
}

/** A link to a year. */
export interface YearLink {
	year: string;
	path: string;
}

/** A link to a month. */
export interface MonthLink {
	month: string;
	path: string;
}

/** A link to a day. */
export interface DayLink {
	day: string;
	path: string;
}

/** A link to a camera video file. */
export interface FileLink {
	filename: string;
	path: string;
	directPath: string;
}

/** Fetch links for cameras from the server. */
export const fetchCameraLinks = async (url: string): Promise<CameraLink[]> => {
	const [html] = await fetchText(url);

	const matches = html.matchAll(cameraLinkRegEx);
	const ret: CameraLink[] = [];
	for (const match of matches) {
		ret.push({ camera: match[2], path: match[1] });
	}
	return ret;
};

/** Fetch links for years from a camera page. */
export const fetchYearLinks = async (
	cameraPath: string,
	baseUrl: string,
): Promise<YearLink[]> => {
	const [html] = await fetchText(`${baseUrl}${cameraPath}`);

	const matches = html.matchAll(yearLinkRegEx);
	const ret: YearLink[] = [];
	for (const match of matches) {
		ret.push({ year: match[2], path: match[1] });
	}
	return ret.sort(({ year: a }, { year: b }) => (a < b ? -1 : a > b ? 1 : 0));
};

/** Fetch links for months from a year page. */
export const fetchMonthLinks = async (
	yearPath: string,
	baseUrl: string,
): Promise<MonthLink[]> => {
	const [html] = await fetchText(`${baseUrl}${yearPath}`);

	const matches = html.matchAll(monthLinkRegEx);
	const ret: MonthLink[] = [];
	for (const match of matches) {
		ret.push({ month: match[2], path: match[1] });
	}
	return ret.sort(({ month: a }, { month: b }) => (a < b ? -1 : a > b ? 1 : 0));
};

/** Fetch links for days by drill-down from a camera page. */
export const fetchDayLinksForCamera = async (
	cameraPath: string,
	baseUrl: string,
): Promise<DayLink[]> => {
	const dayLinks: DayLink[] = [];
	for (const yearLink of await fetchYearLinks(cameraPath, baseUrl)) {
		for (const monthLink of await fetchMonthLinks(yearLink.path, baseUrl)) {
			dayLinks.push(...(await fetchDayLinksForMonth(monthLink.path, baseUrl)));
		}
	}
	return dayLinks;
};

/** Fetch links for days from a month page. */
export const fetchDayLinksForMonth = async (
	monthPath: string,
	baseUrl: string,
): Promise<DayLink[]> => {
	const [html] = await fetchText(`${baseUrl}${monthPath}`);

	const matches = html.matchAll(dayLinkRegEx);
	const ret: DayLink[] = [];
	for (const match of matches) {
		ret.push({ day: match[2], path: match[1] });
	}
	return ret.sort(({ day: a }, { day: b }) => (a < b ? -1 : a > b ? 1 : 0));
};

/** Fetch links for video files from a day page. */
export const fetchFileLinks = async (
	dayPath: string,
	baseUrl: string,
): Promise<FileLink[]> => {
	const [html] = await fetchText(`${baseUrl}${dayPath}`);

	const matches = html.matchAll(fileLinkRegEx);
	const ret: FileLink[] = [];
	for (const [, path, directPath, filename] of matches) {
		ret.push({ filename, path, directPath });
	}
	return ret.sort(({ filename: a }, { filename: b }) =>
		a < b ? -1 : a > b ? 1 : 0,
	);
};

/**
 * Download a file from the camera.
 * @param filePath Relative path
 * @param baseDir  Ba
 * @param baseUrl
 * @returns
 */
export const downloadCameraFile = async (
	/** path to the file */
	filePath: string,
	baseDir: string,
	baseUrl: string,
) => {
	const f = parseCameraFilename(filePath);
	const localPath = path.join(baseDir, f.year, f.month, f.day, f.filename);

	return fetchFile(`${baseUrl}${filePath}`, localPath);
};
