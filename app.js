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
const sizeup = require("sizeup-api")({ key:process.env.SIZEUP_KEY });

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
		fs.readFile('../solarreact/src/ImageData.json', 'utf8', (err, data) => {
			let imgDataArr = JSON.parse(data);
	console.log(imgDataArr);
				  console.log(req.body.imgfile.thisfile);
							 var newImgDataArr = [];
				  imgDataArr.forEach(function(element) {
							 if (element[1] !== './img/' + req.body.imgfile.thisfile) {
										newImgDataArr.push(element);
							 }
							 // I need to rename everything after whatever was found
				  });
							 console.log(newImgDataArr);

		//	writeImageData(imgDataArr);

		});
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
	
	console.log('PDF get start');
	
	/****
	* the function is going to take this stuff as inputs, but I'm just setting it here
	* for development
	*/
	
	const attribute = 'totalRevenue';
	const averageRevenue = [750000, 0];
	const bands = 5;
	const distance = 6;
	const geographicLocationId = 41284;
	const industryId = 8524;
	const itemCount = 3;
	const order = 'highToLow';
	const page = 1;
	const sort = 'desc';
	const sortAttribute = 'totalRevenue';
	const totalEmployees = [10, null];
	const totalRevenue = [200000, 10000000];
	const highSchoolOrHigher = 5;  // a percent
	const householdExpenditures = [20000, 100000];
	const householdIncome = [20000, 200000];
	const medianAge = [3, 90];
	const revenuePerCapita = [2, 15000];
	const whiteCollarWorkers = 3;
	
	function formatCamelToDisplay(input) {
		input_arr = input.split('');
	//	console.log("in the function");
		input_arr.forEach(function(element, index, input_arr) {
			if (element == element.toUpperCase()) {
				input_arr[index] = ' ' + element;
			}
		});
		input_arr[0] = input_arr[0].toUpperCase();
		return input_arr.join('');
	}
	
	/****
	 * this function is building the pdf.  maybe it should be moved
	 * the second parameter is for dynamically named properties of the pdfMsgObj
	 * the function changes pdfMsgObj because objects are passed by reference
	 * or something like that in javascript and that means I can use the parameters
	 * kind of like global variables without using global variables.
	 * this object will be used in the buildPdf function which creates the pdf
	 */
	let pdfMsgObj = {msg: 'Best places to advertise in the '};
	pdfMsgObj.displayAttribute = formatCamelToDisplay(attribute);
	pdfMsgObj.distance = distance;
	pdfMsgObj.zip = [];
	pdfMsgObj.totalRevenueMin = [];
	pdfMsgObj.totalRevenueMax = [];
	pdfMsgObj.population = [];
	pdfMsgObj.avgRevenueMin = [];
	pdfMsgObj.avgRevenueMax = [];
	pdfMsgObj.totalEmployeesMin = [];
	pdfMsgObj.totalEmployeesMax = [];
	pdfMsgObj.revenuePerCapitaMax = [];
	pdfMsgObj.householdIncome = [];
	pdfMsgObj.medianAge = [];
	pdfMsgObj.householdExpenditures = [];
	pdfMsgObj.whiteCollarWorkers = [];
	pdfMsgObj.bachelorsDegreeOrHigher = [];
	pdfMsgObj.highSchoolOrHigher = [];
	pdfMsgObj.averageRevenueMin = [];
	pdfMsgObj.averageRevenueMax = [];
	pdfMsgObj.revenuePerCapitaMin = [];
	pdfMsgObj.revenuePerCapitaMax = [];

	function buildPdfMsg(addedMsg, target='') {
//		console.log("building pdf...");
		if (target) {
			pdfMsgObj[target] = addedMsg;
		} else {
			pdfMsgObj.msg = pdfMsgObj.msg.concat(addedMsg + '\n');
		}
	}
	// describe the query, place, industry, KPI, search distance, filters

	Promise.all([
		sizeup.data.getPlace({ id: geographicLocationId }),
		sizeup.data.getIndustry( { id: industryId }),
		sizeup.data.getBestPlacesToAdvertise( { totalEmployees: totalEmployees, highSchoolOrHigher: highSchoolOrHigher, householdExpenditures: householdExpenditures, householdIncome: householdIncome, medianAge: medianAge, revenuePerCapita: revenuePerCapita, whiteCollarWorkers: whiteCollarWorkers, totalRevenue: totalRevenue, bands: bands, industryId: industryId, order: order, page: page, sort: sort, sortAttribute: sortAttribute, geographicLocationId: geographicLocationId, distance: distance, attribute: attribute } ),
	]).then(([place, industry, bestPlaces]) => {
			successCallback(place[0].City.LongName, "display location name"); // just for debug
			successCallback(industry[0].Name, "display industry name"); // just for debug
			bestCallback(bestPlaces.Items, "Best Places to Advertise"); // note: would you do this instead of putting the forEach loop right here?
			pdfMsgObj['displayLocation'] = place[0].City.LongName;
			pdfMsgObj['displayIndustry'] = industry[0].Name;
		}).then(buildPdf).catch(console.error)
	
	function successCallback(result, msg="success") {
	//	console.log(msg + ": ");
//		console.log(typeof result);
//		console.log(result);
//		console.log('ending here');
	//	buildPdfMsg(msg + ': ' + result);
	}

	/**
	 * note: I had passed things like element.TotalRevenue.Min to a function
	 * which then built up a pdf string or object depending on parameters
	 * and T suggested generalizing the function, but when doing that it 
	 * seemed like a function was unnecessary and I could just add the 
	 * parameter/value to the pdfMsgObj in here
	 */
	
	function bestCallback(result, msg="success") {
		result.forEach(function(element) {
	//		console.log(element.Centroid);
			pdfMsgObj['zip'].push(element.ZipCode.Name);
//			console.log(element.ZipCode.Zip);
//			console.log(element.TotalRevenue.Max);
			console.log(element);
			pdfMsgObj['totalRevenueMin'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.TotalRevenue.Min));  // throws an error if maxFDig is set to 0, but not minFDig 
			pdfMsgObj['totalRevenueMax'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.TotalRevenue.Max));
			pdfMsgObj['population'].push(element.Population);
			pdfMsgObj['averageRevenueMin'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.AverageRevenue.Min));
			pdfMsgObj['averageRevenueMax'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.AverageRevenue.Max));
			pdfMsgObj['totalEmployeesMin'].push(element.TotalEmployees.Min);
			pdfMsgObj['totalEmployeesMax'].push(element.TotalEmployees.Max);
			pdfMsgObj['revenuePerCapitaMin'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.RevenuePerCapita.Min));
			pdfMsgObj['revenuePerCapitaMax'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.RevenuePerCapita.Max));
			pdfMsgObj['householdIncome'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.HouseholdIncome));
			pdfMsgObj['medianAge'].push(element.MedianAge);
			pdfMsgObj['householdExpenditures'].push(Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(element.HouseholdExpenditures));
			pdfMsgObj['whiteCollarWorkers'].push(element.WhiteCollarWorkers);
			pdfMsgObj['bachelorsDegreeOrHigher'].push(element.BachelorsDegreeOrHigher);
			pdfMsgObj['highSchoolOrHigher'].push(element.HighSchoolOrHigher);
		});
		// ok this zip, total rev min and max need to be an array
	}
	
	function failureCallback(error) {
		console.log("failure: " + error);
	}

	/****
	 * note: If more than one pdf style is necessary it would not be hard
	 * to make a template and then some markup for inserting values of the
	 * pdfMsgObj.  If there is generally some problem with the html2pdf
	 * scripts it might not be that hard to develop a markup for basic
	 * html, but adding specific things for something like pdfkit where
	 * you can specify position - draw lines etc with its functions
	 */

	function buildPdf() {
		
		colors = {
				orange: '#fd7e14',
				graydark: '#343a40',
				gray: '#6c757d',
		}
		
		/***
		reference - colors
		--blue:#007bff;		--indigo:#6610f2;		--purple:#6f42c1;		--pink:#e83e8c;
		--red:#dc3545;		--orange:#fd7e14;		--yellow:#ffc107;		--green:#28a745;
		--teal:#20c997;		--cyan:#17a2b8;			--white:#fff;			--gray:#6c757d;
		--gray-dark:#343a40; --primary:#007bff;		--secondary:#6c757d;	--success:#28a745;
		--info:#17a2b8;		--warning:#ffc107;		--danger:#dc3545;		--light:#f8f9fa;
		--dark:#343a40;
		*/
		
		// Create a document
		let doc = new PDFDocument;
		
		// pipe its output to a file
		let writeStream = fs.createWriteStream('output.pdf');
		doc.pipe(writeStream);
		
		// Draw a rectangle - this will be szu-industry-and-locationXsSm-container
		doc.save()
			.moveTo(30, 30)
			.lineTo(600, 30)
			.lineTo(600, 90)
			.lineTo(30, 90)
			.fill('#0ea1ff');
		
		// Embed a font, set the font size, and render some text
		doc.fontSize(15);
		doc.moveDown(2);
		doc.fillColor(colors.graydark)
		doc.text("Best places to advertise in the ", { continued: true } )
			.fillColor(colors.orange)
			.text(pdfMsgObj.displayIndustry, { continued: true } )
			.fillColor(colors.graydark)
			.text(" industry near ", { continued: true } )
		    .fillColor(colors.orange) 
			.text(pdfMsgObj.displayLocation, { continued: true } )
			.fillColor(colors.graydark)
			.text(" based on ", { continued: true } )
			.fillColor(colors.orange)
			.text(pdfMsgObj.displayAttribute);
			
		doc.fontSize(10);		
		doc.fillColor(colors.graydark);
		doc.text("    Filtered for Zip Codes at most ", { continued: true } )
			.fillColor('black')
			.text(pdfMsgObj.distance, { continued: true } )
			.fillColor(colors.greydark)
				.text(" miles from the current city");
		doc.moveDown();
		doc.image('img/staticmap.png', 25, doc.y, { width: 562 } );
	// I'm going to have to pipe this image in, which probably means putting this whole 
		// function in a promise.all
		// doc.image('https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&markers=color:green%7Clabel:G%7C40.711614,-74.012318&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=AIzaSyBYmAqm62QJXA2XRi1KkKVtWa6-BVTZ7WE');
		doc.moveDown();
		doc.fillColor(colors.gray);
		doc.fontSize(10);
		doc.text("This is a list of Zip Codes with the highest combined business revenue in the ", 75, doc.y, { continued: true } )
			.text(pdfMsgObj.displayIndustry)
			.text("industry. You should consider using this list if you are selling to businesses or consumers and want to")
			.text("know where the most money is being made in your industry.")
			.moveDown(2);
		let xpos = 250;
		let yStart = doc.y;
		// I'm going to have to get at the length to make sure the page
		// doesn't break
		for (let i=0; i<pdfMsgObj.zip.length; i++) {
			doc.fillColor(colors.orange)
			.fontSize(15)
			.text(pdfMsgObj.zip[i], 75, doc.y, { continued: true })
			.fillColor('black');
			xpos = 400 - (doc.widthOfString(pdfMsgObj.totalRevenueMin[i]) + doc.widthOfString(" - ") + doc.widthOfString(pdfMsgObj.totalRevenueMax[i]));
			console.log("the y position two is: ");
		console.log(doc.y);
			doc.text(pdfMsgObj.totalRevenueMin[i], xpos, doc.y, { continued: true } )
			.text(" - ", { continued: true } )
			.text(pdfMsgObj.totalRevenueMax[i])
			.fillColor('gray')
			.fontSize(8)
			.text("Total Population: ", 100, doc.y, { continued: true } )
			.text((pdfMsgObj.population[i]).toLocaleString('en'))
			.text("Average Annual Revenue: ", 100, doc.y, { continued: true })
			.text(pdfMsgObj.averageRevenueMin[i], { continued: true } )
			.text(" - ", { continued: true } )
			.text(pdfMsgObj.averageRevenueMax[i])
			.text("Total Employees: ", 100, doc.y, { continued: true } )
			.text(pdfMsgObj.totalEmployeesMin[i], { continued: true } )
			.text(" - ", { continued: true } )
			.text(pdfMsgObj.totalEmployeesMax[i])
			.text("Revenue Per Capita: ", 100, doc.y, { continued: true } )
			.text(pdfMsgObj.revenuePerCapitaMin[i], { continued: true } )
			.text(" - ", { continued: true } )
			.text(pdfMsgObj.revenuePerCapitaMax[i])
			.text("Household Income: ", 100, doc.y, { continued: true } )
			.text(pdfMsgObj.householdIncome[i])
			.text("Household Expenditures (Average): ", 100, doc.y, { continued: true } )
			.text(pdfMsgObj.householdExpenditures[i])
			.text("Median Age: ", 100, doc.y, { continued: true } )
			.text(pdfMsgObj.medianAge[i])
			.text("Bachelors Degree or Higher: ", 100, doc.y, { continued: true } )
			.text((pdfMsgObj.bachelorsDegreeOrHigher[i] * 100).toFixed(1), { continued: true } )
			.text("%")
			.text("High School Degree or Higher: ", 100, doc.y, { continued: true } )
			.text((pdfMsgObj.highSchoolOrHigher[i] * 100).toFixed(1), { continued: true } )
			.text("%")
			.text("White Collar Workers: ", 100, doc.y, { continued: true } )
			.text((pdfMsgObj.whiteCollarWorkers[i] * 100).toFixed(1), { continued: true } )
			.text("%");
			console.log("the y position three is: ");
		}
		// I want to test if it's breaking the page
		let blockLen = doc.y - yStart;
		console.log("yEnd: ", doc.y, ", yStart: ", yStart, ", blockLen: ", blockLen);
	
		// Finalize the pdf file
		doc.end();
		// for the moment just going to try a second pdf
		// 
	//	https.request({ url: "https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&markers=color:green%7Clabel:G%7C40.711614,-74.012318&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=AIzaSyBYmAqm62QJXA2XRi1KkKVtWa6-BVTZ7WE", encoding: null }, ( error, response, body) => {
		let pdf = new PDFDocument;
		let writeSecondStream = fs.createWriteStream('out.pdf');
		pdf.pipe(writeSecondStream);
		let body = [];
		https.get('https://compote.slate.com/images/c9320bfa-e49d-41af-bccc-f85351038055.jpg', function(res) {
			if (res.statusCode != 200) {
				return console.log('HTTP Response code ' + res.statusCode);
			}
			res.on('data', (chunk) => {
				console.log(chunk);
				body.push(chunk);
			}).on('end', () => {
				console.log("dy");
				let allbody = body.join();
		//		console.log("allbody = ", allbody);
				pdf.image(allbody, 25, 25);
			})
		});
		pdf.end();
	}
});
	
	// hard coding some data I might get from a request
	// some of this is changes later
//	const state = "TX";  // not sure if this will be abbreviation or not
//	const county = "";
//	const city = "Austin";
//	const industry = "burger-restaurants";
	// KPI
//	const revenuePerCapita = "10000";  // this will need geographicLocationId and industryId and getRevenuePerCapita function
//	const place = city + ', ' + state;
//	const myRevenue = 150000; // this would have to come from user/app
	
	// so I guess I'll try making http calls
	// https.get('https//api.sizeup.com/data/Marketing?attribute=totalRevenue&distance=16&order=highToLow&page=1&sort=desc&sortAttribute=totalRevenue&template=totalRevenue&industryId=8524&geographicLocationId=41284&itemCount=3&bands=5&cb=sizeup.api.cbb.cb3&o=application.sizeup.com&s=peuaqa44eb47l98hf0dj6167n&t=utZOqvvO8s2KUngekSFKXMEMYzBrH%2BBEIWbli%2FmuNM%2FQilfN8SCgeRbw0E3a6Ndv&i=l3gahahsvi98wy66xnobkhhy5&wt=utZOqvvO8s2KUngekSFKXHffJb%2F2vF6zOqKnrYVguNNH%2FqyQEgcgHyGdYL2dQmDh', (resp) => {
//	try {
//	https.get('https//api.sizeup.com/data/getIndustry?apikey=6388E63C-3D44-472B-A424-712395B1AD51', (resp) => {
//	https.get('https://api.sizeup.com/', (resp) => {
//	https.get('https://api.sizeup.com//js/data?o=application.sizeup.com&s=3fo3mosuknsd7beg2ost9a3jk&t=utZOqvvO8s2KUngekSFKXJhKicOE6umNMW5OCXDtd2%2BX8XVtSFoptRjFk3OJQ01%2F&i=5zik57tqun194rqv0y5vrozdx&wt=utZOqvvO8s2KUngekSFKXHffJb%2F2vF6zOqKnrYVguNMwcdk%2FQIYuYWtSZC3TJOGX', (resp) => {
/*
	https.get('https://api.sizeup.com/js/?apikey=6388E63C-3D44-472B-A424-712395B1AD51&callback=apiLoaded&wt=utZOqvvO8s2KUngekSFKXHffJb%2f2vF6zOqKnrYVguNMwcdk%2fQIYuYWtSZC3TJOGX&1.0.6858.31223', (resp) => {
		console.log('hoooo');
		let data = '';
		resp.on('data', (chunk) => {
			console.log("this chunk: ");
			console.log(chunk);
			data += chunk;
		});
		resp.on('end', () => {
		//	console.log(JSON.parse(data));
			console.log(data);
			//resp.jsonp(data);
		//	console.log(JSONP.parse(data))
		});
	}).on("error", (err) => {
		console.log("Error: " + err.message);
	});
	} catch(e) {
		console.log("heyo");
		console.log(e);
	}
	*/
	/*  this worked
	https.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', (resp) => {
		let data = '';
		// A chunk of data has been recieved.
		resp.on('data', (chunk) => {
			data += chunk;
		});
		// The whole response has been received. Print out the result.
		resp.on('end', () => {
			console.log(JSON.parse(data).explanation);
		});
	}).on("error", (err) => {
		console.log("Error: " + err.message);
	});
    */
	
		


	//below are basically for notes/reference
//	const geoLocId = 3051; is SF I think, 2044 is "california/alameda/oakland-city"
// 8589 I think is pharmacy and 8548 coffee shop - didn't double check, 8524 burger-restaurants
//	sizeup.data.findPlace( { term: place } ).then(successCallback, failureCallback);
//	sizeup.data.getIndustry( { id: 8524 } ).then(successCallback, failureCallback);
//	sizeup.data.getPlace( { id: geographicLocationId } ). then(successCallback, failureCallback);
	// given geographicLocationId and industryId get revenue per capita  - getting a lot of null for this
//	sizeup.data.getRevenuePerCapita( { geographicLocationId: 2044, industryId: 8589 } ).then(successCallback, failureCallback);
	// try it with average revenue  (ok I got it for 104971 and 8524, austin tx and 
	// findPlace returns an object and I need result[0].City.Id
	// getIndustryBySeokey returns and object and I need result[0].Id
	// sizeup.data.findPlace( { term: place } ).then((place) => {(successCallback(place[0].City.Id), failureCallback)});
	// sizeup.data.marketing( { term: place } ).then(successCallback, failureCallback);
	

	

	/*****
	 * ok, this is supposedly callback hell, but it 
	 * doesn't have to be with some helpful comments.
	 * The first part here gets the geographicLocationId
	 * and the industryId that we're going to need
	 * for just about everything else
	 */

 // a little experimenting
	//sizeup.data.findIndustry({ term: 'pizza', maxResults: 2}).then(successCallback('', 'coming from here'), failureCallback);
 // end experimenting
 
 /*
	Promise.all([
		sizeup.data.findPlace( { term: place } ),
		sizeup.data.getIndustryBySeokey( industry )
	]).then(([place, industry]) => {
			successCallback(place[0].City.Id, "City Id");
			successCallback(place[0].Metro.Id, "Metro Id");
			successCallback(industry[0].Id, "Industry Id");
			let geoId = place[0].City.Id;
			let indId = industry[0].Id;
			console.log("geoId = " + geoId + " and indId = " + indId);

		/*****
		 * and now in this area we will do most of the work
		 */
	/*	 
		Promise.all([							// but it must be wrapped up in a Promise ofc
			// find the average revenue
			sizeup.data.getAverageRevenue( { geographicLocationId: geoId, industryId: indId} ),
			// find the total revenue
			sizeup.data.getTotalRevenue( { geographicLocationId: geoId, industryId: indId} ),
			// find the total employees (overcommenting much?)
			sizeup.data.getTotalEmployees( { geographicLocationId: geoId, industryId: indId} ),
			// testing undocumented functions getBestPlacesToAdvertise
			sizeup.data.getBestPlacesToAdvertise( { attribute: 'totalRevenue', distance: '16', order: 'highToLow', page: 1, sort: 'desc', sortAttribute: 'totalRevenue', geographicLocationId: geoId, industryId: indId, itemCount: 3, bands: 5 } ),
			// going to try getAverageRevenuePercentile - ok, this worked - I looked at the network traffice and
			// found params when I made a request to get the page and found the params necessary
			// the payload/response didn't show (? prob it shouldn't show there?) but the cb function here got the result
			sizeup.data.getAverageRevenuePercentile( { value: 190000, geographicLocationId: geoId, industryId: indId } ),
			industry,
			place
		]).then(([avgRevenue, 
						totalRevenue,
						totalEmployees,
						bestPlacesToAdvertise,
						averageRevenuePercentile,
						industry,
						place]) => {
	//			successCallback(avgRevenue.Value, "Average Revenue");
	//			successCallback(totalRevenue.Value, "Total Revenue");
	//			successCallback(totalEmployees.Value, "Total Employees");
				successCallback(bestPlacesToAdvertise.Items[0].Population, "Best Places to Advertise");  // this works - prob save for reference
				successCallback(averageRevenuePercentile, "Average Revenue Percentile");
				// note: below 2nd param is dynamically named as a property of the pdfMsgObj			
				buildPdfMsg(industry[0].Name + " in " + place[0].DisplayName, 'industryAndLocation');
		//					console.log(place);
		}).then(buildPdf).catch(console.error); // ok, 2 catches (in cback hell time goes backwards) 

	//  there's just one little catch (see previous comment, I mean following comment)
	}).catch(console.error);
	//  pun intended
	
	function successCallback(result, msg="success") {
		console.log(msg + ": ");
		console.log(result);
		console.log('ending here');
		buildPdfMsg(msg + ': ' + result);
	}
	
	function failureCallback(error) {
		console.log("failure: " + error);
	}

//	function successCallback(result) {
//		console.log("i got here");
//		console.log(result);
//	}

	function buildPdf() {
		console.log('this worked');
	}
	
// pdf stuff - I will get back to this after getting some info from api
	// color notes
	// light blue = #0ea1ff
	// dark blue = #125a88

	function buildPdf() {
		// Create a document
		let doc = new PDFDocument;
		
		// pipe its output to a file
		let writeStream = fs.createWriteStream('output.pdf');
		doc.pipe(writeStream);
		
		//	doc.font('fonts/PalentinoBold.ttf')

		// Draw a rectangle - this will be szu-industry-and-locationXsSm-container
		doc.save()
			.moveTo(30, 30)
			.lineTo(600, 30)
			.lineTo(600, 90)
			.lineTo(30, 90)
			.fill('#0ea1ff');

		// Embed a font, set the font size, and render some text
		doc.fontSize(25);
		doc.fillColor('white');
		doc.text(pdfMsgObj.industryAndLocation, 60, 35);
	//	doc.fontSize(25);
	//	doc.fillColor('white');
	//	doc.text(pdfMsgObj.msg, 60, 35);
		
		// Draw a triangle
//		doc.save()
	//		.moveTo(500, 150)
	//		.lineTo(500, 250)
	//		.lineTo(600, 250)
	//		.fill('#0ea1ff');
	
		// Finalize the pdf file
		doc.end();
	}
	console.log('node knows something about a pdf');
	res.send('node told react it knows something about a pdf and sizeup key is' + process.env.SIZEUP_KEY);
});
	/*
		// find the average revenue
		sizeup.data.getAverageRevenue( { geographicLocationId: geoId, industryId: indId} ).then((avgRevenue) => {
			successCallback(avgRevenue.Value, "Average Revenue");
		}).catch(console.error);

		// find the total revenue
		sizeup.data.getTotalRevenue( { geographicLocationId: geoId, industryId: indId} ).then((totalRevenue) => {
			successCallback(totalRevenue.Value, "Total Revenue");
		}).catch(console.error);

		// find the total employees 
		sizeup.data.getTotalEmployees( { geographicLocationId: geoId, industryId: indId} ).then((totalEmployees) => {
			successCallback(totalEmployees.Value, "Total Employees");
		}).catch(console.error);

	//  there's just one little catch
	}).catch(console.error);
	//  pun intended
*/
