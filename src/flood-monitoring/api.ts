import { basename } from 'node:path';
import {
	fetchJson,
	type FetchOptions,
	type HttpClientRequestError,
} from '../utils/fetch.js';

const url = 'https://environment.data.gov.uk/flood-monitoring/data/readings';

const stationReference = '3400TH';

export interface Options {
	since?: Date | number | string; // 2016-09-07T10:30:00Z
}

export type Reading = [t: string, v: number];

export interface ReadingsResponseJson {
	items: {
		dateTime: string;
		measure: string;
		value: number;
	}[];
}

/** Sort a readings response. */
export const sortReadingsResponse = (items: ReadingsResponseJson['items']) => {
	const data: Record<string, Reading[]> = {};
	for (const { dateTime, measure, value } of items) {
		if (!(measure in data)) {
			data[measure] = [];
		}
		data[measure].push([dateTime, value]);
	}

	const ret: Record<string, Reading[]> = {};
	for (const [key, val] of Object.entries(data)) {
		val.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
		ret[basename(key)] = val;
	}
	return ret;
};

/** Fetch readings for the station. */
export const fetchReadings = async (options: Options = {}) => {
	const params: FetchOptions['params'] = { stationReference };

	if (options.since) {
		const since = `${new Date(options.since).toISOString().substring(0, 19)}Z`;
		console.log({ since });
		params.since = since;
	}

	params._limit = 10000;

	const [data] = await fetchJson(url, { params });
	const { items } = data as ReadingsResponseJson;

	return sortReadingsResponse(items);
};

try {
	const since = Math.floor(new Date().valueOf() / 86400000) * 86400000;
	const readings = await fetchReadings({ since });
	console.log(readings);
} catch (err) {
	if ((err as HttpClientRequestError).text) {
		console.log(await (err as HttpClientRequestError).text());
	}
}
