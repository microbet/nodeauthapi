const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
var crypto = require('crypto');
var bodyParser = require("body-parser");
const fs = require('fs');
const app = express();
const PDFDocument = require('pdfkit');
const https = require('https');
app.use(bodyParser.json());
app.use(cors());
require('dotenv').config();

function writeImageData(jsondata) {
	fs.writeFile('../solarreact/src/ImageData.json', JSON.stringify(jsondata), (err) => {
		if (err) throw err;
		console.log('the file has been written');
	});
}

app.get('/api', (req, res) => {
	res.json({
		message: 'Welcome to the API'
	});
});

app.listen(5000, () => console.log('Server started on port 5000'));

app.post('/api/posts', verifyToken, (req, res) => {  // this is a mock of a real post that might be created by user or db
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

/*****
 * ImageData is a file on the file system which contains data about
 * the images, identifying which are grouped together from projects
 * the main picture is the parent and the rest are children.
 * Naming of the images is crucial.  And a caption is included.
 */



/*****
 * route for uploading an image.  This must move the image to the right
 * directory, name it properly, and append info to the ImageData file
 */

// this filename has to come after searching ImageData and knowing picCategory 
// to decide the filename

// I think I need to not use multer here. and write my own middleware https://expressjs.com/en/guide/using-middleware.html
// or I just have to handle the upload inside the function in the argument list of the post function.
// this may have to check the file size
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, '../solarreact/public/img')
	},
	filename: function (req, file, cb) {
		fs.readFile('../solarreact/src/ImageData.json', 'utf8', (err, data) => {
			if (err) throw err;
			imgDataArr = JSON.parse(data);
			const filename = imgDataArr[0] ? 
								imgDataArr[0][0].toString() + '_' + imgDataArr[imgDataArr.length-1][0].toString() + '.jpg'
							 :
								'1.jpg';
			var allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif']; 
			if (allowedMimes.includes(file.mimetype) && file.size < (1024*1024)) {
				const parentId = imgDataArr[0] ? imgDataArr[0][0] : 0;
				imgDataArr.push([imgDataArr.length+1, "./img/" + filename, parentId, "this would be the caption here"]);
				console.log(JSON.stringify(imgDataArr));
				writeImageData(imgDataArr);
			}
			cb(null, filename);
		});
	}

});

var limits = {
	files: 1,
	fileSize: 1024 * 1024, // 1MB max for now anyway
};

var fileFilter = function(req, file, cb) {
	// supported image file mimetypes
	var allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif']; 
	if (allowedMimes.includes(file.mimetype)) {
		// allow supported image files
		cb(null, true);
	} else {
		// invalid file type
		cb(new Error('Invalid file type.  Only jpg, png and gif image files are allowed.'));
	}
};

var upload = multer({ 
	storage: storage,
	limits: limits,
	fileFilter: fileFilter
});
app.post('/api/imgupload', upload.single('image'), function(req, res, next) { // upload pic to image directory
	console.log("do I get anywhere");
	console.log(req.body.picCategory);
//	res.send('this is post route upload');
});
	

/*****
 * imagesearch just gets the names of the image files and returns it
 * as an array
 */

app.post('/api/imagesearch', cors(), (req, res, next) => {  // list files in image directory
	var imgFolder = "../solarreact/public/img";
	var filelist = [];
	fs.readdir(imgFolder, (err, files) => {
		if (err) {
			next(err); // pass errors to express
		} else {
			files.forEach(file => {
				if (file) {
					filelist.push(file);
				}
			});
			res.json({
				filelist
			});
		}
	});
});


/*****
 * When you are editing images you can swap them by dragging and dropping
 * and that sends you here.
 */

app.post('/api/imgswap', cors(), (req, res) => {
	// should have req.body.selected and req.body.displaced to switch
	var imgFolder = "../solarreact/public/img";
	var sel = imgFolder + '/' + req.body.selected;
	var dis = imgFolder + '/' + req.body.displaced;
	var tmp = imgFolder + '/' + 'temp.' + req.body.selected;
	fs.renameSync(sel, tmp);  // I'm not sure this is 100% synchronous
	fs.renameSync(dis, sel); 
	fs.renameSync(tmp, dis);
	// also need to overwrite ImageData.json with jsondata
	writeImageData(req.body.jsondata);
	res.json({
		message: sel + " switch with " + dis + req.body.jsondata
	});
});

/***
* edit the caption
*/

app.post('/api/editCaption', (req, res) => {
	fs.readFile('../solarreact/src/ImageData.json', 'utf8', (err, data) => {
		let imgDataArr = JSON.parse(data);
		console.log(imgDataArr);
		console.log("change caption of " + req.body.imgfile + " to " + req.body.newCaption);
		let index = req.body.imgfile;
		imgDataArr[index][3] = req.body.newCaption;
		writeImageData(imgDataArr);
		console.log(imgDataArr);
	});
});


/****
* deletePic pretty obvious - delete pic with ID given as imgnmb and rewrite JSON file
*/

app.post('/api/deletePic', (req, res) => {
	let imgFolder = "../solarreact/public/img/";  // why not send the whole filename?
	let prefix = '';
	let prefixArr = [];
	let fileNameArr = [];
	let childNum  = 0;
	console.log(req.body.jsondata);
	writeImageData(req.body.jsondata);
	console.log('image to delete = ' + req.body.imgfile.thisfile)
	res.send('I have yet to delete' + req.body.imgfile.thisfile);
	fs.unlink(imgFolder + req.body.imgfile.thisfile, (err) => {  // this is asynchronous
		if (err) {
			console.log("error deleting ", imgFolder + req.body.imgfile.thisfile, " :", err);
		} else {
			console.log(imgFolder + req.body.imgfile.thisfile, " was deleted");
		}
	});  
	console.log("thisfile");
	console.log(req.body.imgfile.thisfile);
	if (req.body.imgfile.thisfile !== '1.jpg') {
		fileNameArr = req.body.imgfile.thisfile.split('.');
		console.log("filenamearr");
		console.log(fileNameArr);
		prefixArr = fileNameArr[0].split('_');
		console.log("prefixarr");
		console.log(prefixArr);
		console.log("prefixarr1");
		console.log(prefixArr[1]);
		childNum = prefixArr[1];
		console.log("back here with childnum");
		console.log(childNum);
	} else {
		console.log("i'm here with childnum");
		childNum = 0;
	}
	fs.readdir(imgFolder, (err, files) => {
		if (err) {
			next(err); // pass errors to express
		} else {
			console.log("files");
			console.log(files);
			let i = 0;
			files.forEach(file => {
				console.log("file");
				console.log(file);
				console.log("childNum");
				console.log(childNum);
				if (file !== '1.jpg' && i >= childNum) {
					console.log("I made it in line 205 and i is");
					console.log(i);
					let sel = imgFolder + '/' + file;
					let dis = '';
					if (file == '1_1.jpg') {
						dis = imgFolder + '/1.jpg';
					} else {
						dis = imgFolder + '/1_' + i + '.jpg';
					}
					console.log("sel");
					console.log(sel);
					console.log("dis");
					console.log(dis);
					fs.renameSync(sel, dis);
				}
				i++;
			});
		}
	});
});
	

/*****
 * login is pretty self-explanatory - for development I haven't started using
 * tokens yet.  What I think I need is commented out.
 */

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
	const bearerHeader = req.headers['authorization']; // Get auth header value
	if(typeof bearerHeader !== 'undefined') { // Check if bearer is undefined
		const bearer = bearerHeader.split(' '); // Split at the space
		const bearerToken = bearer[1]; // Get token from array
		req.token = bearerToken; // Set the token
		next(); // Next middleware
	} else {
		res.sendStatus(403); // forbidden
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
