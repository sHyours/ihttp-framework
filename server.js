var http = require('http'),
	url = require('url'),
	querystring = require('querystring'),
	path = require('path'),
	fs = require('fs');

//var net = require('net');

exports.runServer = function(port) {
	/*
	net.createServer( function(client) {
		console.log('Server Connected');
		client.on('data', function(data) {
			console.log('[Received]' + data);
		});
		client.on('end', function() {
			console.log('Server Disconnected');
		});
	}).listen(80);
	*/
	http.createServer(function(req, res) {
		console.log('[' + req.method + ']', req.url);
		var _postData = '';
		
		//��ȡPOST����
		req.on('data', function(data) {
			_postData += data;
			console.log('[Received]' + data.length);
		});
		
		req.on('end', function() {
			//����POST����
			req.post = querystring.parse(_postData);
			//����dispatcher
			dispatcher(req, res);
		});
		
	}).listen(port);
	console.log('Server is running at port ' + port);
};

function dispatcher(req, res) {
	//�ж��Ƿ�����̬�ļ�
	var staticRoute = route.getStaticRoute();
	if(staticRoute.test(req.url)) {
		handleStatic(req, res);
	} else {
		handleDynamic(req, res);
	}
}

//����̬�ļ�������
function handleStatic(req, res) {
	var urlInfo = url.parse(req.url);
	var file = path.join(ROOT_PATH, urlInfo.pathname);
	path.exists(file, function(exists) {
		if (!exists) {
			handle404(req, res);
			return;
		}
		fs.stat(file, function(err, stats) {
			if (err) {
				handle500(req, res, err);
				return;
			}
			if (!stats.isFile()) {
				handle403(req, res);
				return;
			}
			//�������
			fs.readFile(file, function(err, data) {
				if (err) {
					handle500(req, res, err);
					return;
				} else {
					var ext = path.extname(file).slice(1);
					if (!ext) ext = 'html';
					res.writeHead(200, {'Content-Type': config.mimes[ext]});
					res.end(data);
				}
			});
		});
	});
}

//����̬����
function handleDynamic(req, res) {
	//����Controller��Action
	var actionInfo = route.getActionInfo(req);
	//��ȡִ�нű�
	try {
		var classPath = path.join(CONTROLLER_PATH, actionInfo.controller);
		var classRef = require(classPath).class; //���һ������
		var c = new classRef(req, res);
		if (typeof(c[actionInfo.action]) != 'function') {
			actionInfo.action = config.defaultAction; //ʹ��Ĭ��action
			if(typeof(c[actionInfo.action]) != 'function') {
				throw new Error('No callable action');
			}
		}
		//ִ�и�handler
		c[actionInfo.action]();
	} catch (e) {
		console.log(e);
		handle404(req, res);
	}
}

function handle404(req, res) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
	res.end('Page Not Found');
}
function handle403(req, res) {
	res.writeHead(403, {'Content-Type': 'text/plain'});
	res.end('Invalid request');
}
function handle500(req, res, err) {
	res.writeHead(500, {'Content-Type': 'text/plain'});
	res.end(err);
}