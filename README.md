# webcam-worker

> Node.js worker to download and process Camsecure webcam files

Remote files

```
camera-files/{yyyy}/{mm}/{dd}/{camera}-{yyyy-mm-dd}_{hh:mm:ss}.mp4  Raw camera files.
fast-forward/{yyyy}/{mm}/{camera}-{yyyy-mm-dd}.mp4                  24h FF files
fast-forward/{yyyy}/{camera}-{yyyy-mm}.mp4                          Monthly FF files
fast-forward/{camera}-{yyyy}.mp4                                    Annual FF files
log/{yyyy}/{mm}/{yyyy-mm-dd}-{pid}.log.ndjson.zip                   Log files
```

Local files

```
camera-files/{yyyy}/{mm}/{dd}/{camera}-{yyyy-mm-dd}_{hh:mm:ss}.mp4  Raw files pending upload and ff/label transform.
fast-forward/{yyyy}/{mm}/{dd}/{camera}-{yyyy-mm-dd}_{hh:mm:ss}.mp4  Labelled 5 minute FF files pending concatenation.
fast-forward/{yyyy}/{mm}/{camera}-{yyyy-mm-dd}.mp4                  24h FF files
fast-forward/{yyyy}/{camera}-{yyyy-mm}.mp4                          Monthly FF files
fast-forward/{camera}-{yyyy}.mp4                                    Annual FF files
```
