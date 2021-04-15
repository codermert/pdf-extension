"use strict";
var ConvertApi;
(function (ConvertApi_1) {
    function auth(credentials, host) {
        return new ConvertApi(credentials, host);
    }
    ConvertApi_1.auth = auth;
    class ConvertApi {
        constructor(credentials, host = 'v2.convertapi.com') {
            this.credentials = credentials;
            this.host = host;
        }
        createParams(init) {
            return new ConvertApi_1.Params(this.host, init);
        }
        convert(fromFormat, toFormat, params) {
            return Promise.resolve(params.dto)
                .then(dto => {
                let altConvParam = dto.Parameters.filter(p => p.Name.toLowerCase() == 'converter');
                let converterPath = (altConvParam === null || altConvParam === void 0 ? void 0 : altConvParam.length) > 0 ? `/converter/${altConvParam[0].Value}` : '';
                let auth = this.credentials.secret ? `secret=${this.credentials.secret}` : `apikey=${this.credentials.apiKey}&token=${this.credentials.token}`;
                return fetch(`https://${this.host}/convert/${fromFormat}/to/${toFormat}${converterPath}?${auth}&storefile=true`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dto) })
                    .then(resp => resp.json())
                    .then(dto => new ConvertApi_1.Result(dto));
            });
        }
    }
})(ConvertApi || (ConvertApi = {}));
var ConvertApi;
(function (ConvertApi) {
    class FileValue {
        constructor(name, fileId) {
            this.name = name;
            this.fileId = fileId;
        }
    }
    ConvertApi.FileValue = FileValue;
    class FileParam {
        constructor(name, file, host) {
            this.name = name;
            this.file = file;
            this.host = host;
        }
        value() {
            if (this.file instanceof FileValue) {
                return Promise.resolve(this.file.fileId);
            }
            else {
                let uploadUrl = `https://${this.host}/upload?`;
                let response = this.file instanceof URL
                    ? fetch(`${uploadUrl}url=${this.file.href}`, { method: 'POST' })
                    : fetch(`${uploadUrl}filename=${this.file.name}`, { method: 'POST', body: this.file });
                return response.then(r => r.json()).then(obj => obj.FileId);
            }
        }
        get dto() {
            return this.value().then(v => ({
                Name: this.name,
                FileValue: { Id: v }
            }));
        }
    }
    ConvertApi.FileParam = FileParam;
})(ConvertApi || (ConvertApi = {}));
var ConvertApi;
(function (ConvertApi) {
    class FilesValue {
        constructor(files) {
            this.files = files;
        }
        asArray() {
            return this.files.map(f => new ConvertApi.FileValue(f.FileName, f.FileId));
        }
    }
    ConvertApi.FilesValue = FilesValue;
    class FilesParam {
        constructor(name, files, host) {
            this.name = name;
            this.fileValPros = [];
            if (files instanceof FileList) {
                this.fileValPros = Array.from(files).map(f => new ConvertApi.FileParam(name, f, host).value().then(i => ({
                    Id: i
                })));
            }
            else if (files instanceof FilesValue) {
                this.fileValPros = files.asArray().map(f => Promise.resolve({
                    Id: f.fileId
                }));
            }
            else {
                this.fileValPros = files.map(f => Promise.resolve(f instanceof URL ? { Url: f.href } : { Id: f }));
            }
        }
        get dto() {
            return Promise.all(this.fileValPros).then(fv => ({
                Name: this.name,
                FileValues: fv
            }));
        }
    }
    ConvertApi.FilesParam = FilesParam;
})(ConvertApi || (ConvertApi = {}));
var ConvertApi;
(function (ConvertApi) {
    class Param {
        constructor(name, value) {
            this.name = name;
            this.value = value;
        }
        get dto() {
            return Promise.resolve({
                Name: this.name,
                Value: this.value
            });
        }
    }
    ConvertApi.Param = Param;
})(ConvertApi || (ConvertApi = {}));
var ConvertApi;
(function (ConvertApi) {
    class Params {
        constructor(host, init) {
            this.host = host;
            this.params = [];
            let param;
            init === null || init === void 0 ? void 0 : init.forEach(p => {
                if (p.isFile) {
                    if (typeof (p.value) === 'string') {
                        param = new ConvertApi.FileParam(p.name, new ConvertApi.FileValue('', p.value), this.host);
                    }
                    else {
                        param = p.value instanceof Array
                            ? new ConvertApi.FilesParam(p.name, p.value, this.host)
                            : param = new ConvertApi.FileParam(p.name, p.value, this.host);
                    }
                }
                else {
                    param = new ConvertApi.Param(p.name, p.value);
                }
                this.params.push(param);
            });
        }
        add(name, value) {
            let param;
            if (value instanceof ConvertApi.FilesValue || value instanceof FileList || value instanceof Array) {
                param = new ConvertApi.FilesParam(name, value, this.host);
            }
            else if (value instanceof ConvertApi.FileValue || value instanceof File || value instanceof URL) {
                param = new ConvertApi.FileParam(name, value, this.host);
            }
            else {
                param = new ConvertApi.Param(name, value);
            }
            this.params.push(param);
            return param;
        }
        get(name) {
            return this.params.find(p => p.name === name);
        }
        delete(name) {
            let idx = this.params.findIndex(p => p.name === name);
            return this.params.splice(idx, 1)[0];
        }
        get dto() {
            let dtoPros = this.params.map(p => p.dto);
            return Promise.all(dtoPros).then(ds => ({ Parameters: ds }));
        }
    }
    ConvertApi.Params = Params;
})(ConvertApi || (ConvertApi = {}));
var ConvertApi;
(function (ConvertApi) {
    class Result {
        constructor(dto) {
            this.dto = dto;
        }
        get duration() {
            return this.dto.ConversionTime;
        }
        get files() {
            return this.dto.Files;
        }
        toParamFile(idx = 0) {
            return new ConvertApi.FileValue(this.dto.Files[idx].FileName, this.dto.Files[idx].FileId);
        }
        toParamFiles() {
            return new ConvertApi.FilesValue(this.dto.Files);
        }
        uploadToS3(region, bucket, accessKeyId, secretAccessKey) {
            return this.dto.Files.map(f => {
                let dto = {
                    region: region,
                    bucket: bucket,
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey,
                    fileId: f.FileId
                };
                return fetch(`https://integration.convertapi.com/s3/upload`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(dto)
                });
            });
        }
    }
    ConvertApi.Result = Result;
})(ConvertApi || (ConvertApi = {}));
var ConvertApi;
(function (ConvertApi) {
    function worker(worker, params) {
        let paramPros = params instanceof HTMLFormElement
            ? Array.from(new FormData(params).entries()).map(pair => resolveParam(pair[0], pair[1]))
            : Object.keys(params).map(k => resolveParam(k, params[k]));
        return Promise.all(paramPros).then(p => fetch(worker.href, {
            method: 'POST',
            headers: {
                'content-type': 'application/json;charset=UTF-8',
                'convertapi-params': 'true'
            },
            body: JSON.stringify(p)
        }));
    }
    ConvertApi.worker = worker;
    function resolveParam(name, value) {
        let valPro;
        let isFile;
        if (value instanceof File) {
            valPro = upload(value);
            isFile = true;
        }
        else if (value instanceof FileList || value instanceof Array) {
            valPro = uploadMulti(value);
            isFile = true;
        }
        else {
            valPro = Promise.resolve(value);
        }
        return valPro.then(v => ({
            name: name,
            value: v,
            isFile: isFile
        }));
    }
    function uploadMulti(value) {
        let dtoPros = Array.from(value).filter(f => f instanceof File).map(upload);
        return Promise.all(dtoPros);
    }
    function upload(f) {
        return fetch(`https://v2.convertapi.com/upload?filename=${f.name}`, { method: 'POST', body: f })
            .then(resp => resp.status === 200 ? resp.json() : Promise.reject(`File ${f.name} upload has failed with the status code ${resp.status}`))
            .then(dto => dto.FileId);
    }
})(ConvertApi || (ConvertApi = {}));
//# sourceMappingURL=convertapi.js.map