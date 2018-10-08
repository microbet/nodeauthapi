const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors')
var bodyParser = require("body-parser");

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
			});
		}
	});
});

app.options('*', cors());
// app.post('/api/login', cors(), verifyLogin, (req, res) => {
app.post('/api/login', cors(), verifyLogin, (req, res) => {
	// Mock user - usually uname and pword comes here and you authenticate and get user
	if (req.body.password === 'bgesaw' && req.body.user === 'jay') {
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

// Verify token
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



