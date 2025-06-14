import {
	S3Client,
	ListObjectsV2Command,
	// DeleteObjectsCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	ListObjectsV2CommandInput,
	// PutObjectCommand,
	// DeleteObjectCommand,

	// GetObjectTaggingCommand,
	// DeleteObjectTaggingCommand,
	// PutObjectTaggingCommand,
} from '@aws-sdk/client-s3';

import type { Config } from './config.js';

export interface ListObject {
	/** Unique key for the object (analgous to the full absolute path of a file). */
	Key: string;
	/** e.g. `2025-01-13T04:02:21.538Z` */
	LastModified: Date;
	/**
	 * Hash of the file contents: note this is wrapped in double quotes e.g.
	 * `"18548bb7681bb19ed21212a93041deef"`.
	 */
	ETag: string;
	/** File size in bytes. */
	Size: number;
	/** e.g. `STANDARD` */
	StorageClass: string;
	/** Only provided if FetchOwner is set to `true` on request. */
	Owner?: {
		/** e.g. `v7i5.ldn.idrivee2-65.com` on iDrive e2. */
		DisplayName: string;
		/** 64 hex characters on iDrive e2. */
		ID: string;
	};
}

interface ListObjectOptions {
	ignoreTruncate?: boolean;
	params?: {
		/** Set to override the default bucket. */
		Bucket?: string;
		/** Optional prefix for the Keys to return. */
		Prefix?: string;
		/** Limit on number of keys to return (1000) */
		MaxKeys?: number; // NUMBER_VALUE,
		/** Set to `true` to fetch owner details. */
		FetchOwner?: boolean;
		// ContinuationToken: 'STRING_VALUE',
		// StartAfter: 'STRING_VALUE'
	};
}

export class Storage {
	protected bucket: string;
	protected client: S3Client;

	constructor({ bucket, endpoint, region, credentials }: Config) {
		this.bucket = bucket;
		// Create the client.
		this.client = new S3Client({ endpoint, region, credentials });
	}

	/**
	 * Download a file object.
	 */
	async getFile(key: string) {
		const Bucket = this.bucket;
		const Key = key;
		const command = new GetObjectCommand({ Bucket, Key });

		return this.client.send(command);
	}

	/**
	 * Delete a file object.
	 */
	async deleteFile(key: string) {
		const Bucket = this.bucket;
		const Key = key;
		const command = new DeleteObjectCommand({ Bucket, Key });

		return this.client.send(command);
	}

	/** Delete files. */
	async deleteFiles(files: ListObject[]) {
		const info = { files: 0, bytes: 0, time: -performance.now() };
		for (const file of files) {
			const { Key, Size } = file;
			await this.deleteFile(Key);
			info.files++;
			info.bytes += Size;
		}
		info.time += performance.now();

		return info;
	}

	/**
	 * List file objects.
	 */
	async listObjects(options: ListObjectOptions = {}): Promise<ListObject[]> {
		const Bucket = this.bucket;
		const params: ListObjectsV2CommandInput = {
			Bucket,
			FetchOwner: false,
		};
		const command = new ListObjectsV2Command({ ...params, ...options.params });

		const data = await this.client.send(command);

		// Deal with truncated data to avoid any problems (can always retry with higher limit).
		if (data.IsTruncated && !(options.ignoreTruncate === true)) {
			throw new Error(`Response data is truncated at ${data.KeyCount} items`);
		}

		// Deal with no data.
		if (data.KeyCount === 0) {
			return [] as ListObject[];
		}

		return data.Contents as ListObject[];
	}
}
