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
	
	// hard coding some data I might get from a request
	// some of this is changes later
	const state = "TX";  // not sure if this will be abbreviation or not
	const county = "";
	const city = "Austin";
	const industry = "burger-restaurants";
	// KPI
	const revenuePerCapita = "10000";  // this will need geographicLocationId and industryId and getRevenuePerCapita function
	const place = city + ', ' + state;
	
	// so I guess I'll try making http calls
	// https.get('https//api.sizeup.com/data/Marketing?attribute=totalRevenue&distance=16&order=highToLow&page=1&sort=desc&sortAttribute=totalRevenue&template=totalRevenue&industryId=8524&geographicLocationId=41284&itemCount=3&bands=5&cb=sizeup.api.cbb.cb3&o=application.sizeup.com&s=peuaqa44eb47l98hf0dj6167n&t=utZOqvvO8s2KUngekSFKXMEMYzBrH%2BBEIWbli%2FmuNM%2FQilfN8SCgeRbw0E3a6Ndv&i=l3gahahsvi98wy66xnobkhhy5&wt=utZOqvvO8s2KUngekSFKXHffJb%2F2vF6zOqKnrYVguNNH%2FqyQEgcgHyGdYL2dQmDh', (resp) => {
	try {
//	https.get('https//api.sizeup.com/data/getIndustry?apikey=6388E63C-3D44-472B-A424-712395B1AD51', (resp) => {
//	https.get('https://api.sizeup.com/', (resp) => {
//	https.get('https://api.sizeup.com//js/data?o=application.sizeup.com&s=3fo3mosuknsd7beg2ost9a3jk&t=utZOqvvO8s2KUngekSFKXJhKicOE6umNMW5OCXDtd2%2BX8XVtSFoptRjFk3OJQ01%2F&i=5zik57tqun194rqv0y5vrozdx&wt=utZOqvvO8s2KUngekSFKXHffJb%2F2vF6zOqKnrYVguNMwcdk%2FQIYuYWtSZC3TJOGX', (resp) => {




(function () {
    var sizeup = {};
    sizeup.api = {};
    sizeup.api.version = "1";
    
    sizeup.api.util = (function () {

        var me = {};

        var mergeParams = function(primary, secondary){
            var obj = {};
            primary = primary || {};
            secondary = secondary || {};
            for (var x in primary) {
                    if (primary.hasOwnProperty(x)) {
                        obj[x] = primary[x];
                    }
            }

            for (var x in secondary) {
                    if (secondary.hasOwnProperty(x)) {
                        obj[x] = secondary[x];
                    }
            }            
            return obj;
        };

        var formatParams = function (params) {
            var output = '';
            var formattedParams = [];
            if (params != null) {
                for (var x in params) {
                    if (params.hasOwnProperty(x)) {
                        if (Object.prototype.toString.call(params[x]) === '[object Array]') {
                            for (var y = 0; y < params[x].length; y++) {
                                formattedParams.push(x + '=' + encodeURIComponent(params[x][y]));
                            }
                        }
                        else if (params[x] && params[x]._type && params[x]._type() == 'sizeup.api.range') {
                            var p = [params[x].min(), params[x].max()];
                            for (var y = 0; y < p.length; y++) {
                                formattedParams.push(x + '=' + encodeURIComponent(p[y]));
                            }
                        }
                        else {
                            formattedParams.push(x + '=' + encodeURIComponent(params[x]));
                        }
                    }
                }
                if (formattedParams.length > 0) {
                    output = formattedParams.join('&');
                }
            }
            return output;
        };

        var wrapAsArray = function(val){
            if( Object.prototype.toString.call( val ) === '[object Array]' ) {
                return val;
            }
            else{
                return [val];
            }
        };

        var pub = {
            mergeParams: function(primary, secondary){
                return mergeParams(primary, secondary);
            },
            formatParams: function(params){
                return formatParams(params);
            },
            wrapAsArray: function(val){
                return wrapAsArray(val);
            }
        };
        return pub;
    })();

///////////////////////////////////////////////////////////////////////////////////////////////
    sizeup.api.loader = (function () {

        var me = {};
        var pub = {
            getCustomer: function () {
                return me.customer;
            },
            getData: function (url, params, success, error) {
                return getJsonp(url, params, success, error);
            },
            getServiceEndpoint: function() {
                return me.currentLocation.root;
            },
            getSourceLocation: function(){
                return me.currentLocation;
            },
            buildTokenUrl: function(src, params){
                return buildTokenUrl(src, params);
            },
            // The Sizeup 1 widget uses two keys, so has to use this to inject the true customer:
            setCustomer: function(customer) {
                me.customer = customer;
            },
        };
        me.head = document.getElementsByTagName('head')[0]; 
        me.scriptQueue = [];
        me.callbackIndex = 0;
        me.jsonpPrefix = 'cbb';
        me.sessionId = '3fo3mosuknsd7beg2ost9a3jk';
        me.apiToken = 'utZOqvvO8s2KUngekSFKXJhKicOE6umNMW5OCXDtd2/TBAK0zK/bdej4RwSf+Dxw';
        me.instanceId = 'pkfkmu5yutfjfh9rtwf9ub88s';
        me.widgetToken = 'utZOqvvO8s2KUngekSFKXHffJb/2vF6zOqKnrYVguNMwcdk/QIYuYWtSZC3TJOGX';      
        sizeup.api[me.jsonpPrefix] = {};
        me.callbackComplete = {};
        me.customer = {"Id":2,"Name":"SizeUp","ServiceAreas":[{"Granularity":"Nation","Id":130055,"Name":"United States"}],"Domains":["sizeup.com"],"IdentityProviders":[]};

        var buildTokenUrl = function(src, params){
            if (src.indexOf('?') < 0) {
                src = src + '?';
            }
            else {
                src = src + '&';
            }
            params['o'] = document.location.hostname;
            params['s'] = me.sessionId;
            params['t'] = me.apiToken;
            params['i'] = me.instanceId;
            if(me.widgetToken != ''){
                params['wt'] = me.widgetToken;
            }
            src = src + sizeup.api.util.formatParams(params);
            return src;
        };

        var getThisScript = function () {
            var scripts = document.getElementsByTagName("script");
            var index = scripts.length - 1;
            me.currentScript = scripts[index];
        };

        var getScriptLocation = function () {
            var script = me.currentScript;
            var src = script.src;
            var chop = function (str) {
                var hash = {};
                str = str.replace(' ', '');
                if (str.length > 0) {
                    var vars = str.split("&");
                    for (var i = 0; i < vars.length; i++) {
                        var pair = vars[i].split("=");
                        hash[pair[0]] = unescape(pair[1]);
                    }
                }
                return hash;
            };
            var match = src.match(/^((https?|ftp):\/)?\/?((.*?)(:(.*?)|)@)?((www\.)?([^:\/\s]+))(:([^\/]*))?((\/\w+)*\/)([-\w.]+[^#?\s]*)?(\?([^#]*))?(#(.*))?$/);
            match = match || new Array(20);
            me.currentLocation = {
                protocol: match[2],
                host: match[7],
                domain: match[9],
                port: match[11],
                path: match[12] + match[14],
                query: chop(match[16] ? match[16] : ''),
                hash: chop(match[18] ? match[18] : '')
            };
            me.currentLocation.root =
                me.currentLocation.protocol
                + '://' + me.currentLocation.host
                + (me.currentLocation.port ? ":" + me.currentLocation.port : "");
        };


        var loadScript = function (item) {   
            var script = document.createElement('script');
            script.type = 'text/javascript';
            var src = me.currentLocation.root + '/' + item.url;
            script.src = buildTokenUrl(src, {});
            script.onload = script.onreadystatechange = function() {
                if ( !item.loaded && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
                    item.loaded = true;
                    ready();
                    // Handle memory leak in IE
                    script.onload = script.onreadystatechange = null;
                    if ( me.head && script.parentNode ) {
                        me.head.removeChild( script );
                    }
                }
            };
            me.head.appendChild(script);
        };

        var fillQueue = function () {
            me.scriptQueue.push({ url: '/js/data', loaded: false });
            me.scriptQueue.push({ url: '/js/granularity', loaded: false });
            me.scriptQueue.push({ url: '/js/range', loaded: false });
            me.scriptQueue.push({ url: '/js/overlay', loaded: false });
            me.scriptQueue.push({ url: '/js/overlayAttributes', loaded: false });
            me.scriptQueue.push({ url: '/js/attributes', loaded: false });
        };

        var loadQueue = function () {
            for (var x = 0; x < me.scriptQueue.length; x++) {
                loadScript(me.scriptQueue[x]);
            }
        };

        var isScriptLoadingComplete = function () {
            var complete = true;
            for (var x = 0; x < me.scriptQueue.length; x++) {
                complete = complete && me.scriptQueue[x].loaded;
            }
            return complete && me.apiToken != null && me.windowLoaded != null;
        };

        var getNextCallback = function(){
            if(me.callbackIndex > 999999){
                me.callbackIndex = 0;
            }
            me.callbackIndex ++;
            return 'cb' + me.callbackIndex;
        };

        var getJsonp = function (url, params, success, error) {
            var cb = getNextCallback();
            var opts = {
                aborted: false
            };
            var script = document.createElement('script');
            sizeup.api[me.jsonpPrefix][cb] = function (data) {
                if (success && !opts.aborted) {
                    success(data);
                }
                cleanup();
            };

            script.onerror = function (e) {
                if (error && !opts.aborted) {
                    error(e);
                }
                cleanup();
            };

            var cleanup = function () {
                delete sizeup.api[me.jsonpPrefix][cb];
                me.head.removeChild(script);
            };


            script.type = 'text/javascript';
            var src = me.currentLocation.root + url;
            params['cb']  = 'sizeup.api.' + me.jsonpPrefix + '.' + cb;
            script.src = buildTokenUrl(src, params);
            me.head.appendChild(script);

            var request = {
                abort: function(){
                    opts.aborted = true;
                }
            };
            return request;
        };

        var updateToken = function (callback) {
            getJsonp('/token',{} , function (data) {
                me.apiToken = data;
                if (callback) {
                    callback();
                }
            },
            function(){
                location.reload();
            });
        };

        var ready = function () {
            if (isScriptLoadingComplete()) {
                window[me.currentLocation.query['callback']]();
            }
        };

       

        window.onload = function () { me.windowLoaded = true; ready(); }
        getThisScript();
        getScriptLocation();
        setInterval(updateToken, 1000 * 60 * 5);
        fillQueue();
        loadQueue();
        return pub;
    })();
})();





(function () {
    sizeup.core.namespace('sizeup.core');
    sizeup.core.analytics = function () {
        
        jQuery.ajaxSettings.traditional = true;
        var get = function (url, params, callback) {
            return $.get(url, params, 'json')
            .success(function (data, status) {
                if (status == 'success' && callback) { callback(data); }
            })
            .error(function (e, status) {
                if (status != 'abort' && callback) { callback(null); }
            });
        };

        var post = function (url, params, callback) {
            return $.post(url, params)
            .success(function (data, status) {
                if (status == 'success' && callback) { callback(data); }
            })
            .error(function (e, status) {
                if (status != 'abort' && callback) { callback(null); }
            });
        };

        var trackEvent = function (params) {
            if (!(typeof _gaq === 'undefined')) {
                _gaq.push(['_trackEvent',params.category, params.action, params.label, params.value]);
            }
        };

       

        var publicObj = {
            dashboardReportLoaded: function (params) {
                trackEvent({ category: 'Dashboard', action: 'reportLoaded', label: params.report, isInteraction: true });
            },
            dashboardIndustryChanged: function (params) {
                trackEvent({ category: 'Dashboard', action: 'industryChanged', label: params.industry, isInteraction: true });
            },
            dashboardPlaceChanged: function (params) {
                trackEvent({ category: 'Dashboard', action: 'placeChanged', label: params.place, isInteraction: true });
            },

            advertisingReportLoaded: function (params) {
                trackEvent({ category: 'Advertising', action: 'reportLoaded', label: params.attribute, isInteraction: true });
                return post('/analytics/marketing/reportloaded', params);
            },
            advertisingIndustryChanged: function (params) {
                trackEvent({ category: 'Advertising', action: 'industryChanged', label: params.industry, isInteraction: true });
            },
            advertisingPlaceChanged: function (params) {
                trackEvent({ category: 'Advertising', action: 'placeChanged', label: params.place, isInteraction: true });
            },
            advertisingAttributeChanged: function (params) {
                trackEvent({ category: 'Advertising', action: 'attributeChanged', label: params.attribute, isInteraction: true });
            },           
            advertisingAdvancedFilterChanged: function (params) {
                trackEvent({ category: 'Advertising', action: 'advancedFilters', label: params.attribute, isInteraction: true });
            },

            consumerExpenditureSelected: function (params) {
                trackEvent({ category: 'Competition', action: 'consumerExpendituresClicked', label: params.label, isInteraction: true });
            },
            consumerExpenditureTypeChanged: function (params) {
                trackEvent({ category: 'Competition', action: 'consumerExpendituresTypeChanged', label: params.label, isInteraction: true });
            },
            competitionTabLoaded: function (params) {
                trackEvent({ category: 'Competition', action: 'tabLoaded', label: params.tab, isInteraction: true });
            },
            competitionIndustryChanged: function (params) {
                trackEvent({ category: 'Competition', action: 'industryChanged', label: params.industry, isInteraction: true });
            },
            competitionPlaceChanged: function (params) {
                trackEvent({ category: 'Competition', action: 'placeChanged', label: params.place, isInteraction: true });
            },
            relatedCompetitor: function (params) {
                return get('/analytics/relatedIndustry/competitor/', params);
            },
            relatedSupplier: function (params) {
                return get('/analytics/relatedIndustry/supplier/', params);
            },
            relatedBuyer: function (params) {
                return get('/analytics/relatedIndustry/buyer/', params);
            },
            userSignin: function (params) {
                trackEvent({ category: 'User', action: 'signin', label: params.label, isInteraction: true });
            },
                     
            bestPlacesReportLoaded: function (params) {
                trackEvent({ category: 'BestPlaces', action: 'reportLoaded', label: params.label, isInteraction: true });
            },
            bestPlacesPlaceTypeChanged: function (params) {
                trackEvent({ category: 'BestPlaces', action: 'placeTypeChanged', label: params.placeType, isInteraction: true });
            },
            bestPlacesAttributeChanged: function (params) {
                trackEvent({ category: 'BestPlaces', action: 'attributeChanged', label: params.attribute, isInteraction: true });
            },
            bestPlacesIndustryChanged: function (params) {
                trackEvent({ category: 'BestPlaces', action: 'industryChanged', label: params.industry, isInteraction: true });
            },
            bestPlacesRegionChanged: function (params) {
                trackEvent({ category: 'BestPlaces', action: 'regionChanged', label: params.region, isInteraction: true });
            },
            bestPlacesAdvancedFilterChanged: function (params) {
                trackEvent({ category: 'BestPlaces', action: 'advancedFilters', label: params.attribute, isInteraction: true });
            },
            outgoingLink: function (params) {
                trackEvent({ category: 'outgoingLinks', action: 'clicked', label: params.label, isInteraction: true });
                return post('/analytics/tracker/outgoingLink', params);
            }
        };
        return publicObj;
    };
})();






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
	

	/****
	 * this function is building the pdf.  maybe it should be moved
	 * the second parameter is for dynamically named properties of the pdfMsgObj
	 * the function changes pdfMsgObj because objects are passed by reference
	 * or something like that in javascript and that means I can use the parameters
	 * kind of like global variables without using global variables.
	 * this object will be used in the buildPdf function which creates the pdf
	 */
	let pdfMsgObj = {msg: 'Welcome to the PDF\n'};
	function buildPdfMsg(addedMsg, target='') {
		console.log("wish I were here");
		if (target) {
			pdfMsgObj[target] = addedMsg;
		} else {
			pdfMsgObj.msg = pdfMsgObj.msg.concat(addedMsg + '\n');
		}
		console.log(addedMsg);
		console.log(pdfMsgObj.msg);
	}

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
			industry,
			place
		]).then(([avgRevenue, 
						totalRevenue,
						totalEmployees,
						industry,
						place]) => {
				successCallback(avgRevenue.Value, "Average Revenue");
				successCallback(totalRevenue.Value, "Total Revenue");
				successCallback(totalEmployees.Value, "Total Employees");
				// note: below 2nd param is dynamically named as a property of the pdfMsgObj			
				buildPdfMsg(industry[0].Name + " in " + place[0].DisplayName, 'industryAndLocation');
							console.log(place);
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
	*/
	function failureCallback(error) {
		console.log("failure: " + error);
	}

	function successCallback(result) {
		console.log("i got here");
		console.log(result);
	}
//	function buildPdf() {
//		console.log('this worked');
//	}
	
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
		doc.save()
			.moveTo(500, 150)
			.lineTo(500, 250)
			.lineTo(600, 250)
			.fill('#0ea1ff');
	
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
