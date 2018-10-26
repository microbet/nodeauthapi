const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
var crypto = require('crypto');
var bodyParser = require("body-parser");
const fs = require('fs');
const app = express();
const PDFDocument = require('pdfkit');
app.use(bodyParser.json());
app.use(cors());

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
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, '../solarreact/public/img')
	},
	filename: function (req, file, cb) {
		fs.readFile('../solarreact/src/ImageData.json', 'utf8', (err, data) => {
			if (err) throw err;
			imgDataArr = JSON.parse(data);
			const filename = imgDataArr[imgDataArr.length-1][2].toString() + '_' + imgDataArr[imgDataArr.length-1][0].toString() + '.jpg';
			imgDataArr.push([imgDataArr.length+1, "./img/" + filename, imgDataArr[imgDataArr.length-1][2], "this would be the caption here"]);
			console.log(JSON.stringify(imgDataArr));
			writeImageData(imgDataArr);
			cb(null, filename);
		});
	}

});

var upload = multer({ 
	storage: storage
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

/****
* deletePic pretty obvious - delete pic with ID given as imgnmb and rewrite JSON file
*/

app.post('/api/deletePic', (req, res) => {
	// let imgFolder = "../solarreact/public/img";  // why not send the whole filename?
	console.log('image to delete = ' + req.body.imgfile.thisfile);
	res.send('I have yet to delete' + req.body.imgfile.thisfile);
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

app.post('/api/pdfgen', (req, res) => {
	// let imgFolder = "../solarreact/public/img";  // why not send the whole filename?
	
	// Create a document
	let doc = new PDFDocument;
	
	// pipe its output to a file
	let writeStream = fs.createWriteStream('output.pdf');
	doc.pipe(writeStream);
	
	// Embed a font, set the font size, and render some text
//	doc.font('fonts/PalentinoBold.ttf')
	doc.fontSize(25);
	doc.text('Some text with an embedded font!', 100, 100);
		
	// Draw a triangle
	doc.save()
		.moveTo(100, 150)
		.lineTo(100, 250)
		.lineTo(200, 250)
		.fill('#FF3300');
	
	
	
	// Finalize the pdf file
	doc.end();
	console.log('node knows something about a pdf');
	res.send('node told react it knows something about a pdf');
});