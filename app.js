const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
var crypto = require('crypto');
var bodyParser = require("body-parser");
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

app.get('/api', (req, res) => {
	res.json({
		message: 'Welcome to the API'
	});
});

app.listen(5000, () => console.log('Server started on port 5000'));

app.post('/api/posts', verifyToken, (req, res) => {  // this is a moch of a real post that might be created by user or db
	jwt.verify(req.token, 'secretkey', (err, authData) => { // verifying manually, but token should be saved in user's local storage
		if(err) {
			res.sendStatus(403);
		} else {
			res.json({
				message: 'Post created...',
				authData
			});j
		}
	});
});

app.options('*', cors());
app.post('/api/imagesearch', cors(), (req, res, next) => {  // attempt to list files in image directory
	var imgFolder = "../solarreact/public/img";
//	var filelist = '';
	var filelist = [];
	fs.readdir(imgFolder, (err, files) => {
		if (err) {
			next(err); // pass errors to express
		} else {
			files.forEach(file => {
				if (file) {
	//				filelist += file;
					filelist.push(file);
				}
			});
			res.json({
				filelist
			});
		}
	});
});

app.options('*', cors());
app.post('/api/login', cors(), verifyLogin, (req, res) => {
	// password is a hash of low security pword b... no suffix
	var hpw = crypto.createHash('md5').update(req.body.password).digest('hex');
	if (hpw === 'e65c660c316b26d375c8878c7ac9c5d5' && req.body.user === 'jay') {
		res.json({
			message: "approved"
		});
	} else {
		res.json({
			message: "not approved"
		});
	}
//	jwt.sign({user: user}, 'secretkey', { expiresIn: '30s' }, (err, token) => { // look at jwt docs I think
//		res.json({
//			token: token
//		});
//	});
});

// FORMAT OF TOKEN
// Authorization: Bearer <access_token>

// Verify token    - not sure if using token is necessary
function verifyToken(req, res, next) {
	// Get auth header value
	const bearerHeader = req.headers['authorization'];
	// Check if bearer is undefined
	if(typeof bearerHeader !== 'undefined') {
		// Split at the space
		const bearer = bearerHeader.split(' ');
		// Get token from array
		const bearerToken = bearer[1];
		// Set the token
		req.token = bearerToken;
		// Next middleware
		next();
	} else {
		// forbidden
		res.sendStatus(403);
	//	res.json({    // could have done this for a custom message
	//		message: 'Forbidden'
	//	});
	}
}

function verifyLogin(req, res, next) {
	if(req.params['user'] === 'Jay' && req.params['password'] === 'bgesaw') {
		req.verified = true;
		next();
	} else {
//		res.sendStatus(403);
	}
	req.verified = true;
	next();
}



