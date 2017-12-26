# Nuxeo Uploader Javascript
Upload easily a file to nuxeo.

## Install

``` bash
npm install --save nuxeo-uploader

``` 

## Usage

``` js
const nuxeoUploader = require('nuxeo-uploader');

//
var nuxeoUp = nuxeoUploader('myUrl', 'myToken');

nuxeoUp({
	id_parent: '', // id of directory
	id_file: '', // optional | to update existing file
	document: { // optional
		name: '', // optional | name of file entity
		title: '', // optional | title of file entity | default name document
		description: '', // optional | description of file entity
	},
	file: 'myUrl', // optional | file informations
	attach: ['myUrl', 'myUrl'], // optional | attach files informations
}).then((data) => {
	//
}).catch((error) => {
	//
})

//
var nuxeoUp = nuxeoUploader('myUrl', {
	auth: {
		user: 'myUser',
		pwd: 'myPwd',
	},
});

nuxeoUp({
	id_parent: '', // id of directory
	id_file: '', // optional | to update existing file
	document: { // optional
		name: '', // optional | name of file entity
		title: '', // optional | title of file entity | default name document
		description: '', // optional | description of file entity
	},
	file: { // optional | file informations
		id: '1', // optional | nuxeo batch file id 
		url: 'myUrl', // file url
	},
	attach: ['myUrl'], // optional | attach files informations
}).then((data) => {
	//
}).catch((error) => {
	//
})

//
var nuxeoUp = nuxeoUploader('myUrl', {
	token: 'myToken',
});

nuxeoUp({
	id_parent: '', // id of directory
	id_file: '', // optional | to update existing file
	document: { // optional
		name: '', // optional | name of file entity
		title: '', // optional | title of file entity | default name document
		description: '', // optional | description of file entity
	},
	file: 'myUrl', // optional | file informations
	attach: [  // optional | attach informations
		{
			id: '1', // optional | nuxeo batch file id 
			url: 'myUrl', // file url
		},
		{
			id: '0', // optional | nuxeo batch file id 
			url: 'myUrl', // file url
		},
	],
}).then((data) => {
	//
}).catch((error) => {
	//
})

```

## Works

To upload a file in nuxeo you have to fill `file` property but if you want to attach files in a entity you have to fill 'attach' property.