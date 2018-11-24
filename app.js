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

// this may have to check the file size

function getFamilyFromJson(imgDataArr, Id) {
	let famArr = [];
	let start = 0;
	let end = 0;
	let started = false;
	for (let i=0; i<imgDataArr.length; i++) {
		end = i+1;
		if (imgDataArr[i].family === parseInt(Id)) {  // types don't match, maybe convert?  find out which is which
			console.log("hi");
			famArr.push(imgDataArr[i])
			if (start === 0 && !started) { 
				start = i;
				started = true;
			}
		} else if (started) {
			console.log("famarr = ", famArr);
			return [famArr, start, end];
		}
		if (i === imgDataArr.length - 1) { return [famArr, start, end]; }
	}
}

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		console.log("when here");
		cb(null, '../solarreact/public/img')
	},
	filename: function (req, file, cb) {
		fs.readFile('../solarreact/src/ImageData.json', 'utf8', (err, data) => {
			if (err) throw err;
			imgDataArr = JSON.parse(data);
			console.log("imgDataArr = ", imgDataArr);
			const famPackArr = getFamilyFromJson(imgDataArr, req.body.familyId);
			const famArr = famPackArr[0];
			console.log("famArr = ", famArr);
			const start = famPackArr[1];
			const end = famPackArr[2];
			let filename;
			if (!famArr[0]) {
				filename = req.body.familyId + "_0.jpg";
			} else {
				filename = famArr[0].family.toString() + '_' + (end - start).toString() + '.jpg'
			}
			console.log("filename = ", filename);
			const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif'];
			console.log("mimetype = ", file.mimetype);
			console.log("file size = ", file.size);
			if (allowedMimes.includes(file.mimetype)) { // && file.size < (5000000)) {  // why file.size undef
				console.log("end = ", end);
				console.log("start = ", start);
				let thisChildNum = end - start;
				console.log("famArrletn = ", famArr.length);
				if (famArr.length === 0) { thisChildNum = 0; let famArr = []; }
				let familyId = parseInt(req.body.familyId);
				console.log("familyId = ", familyId);
				console.log("childNum = ", thisChildNum);
				console.log("famArr = ", famArr);
				famArr.push({"family":familyId,"childNum":thisChildNum,"caption":""});
				console.log("famArr - ", famArr);
				const beforeArr = imgDataArr.slice(0, start);
				const endArr = imgDataArr.slice(end);
				let newImgDataArr = [];
				if (thisChildNum === 0) {
					newImgDataArr = imgDataArr.concat(famArr);
				} else {
					newImgDataArr = beforeArr.concat(famArr, endArr);
				}
				console.log(JSON.stringify(newImgDataArr));
				writeImageData(newImgDataArr);
			}
			cb(null, filename);
		});
	}

});

var limits = {
	files: 1,
	fileSize: 5000000, // 1MB max for now anyway
};

var fileFilter = function(req, file, cb) {
	console.log("i git ere");
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
app.use(function(req,res,next) {
	res.header("Access-Control-Allow-Origin","localhost:3000");
	res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
	next();
});
app.post('/api/editCaption', (req, res, next) => {
	console.log("what the harpo");
	fs.readFile('../solarreact/src/ImageData.json', 'utf8', (err, data) => {
		let imgDataArr = JSON.parse(data);
		console.log(imgDataArr);
		console.log("change caption of " + req.body.imgObj + " to " + req.body.newCaption);
		imgDataArr.forEach(function(element) {
			if (element.family === req.body.imgObj.family && element.childNum === req.body.imgObj.childNum) {
				element.caption = req.body.newCaption;
			}
		});
		writeImageData(imgDataArr);
		console.log(imgDataArr);
	});
});


/****
* deletePic pretty obvious - delete pic with ID given as imgnmb and rewrite JSON file
*/

function getFilename(imgObj) {
	return imgObj.family + '_' + imgObj.childNum + '.jpg';
}

function isParent(fileName) {
	if (fileName.includes('_')) { return false; }
	else { return true; }
}

function getChildNum(fileName) {
	let regex = /.?([0-9]*)_([0-9]*).*/g
	let matches = regex.exec(fileName);
	return matches[2];	
}

function getFamNum(fileName) {
	console.log("fileName = ", fileName);
	let regex =  /([0-9]*)_[0-9]*\.[jpg|png|gif|jpeg]/gi
	let matches = regex.exec(fileName);
	console.log("matches = ", matches);
	return parseInt(matches[1]);
}

// if you've deleted the last of a family you have to redo family names
// of all higher families

app.post('/api/deletePic', (req, res) => {
	let imgFolder = "../solarreact/public/img/";  // why not send the whole filename?
	let fileName = getFilename(req.body.imgObj);
	writeImageData(req.body.jsondata);
	fs.unlink(imgFolder + fileName, (err) => {  // this is asynchronous
		if (err) {
			console.log("error deleting ", imgFolder + fileName, " :", err);
		} else {
			console.log(imgFolder + fileName, " was deleted");
		}
	});  
	let thisFamNum;
	let thisChildNum;
	let newChildNum;
	fs.readdir(imgFolder, (err, files) => {  // this could all happen before the deletion asynchronously
	// then put inside a function which is called from inside unlink
		if (err) {
			next(err); // pass errors to express
		} else {
			files.forEach(file => {
				thisFamNum = getFamNum(file);
				thisChildNum = getChildNum(file);
				newChildNum = thisChildNum - 1;
				if (newChildNum>=req.body.imgObj.childNum && thisFamNum === req.body.imgObj.family) {
					let sel = imgFolder + '/' + file;
					let dis = '';
					dis = imgFolder + '/' + thisFamNum.toString() + '_' + newChildNum.toString() + '.jpg';
					fs.renameSync(sel, dis);
				}
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
