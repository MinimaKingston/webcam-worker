import qs, { type ParsedUrlQueryInput } from 'node:querystring';
import { mkdir, rename, utimes } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';

import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

export type FetchResponse<T> = [a: T, r: Response];

export interface FetchOptions extends RequestInit {
	/** Query paramaters. */
	params?: ParsedUrlQueryInput;
}

export class HttpClientRequestError extends Error {
	readonly name = 'HttpCLientRequestError';
	protected readonly _response: Response;
	protected _json: unknown;
	protected _text: string = '';
	protected readonly _status: number | null;
	protected jsonUsed: boolean = false;

	constructor(message: string, response: Response) {
		super(message);
		this._response = response;
		this._status = response.status ?? null;
	}

	get response() {
		return this._response;
	}

	get status() {
		return this._status;
	}

	async text(): Promise<string> {
		// Return the cached JSON data.
		if (this.jsonUsed) return JSON.stringify(this._json);
		// Body has been read but was not JSON.
		if (this.response.bodyUsed) return this._text;
		this._text = await this._response.text();
		return this._text;
	}

	async json() {
		// Return the cached JSON data.
		if (this.jsonUsed) return this._json;
		// Body has been read but was not JSON.
		if (this.response.bodyUsed) return false;
		// Body is not JSON.
		if (!isJsonResponse(this._response)) return false;
		this._json = await this._response.json();
		return this._json;
	}
}

/** Test if a response is JSON (according to the `Content-Type` header). */
export const isJsonResponse = (response: Response) =>
	response.headers.get('Content-Type') === 'application/json';

/**
 * Fetch a file from a URL.
 *
 * This pipes the remote stream directly to the local file. The file's `mtime`
 * is set to the value of the  Last-Modified header, if there is one.
 *
 * @param url
 * @param localPath
 * @returns
 */
export const fetchFile = async (
	/** Remote URL. */
	url: string,
	/** Local file path. */
	localPath: string,
	options: FetchOptions = {},
): Promise<
	FetchResponse<{
		contentLength: number;
		lastModified: Date | null;
		localPath: string;
	}>
> => {
	const response = await fetchResponse(url, options);

	const contentLength = parseInt(response.headers.get('content-length') ?? '0');
	const lastModifiedHeader = response.headers.get('last-modified');
	const lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

	if (contentLength === 0 || response.body == null) {
		throw new HttpClientRequestError(
			'HTTP client request error: no response body',
			response,
		);
	}

	// Make sure the directory exists.
	const dir = dirname(localPath);
	await mkdir(dir, { recursive: true });

	// Download the file using a temporary name in case of abort.
	const tempFile = `${localPath}.tmp`;
	const ws = createWriteStream(tempFile, 'binary');
	await finished(Readable.fromWeb(response.body).pipe(ws));

	// Change the date.
	if (lastModified) {
		await utimes(tempFile, lastModified, lastModified);
	}

	// Rename the temporary file.
	await rename(tempFile, localPath);

	return [{ contentLength, lastModified, localPath }, response];
};

/**
 * Fetch a json object from a URL, throwing HTTP errors.
 */
export const fetchJson = async (
	url: string,
	options: FetchOptions = {},
): Promise<FetchResponse<unknown>> => {
	options.headers = { accept: 'application/json', ...options.headers };
	const response = await fetchResponse(url, options);

	if (!isJsonResponse(response)) {
		throw new HttpClientRequestError('Response is not JSON', response);
	}
	return [await response.json(), response];
};

/**
 * Fetch a response from a URL, throwing HTTP errors.
 */
export const fetchResponse = async (
	url: string,
	options: FetchOptions = {},
): Promise<Response> => {
	const req: RequestInit = {};

	if (options.headers) {
		req.headers = options.headers;
	}

	if (options.method) {
		req.method = options.method;
	}

	if (options.params) {
		url = `${url}?${qs.stringify(options.params)}`;
	}

	const response = await fetch(url, req);

	const { status } = response;

	if (status >= 400) {
		throw new HttpClientRequestError(
			`HTTP client request error: status ${status}`,
			response,
		);
	}

	return response;
};

/**
 * Fetch text from a URL, throwing HTTP errors.
 */
export const fetchText = async (
	url: string,
	options: FetchOptions = {},
): Promise<FetchResponse<string>> => {
	const response = await fetchResponse(url, options);

	return [await response.text(), response];
};
