var fs = require('fs');
var btoa = require('btoa');
var filename = require('file-name');
var mime = require('mime-types');
var request = require('request');
var babyWorkers = require('baby-workers');

var nuxeoUploader = function(url, option)
{
	var $process = function()
	{
		this.run = function(data)
		{
			return new Promise(function(resolve, reject)
			{
				var workers = new babyWorkers;

				workers.create('initAttach', function(worker) {
					initializeFiles(worker, data.attach);
				}).run();

				workers.create('initFile', function(worker) {
					initializeFiles(worker, data.file);
				}).run();

				workers.then(function(error) {
					__engine.resolve = resolve;
					__engine.reject = reject;
					__engine.id_parent = data.id_parent;
					__engine.id_file = data.id_file;
					__engine.infosFile = ((tmp = workers.initFile.get()) == null ? {} : tmp);
					__engine.infosAttach = ((tmp = workers.initAttach.get()) == null ? [] : tmp);
					__engine.document = (typeof(data.document) == 'object' ? data.document : {});
					__engine.document.name = (__engine.document.name == undefined ? __engine.infosFile.name : __engine.document.name);
					__engine.document.title = (__engine.document.title == undefined ? __engine.document.name : __engine.document.title);
					__engine.document.description = (__engine.document.description == undefined ? '' : __engine.document.description);

					if (__engine.id_file != null && __engine.id_file != undefined) {
						return uploadVerifyDocument();
					}
					return uploadVerifyDocument();
				}, false);
			}).catch(reject);
		}

		var initializeFiles = function(worker, files)
		{
			if (files == undefined) {
				return worker.pop();
			}

			var listFiles = [];
			var dataFiles = (Array.isArray(files) == true ? files : [files]);
			for (var index in dataFiles) {
				var url = (dataFiles[index].url == undefined ? dataFiles[index] : dataFiles[index].url);
				var name = filename(url) + '.' + (tmp = url.split('.'))[tmp.length - 1];
				var stats = fs.statSync(url);
				listFiles.push({
					id: (dataFiles[index].id == undefined ? null : dataFiles[index].id),
					file: dataFiles[index],
					url: url,
					name: name,
					size: stats.size,
					type: mime.lookup(name),
				});
			}

			worker.create('uploadFiles', uploadGenerateBatchId, listFiles).save([]).run();
			worker.uploadFiles.then(function() {
				var retFiles = (Array.isArray(files) == true ? worker.uploadFiles.get() : worker.uploadFiles.get()[0]);
				worker._save(retFiles);
				worker.pop();
			}).catch(worker.pop);
		}

		var uploadGenerateBatchId = function(worker, infosFile)
		{
			request
				.post(requestNuxeo('upload'), function(error, response, body) {
					if (error != null || response.statusCode == 500 || response.statusCode == 404) {
						worker.error('Error uploadGenerateBatchId function' + ' ' + JSON.stringify(error == null || error == undefined ? body : error));
						return worker.pop();
					}
					infosFile.batchId = body.batchId;
					uploadFile(worker, infosFile);
				})
			;
		}

		var uploadFile = function(worker, infosFile)
		{
			var id = (infosFile.id == null ? worker.getId() : infosFile.id); // @TODO: add versioning system ?
			fs.createReadStream(infosFile.url)
				.pipe(
					request.post(requestNuxeo('upload/' + infosFile.batchId + '/' + id, null, {
						'Content-Type': 'application/octet-stream',
						'Content-Length': infosFile.size,
						'X-File-Type': infosFile.type,
						'X-File-Name': infosFile.name,
					}), function(error, response, body) {
						if (error != null || response.statusCode == 500 || response.statusCode == 404) {
							worker.error('Error uploadFile function file = "' + __engine.document.name + '"' + ' ' + JSON.stringify(error == null || error == undefined ? body : error));
							return worker.pop();
						}
						infosFile.id = id;
						infosFile.batchId = body.batchId;
						worker._get().push(infosFile);
						worker.pop();
					})
				)
			;
		}
		
		var uploadVerifyDocument = function()
		{
			if (__engine.id_file == null) {
				return uploadCreateDocument();
			}
			request
				.get(requestNuxeo('id/' + __engine.id_file), function(error, response, body) {
					if (error != null || response.statusCode == 500 || response.statusCode == 404) {
						return uploadCreateDocument();
					}
					__engine.infosDocument = body;
					uploadUpdateDocument();
				})
			;
		}

		var uploadCreateDocument = function()
		{
			request
				.post(requestNuxeo('id/' + __engine.id_parent, {
					name: __engine.document.name,
					'entity-type': 'document',
					type: 'File',
					properties: {
						'dc:title': __engine.document.title,
						'dc:description': __engine.document.description,
						'common:icon': null,
						'common:icon-expanded': null,
						'common:size': null,
					}
				}), function(error, response, body) {
					if (error != null || response.statusCode == 500 || response.statusCode == 404) {
						return __engine.reject('Error uploadCreateDocument function file = "' + __engine.document.name + '"' + ' ' + JSON.stringify(error == null || error == undefined ? body : error));
					}
					__engine.infosDocument = body;
					uploadUpdateDocument();
				})
			;
		}

		var uploadUpdateDocument = function()
		{
			request
				.put(requestNuxeo('id/' + __engine.infosDocument.uid, {
					name: __engine.document.name,
					'entity-type': 'document',
					type: 'File',
					properties: getProperties(),
				}), function(error, response, body) {
					if (error != null || response.statusCode == 500 || response.statusCode == 404) {
						return __engine.reject('Error uploadUpdateDocument function file = "' + __engine.document.name + '"' + ' ' + JSON.stringify(error == null || error == undefined ? body : error));
					}
					__engine.resolve(body);
				})
			;
		}

		var getProperties = function()
		{
			var toRet = {};

			if (__engine.infosFile.batchId != undefined) {
				toRet['file:content'] = {
					'upload-batch': __engine.infosFile.batchId,
					'upload-fileId': __engine.infosFile.id,	
				};
			}

			if (__engine.infosAttach.length != 0) {
				toRet['files:files'] = [];
				for (var index in __engine.infosAttach) {
					toRet['files:files'].push({
						file: {
							'upload-batch': __engine.infosAttach[index].batchId,
							'upload-fileId': __engine.infosAttach[index].id,
						},
					});
				}
			}
			return toRet;
		}

		var requestNuxeo = function(url, data, headers)
		{
			var object = {
				url: _engine.url + url,
				headers: {
					Authorization: _engine.token,
					'Content-Type': 'application/json',
				},
				json: true,
			};
			if (data !== null && data !== undefined) {
				object.body = data;
			}
			for (var index in headers) {
				object.headers[index] = headers[index];
			}
			return object;
		}

		var __engine = {
			this: this,
			resolve: null,
			reject: null,
			id_parent: null,
			id_file: null,
			document: null,
			infosDocument: null,
			infosFile: {},
			infosAttach: [],
		}

		return __engine.this;
	}

	var _engine = {
		this: this,
		url: url,
		token: (typeof(option) == 'string' ? option : (typeof(option.token) == 'string' ? option.token : 'Basic ' + btoa(option.auth.user + ':' + option.auth.pwd))),
	};

	var process = new $process();
	return process.run;
};

module.exports = nuxeoUploader;
