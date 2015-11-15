//OH WOW... this is messy...
var _settings;
var _isInit = false;

//Image obj of the user's images...
var userImagesFabric = [];
var userImagesFabricState = [];
var userImages = [];
var userImagesUrls = [];
var userText = [];

var designImages = [];
var designImagesUrls = [];
var designText = [];

//design canvas
var designCanvas = null; //document.getElementById('c');
var designCtx = null; //designCanvas.getContext('2d');
var designFabric = null;

//raw canvas
var rawCanvas = null; //document.getElementById('c');
var rawCtx = null; //designCanvas.getContext('2d');
var rawFabric = null;

var webWidth = 500;
var webHeight = 500;

var maxWidth = webWidth;

var profile_pic_id_arr = '';
var _imageUploadActive = 0;
var fbImgLink = '';
var fbProfileImageLocated = false;
var fbPosting = false;

var opacity = .5;
var direction = 'horizontal';
var colors = [];
colors[0] = '#f40323'; //'#d40303',
colors[1] = '#ff9a20'; //'#ff7a00',
colors[2] = '#ffff00'; //'#ffff00',
colors[3] = '#50ffa0'; //'#10A055',
colors[4] = '#22ccdd'; //'#221eff',
colors[5] = '#351762'; //'#400772'
var colorsopacity = [];
var imageoverlay = 0;
var imageoverlayElem = null;
var imageoverlayLoaded = false;

var filter_name = 'TakenVR';
var filter_name_system = 'takenvr';

var saturation = .55;

//marshal data
var streamObj = {
	method: 'feed',
	name: 'I have just put the tunisian flag over my profile picture',
	link: 'http://rainbowfilter.io?ref=fbr',
	picture: 'http://takenvr.com/iptech/files/tunisia_flag_transparent.png',
	caption: 'Tunisian Flag',
	description: "Tunisian flag app by TakenVR",
	action: {
		name: 'Filter',
		link: 'http://takenvr.com/iptech/'
	}
};

function init() {
	var urlVars = getUrlVars();
	if (typeof urlVars['colors'] !== 'undefined') {
		var tmpColors = urlVars['colors'].split(',');
		if (tmpColors.length) {
			var tmpColorIdx = 0;
			colors = [];
			for (var i in tmpColors) {
				colors[tmpColorIdx] = '#' + tmpColors[i];
				tmpColorIdx++;
			}
		}
	}
	if (typeof urlVars['opacity'] !== 'undefined') {
		opacity = urlVars['opacity'];
	}
	if (typeof urlVars['direction'] !== 'undefined') {
		direction = urlVars['direction'];
	}
	if (typeof urlVars['imageoverlay'] !== 'undefined') {
		imageoverlay = urlVars['imageoverlay'];
	}
	//console.log('joey, imageoverlay: ', imageoverlay, '?' + filter_name_system + 'overlay.png');
	if (imageoverlay) {
		imageoverlayElem = new Image();
		imageoverlayElem.onload = function() {
			imageoverlayLoaded = true;
			//console.log('joey, image overlay loaded... ');
		};
		imageoverlayElem.src = 'filters/' + filter_name_system + '/overlay.png';
	}


	//if (typeof urlVars['grayscale'] !== 'undefined') {
	//	var grayscale = true;
	//}

	//convert colors strings...
	for (var i in colors) {
		colors[i] = hexToRgb(colors[i]);
	}

	document.getElementById('image-upload-btn').onclick = eventHandler;
	document.getElementById('user_images').addEventListener('change', imageUploadHandler, false);
	var elemArr = [
		'image-upload-proxy-btn',
		'image-upload-facebook-btn'
	];
	var tmpElem = null;
	for (var i = 0; i < elemArr.length; i++) {
		tmpElem = document.getElementById(elemArr[i]);
		if (tmpElem) {
			document.getElementById(elemArr[i]).onclick = eventHandler;
			document.getElementById(elemArr[i]).addEventListener('change', eventHandler, false);
			document.getElementById(elemArr[i]).addEventListener('keyup', eventHandler, false);
			document.getElementById(elemArr[i]).addEventListener('select', eventHandler, false);
		}
	}

	maxWidth = $('#canvas-wrapper').width();

	if(typeof window.innerWidth === 'number') {
		webWidth = $('#image-upload-container').width(); //window.innerWidth;
		webHeight = $('#image-upload-container').height();
	} else if(document.body && (document.body.clientWidth || document.body.clientHeight)) {
		webWidth = document.body.clientWidth;
		webHeight = document.body.clientHeight;
	} else if(document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
		webWidth = document.documentElement.clientWidth
		webHeight = document.documentElement.clientHeight;
	}

	//design canvas
	rawCanvas = document.getElementById('c2');
	rawCtx = rawCanvas.getContext('2d');

	//design canvas
	designCanvas = document.getElementById('c');
	designCtx = designCanvas.getContext('2d');

	designFabric = new fabric.StaticCanvas('c');
	//designFabric.setWidth(mainDivWidth);
	//designFabric.setHeight(mainDivHeight);
	designFabric.selection = false;
	designFabric.selectionColor = 'rgba(10,10,10,0.2)';
	designFabric.controlsAboveOverlay = true;
	designFabric.allowTouchScrolling = true;
	//designFabric.perPixelTargetFind = true;
	fabric.Object.prototype.setOriginToCenter = function () {
		this._originalOriginX = this.originX;
		this._originalOriginY = this.originY;

		var center = this.getCenterPoint();

		this.set({
			originX: 'center',
			originY: 'center',
			left: center.x,
			top: center.y
		});
	};

	fabric.Object.prototype.setCenterToOrigin = function () {
		var originPoint = this.translateToOriginPoint(
		this.getCenterPoint(),
		this._originalOriginX,
		this._originalOriginY);

		this.set({
			originX: this._originalOriginX,
			originY: this._originalOriginY,
			left: originPoint.x,
			top: originPoint.y
		});
	};
	fabric.Object.prototype.transparentCorners = false;

	document.getElementById("dl").addEventListener('click', dlCanvas, false);
	document.getElementById("fb-post-btn").addEventListener('click', fbPostButton);
}


function eventHandler(evt) {
	evt.preventDefault();
	var buttonClicked = evt.target.id;
	var elem = document.getElementById(buttonClicked);
	switch (buttonClicked) {
		case 'image-upload-proxy-btn':
			imageUploadProxy();
			break;
		case 'image-upload-facebook-btn':
			imageUploadFacebook();
			break;
		/* OLD BUTTONS */
		case 'image-upload-btn':
			document.getElementById('user_images').click();
			break;
		default:
			break;
	}
}

//setup the image uploader
function imageUploadInit() {
	//for checking the file input for user uploads
	document.getElementById('user_images').addEventListener('change', imageUploadHandler, false);


	//setup the image-upload form data like an API call...
	_formdata = imageUploadGetFormData(
		'customizer',
		'mobilerenderupload',
		JSON.stringify({product_id: _settings.product_id})
	);
}

var _fbAlbumIds = {};
var _fbAlbum = {};
var _fbAlbums = {};
var _fbPhotos = {};

var _fbPhotosUploaded = {};
var _fbPhotosUploadedPage = 0;
var _fbPhotosChunk = 6;
var _fbPhotosOfUser = {};
var _fbPhotosOfUserPage = 0;


function imageUploadFacebook() {

	fbLogin(function(res){});
	if (FBID) {
		FB.api(
			"/me/photos",
			function (response) {
			  if (response && !response.error) {
				_fbPhotosOfUser = response;
				//console.log('fbphoto res: ', response);
			  }
			}
		);
		FB.api(
			"/me/photos/uploaded",
			function (response) {
			  if (response && !response.error) {
				  _fbPhotosUploaded = response;
				  //console.log('fbphoto2 res: ', response);
			  }
			}
		);

		for (var i in _fbPhotosUploaded) {

		}

		/*
		FB.api(
			'/me/albums',
			function(response) {
				if (response && !response.error) {
					console.log('joey, fbphoto3 res: ', response);
				}
				var ul = document.getElementById('image-upload-album-list');
				for (var i=0, l=response.data.length; i<l; i++){
					var album = response.data[i];
					_fbAlbums[album.id] = album;
					FB.api(
						'/' + album.id + '/photos',
						function(response) {
							if (response && !response.error) {
								console.log('joey, fbphoto4 res: ', response);
								_fbAlbums[album.id]['photos'] = response;
							}
						}
					);
					//	var
					//		album = response.data[i],
					//		li = document.createElement('li'),
					//		a = document.createElement('a');
					//	a.innerHTML = album.name;
					//	a.href = album.link;
					//	li.appendChild(a);
					//	ul.appendChild(li);
				}
			}
		);
		*/
	}
}

function imageUploadFacebookCallback(res) {
	//console.log('joey, photo res: ', res);
}

function imageUploadFormApiCall (formData, callback) {
	if (formData) {
		_imageUploadActive += 1;
		$.ajax({
			url: MyStyle.getSetting('API_URL'),
			type: "POST",
			data: formData,
			processData: false,
			contentType: false,
			success: function (res) {
				_imageUploadActive -= 1;
				res = JSON.parse(res);
				if (res.hasOwnProperty('error')) {
					MyStyle.logger.critical('Error uploading: '+res.error);
					if (typeof callback === 'function') {
						callback(false);
					}
					return false;
				}
				res = res.data;
				//console.log('joey, image upload res: ', res);
				if (typeof callback === 'function') {
					callback(res);
				}
				return res;
			}
		});
	}
}

function imageUploadGetFormData(action, method, data) {
	if (window.FormData) {
		var tmpFormData = new FormData();
		tmpFormData.append('app_id', MyStyle.getSetting('APP_ID'));
		tmpFormData.append('session', MyStyle.getSetting('SESSION'));
		tmpFormData.append('action', action);
		tmpFormData.append('method',method);
		tmpFormData.append('data', data);
		return tmpFormData;
	}
	return null;
}

function imageUploadGetImageUrl(idx) {
	if (typeof userImagesUrls[idx] !== 'undefined') {
		//MyStyle.logger.debug('joey, returning image url: ', userImagesUrls[idx]);
		return userImagesUrls[idx];
	}
	return null;
}

//puts the image on a canvas tag
function imageUploadHandler(e) {
	//track(['imageupload', 'file', 'start']);
	//console.log('Selecting file...');
	var imgIdx = 0;
	var i = 0, len = this.files.length, img, reader, file;
	for ( ; i < len; i++ ) {
		file = this.files[i];
		if (!!file.type.match(/image.*/)) {
			if ( window.FileReader ) {
				reader = new FileReader();
				reader.onload = function(event){
					imgIdx = userImages.length;
					userImages[imgIdx] = new Image();
					var userImage = userImages[imgIdx];
					userImage.onload = function() {
						document.getElementById('lead').style.display = 'none';
						document.getElementById('dl').style.display = 'inline-block';
						document.getElementById('image-upload-container').style.display = 'block';
						imageUploadShowUploadedItem(userImage);
						//draw the image
						webWidth = $('#image-upload-container').width();
						var scaleX = (webWidth / userImage.width);
						var scaleY = scaleX; //(userImage.height / userImage.height);
						var finalScale = scaleX;
						if (scaleY > scaleX) {
							finalScale = scaleY;
						}
						webHeight = Math.floor(userImage.height * finalScale);

						//designCanvas.width = webWidth; //userImage.width;
						//designCanvas.height = webHeight; //userImage.height;

						//designCanvas.style.width = webWidth + 'px'; //userImage.width + 'px';
						//designCanvas.style.height = webHeight + 'px'; //userImage.height + 'px';

						//designCtx.canvas.width = userImage.width;
						//designCtx.canvas.height = userImage.height;

						//console.log('joey, webWidth: '+webWidth+' | userImagewidth: '+userImage.width);
						//console.log('joey, scaleX: '+scaleX+' | scaleY: '+scaleY);

						var xPos = 0, yPos = 0;
						if (userImage.width <= webWidth && userImage.height <= webHeight) {
							//console.log('joey, addImage no changing');
							//xPos = _calcCenteringPos(userImage.width, document.getElementById('product-view-container').offsetWidth);
							//yPos = _calcCenteringPos(userImage.height, document.getElementById('product-view-container').offsetHeight);
							imageAdd(
								userImage,
								{
									left: xPos,
									top: yPos,
									angle: 0,
									opacity: 100
								},
								imgIdx
							);
						} else {

							var newWidth = Math.floor(userImage.width * finalScale);
							var newHeight = Math.floor(userImage.height * finalScale);
							//xPos = _calcCenteringPos(newWidth, document.getElementById('product-view-container').offsetWidth);
							//yPos = _calcCenteringPos(newHeight, document.getElementById('product-view-container').offsetHeight);
							imageAdd(
								userImage,
								{
									left: xPos,
									top: yPos,
									angle: 0,
									opacity: 100,
									width: newWidth,
									height: newHeight,
									centeredRotation: 1,
									centeredScaling: 1
								},
								imgIdx
							);
							//console.log('joey, addImage changing');
						}
						//updateControls();
						track(['imageupload', 'file', 'complete']);
					}
					userImage.src = event.target.result;
				}
				reader.readAsDataURL(e.target.files[0]);
			}

			//create a new formData, submit val
			//var tmpFormData = imageUploadGetFormData(
			//	'customizer',
			//	'imageupload',
			//	JSON.stringify(
			//		{
			//			image_upload: 1,
			//			mobile: 1,
			//			product_id: _settings.product_id
			//		}
			//	)
			//);
			//if (tmpFormData) {
			//	tmpFormData.append("user_image", file);
			//}
			//imageUploadFormApiCall(tmpFormData, function(res) {
			//	userImagesUrls[imgIdx] = res.images.original.url;
			//	//console.log('joey, imageUploadFormApiCallCallback: ', [res, imgIdx]);
			//});
		}
	}
}

//shows the preview image...
function imageUploadShowUploadedItem (source) {
	var list = document.getElementById("image-list"),
	li   = document.createElement("li"),
	img  = document.createElement("img");
	img.src = source.src;
	var len = (userImages.length - 1);
	img.id = 'image-list-image-' + len;
	li.appendChild(img);
	list.appendChild(li);

	li.onclick = imageUploadEventHandler;
	li.addEventListener('change', imageUploadEventHandler, false);
	li.addEventListener('keyup', imageUploadEventHandler, false);
	li.addEventListener('select', imageUploadEventHandler, false);

}

function imageUploadEventHandler(evt) {
	evt.preventDefault();
	var buttonClicked = evt.target.id;
	var elem = document.getElementById(buttonClicked);
	//console.log('imageUploadEventHandler button...' + buttonClicked);
	var objIdx = buttonClicked.split('-');
	objIdx = objIdx[(objIdx.length - 1)];
	var userImage = userImages[objIdx];

	//draw the image
	//webWidth = $('#image-upload-container').width();
	if (userImage.width > maxWidth) {
		webWidth = $('#image-upload-container').width();
	} else {
		webWidth = userImage.width;
	}
	var scaleX = (webWidth / userImage.width);
	var scaleY = scaleX; //(userImage.height / userImage.height);
	var finalScale = scaleX;
	if (scaleY > scaleX) {
		finalScale = scaleY;
	}
	webHeight = Math.floor(userImage.height * finalScale);

	//designCanvas.width = webWidth; //userImage.width;
	//designCanvas.height = webHeight; //userImage.height;

	//designCanvas.style.width = webWidth + 'px'; //userImage.width + 'px';
	//designCanvas.style.height = webHeight + 'px'; //userImage.height + 'px';

	var xPos = 0;
	var yPos = 0;
	var newWidth = Math.ceil(userImage.width * finalScale);
	var newHeight = Math.ceil(userImage.height * finalScale)
	//xPos = _calcCenteringPos(newWidth, document.getElementById('product-view-container').offsetWidth);
	//yPos = _calcCenteringPos(newHeight, document.getElementById('product-view-container').offsetHeight);
	imageAdd(userImage, {}, objIdx);


	//updateControls();
	return false;
}

function imageAdd(imgObj, settings, imgIdx) {
		//designPreviewDisable();
		/*
		var width = 0;
		var height = 0;

		if (settings.hasOwnProperty('width')) {
			width = settings.width;
			//delete settings.width;
			//console.log('joey, tryingforwidth: '+width);
		}
		if (settings.hasOwnProperty('height')) {
			height = settings.height;
			//delete settings.height;
			//console.log('joey, tryingforheight: '+height);
		}
		if (width) {
			imgObj.width = width;
		}
		if (height) {
			imgObj.height = height;
		}
		*/
		//generateCanvas(imgObj, function(imgObj) {

		designFabric.clear();
	//draw the image
	//console.log('joey width '+imgObj.width +' '+ maxWidth);
		if (imgObj.width > maxWidth) {
			webWidth = $('#image-upload-container').width();
		} else {
			webWidth = imgObj.width;
		}
		var scaleX = (webWidth / imgObj.width);
		var scaleY = scaleX; //(userImage.height / userImage.height);
		var finalScale = scaleX;
		if (scaleY > scaleX) {
			finalScale = scaleY;
		}
		webHeight = Math.floor(imgObj.height * finalScale);

		//designCanvas.width = webWidth; //userImage.width;
		//designCanvas.height = webHeight; //userImage.height;

		//designCanvas.style.width = webWidth + 'px'; //userImage.width + 'px';
		//designCanvas.style.height = webHeight + 'px'; //userImage.height + 'px';


	rawCanvas.width = webWidth; //userImage.width;
	rawCanvas.height = webHeight; //userImage.height;

	rawCanvas.style.width = webWidth + 'px'; //userImage.width + 'px';
	rawCanvas.style.height = webHeight + 'px'; //userImage.height + 'px';

	rawCtx.drawImage(
		imgObj,
		0,
		0,
		imgObj.width,
		imgObj.height,
		0,
		0,
		webWidth,
		webHeight
	);

	rainbowFilter(rawCanvas);
	if (FBID) {
		document.getElementById('fb-post-btn').style.display = 'inline-block';
	}
	track(['filter', 'complete']);

/*
		var tmpImg = userImagesFabric[imgIdx];
		if (typeof userImagesFabric[imgIdx] !== 'undefined') {
			//console.log('joey, imageAddFabric1: ', [tmpImg, tmpImg.isMoving]);
		} else {
			//console.log('joey, imageAddFabric2: ' + userImagesFabric[imgIdx] + ' | ' + 'undefined');
		}

		if (typeof userImagesFabric[imgIdx] === 'undefined') {
			//console.log('joey, imageAddFabric, addingnew');
			userImages[imgIdx] = imgObj;
			userImagesFabric[imgIdx] = new fabric.Image(
				imgObj,
				settings
			);
			userImagesFabric[imgIdx].filters.push(filter);
			userImagesFabric[imgIdx].applyFilters(designFabric.renderAll.bind(designFabric));

			designFabric.add(userImagesFabric[imgIdx]);
			userImagesFabric[imgIdx].saveState();
			userImagesFabricState[imgIdx] = JSON.stringify(userImagesFabric[imgIdx].originalState);
		} else if (designFabric.getObjects().indexOf(userImagesFabric[imgIdx]) === (-1)) {
			designFabric.add(userImagesFabric[imgIdx]);
			userImagesFabric[imgIdx].setOptions(JSON.parse(userImagesFabricState[imgIdx]));
		}
		userImagesFabric[imgIdx].setCoords();
		*/
	}

function track(trackingArr) {
	if (!trackingArr || typeof trackingArr === 'undefined') {
		return false;
	}
	var finalString = '';
	for (var i in trackingArr) {
		finalString += '/' + trackingArr[i];
	}
	if (typeof ga !== 'undefined') {
		ga('send', 'pageview', finalString);
	}
	return true;
}

function rainbowFilter(canvasEl) {
	var context = canvasEl.getContext('2d'),
	  imageData = context.getImageData(0, 0, canvasEl.width, canvasEl.height),
	  data = imageData.data,
	  iLen = data.length, i,
	  tintR, tintG, tintB,
	  r, g, b, alpha1, average,
	  source,
		width = canvasEl.width,
		height = canvasEl.height,
		rows = 0,
		columns = 0;
	var rowOffset = 0;
	var columnOffset = 0;
	var grayscale = false;

	var sectionWidth = Math.ceil((width / colors.length));
	var sectionHeight = Math.ceil((height / colors.length));

	//console.log('colors: ', colors);

	var colorIdx  = 0;
	source = colors[colorIdx]; //new fabric.Color(this.color).getSource();

	tintR = source[0] * opacity;
	tintG = source[1] * opacity;
	tintB = source[2] * opacity;

	alpha1 = 1 - opacity;
	var firstloop = true;

	if (!imageoverlay) {
		for (i = 0; i < iLen; i+=4) {
			if (direction == 'horizontal') {
				colorIdx = Math.floor(rows / sectionHeight) % colors.length;
			}
			if (direction == 'vertical') {
				colorIdx = Math.floor(columns / sectionWidth) % colors.length;
			}
			if (direction == 'diagonalleft' || direction == 'diagonal') {
				if (firstloop) {
					sectionWidth = sectionWidth * 1.5;
				}
				if (columns + 1 == width) {
					columnOffset++;
				}
				colorIdx = Math.floor((columns + columnOffset) / sectionWidth) % colors.length;
			}
			if (direction == 'diagonalright') {
				if (firstloop) {
					sectionWidth = sectionWidth * 1.5;
				}
				if (columns + 1 == width) {
					columnOffset++;
				}
				colorIdx = Math.floor((columns - columnOffset) / sectionWidth) % colors.length;
				if (colorIdx < 0) {
					colorIdx = (colors.length + colorIdx);
				}

			}
			if (direction == 'chevronhorizontal' || direction == 'chevron') {
				colorIdx = Math.floor((rows + rowOffset) / sectionHeight) % colors.length;
				if (Math.floor(columns / sectionWidth) % colors.length % 2) {
					rowOffset--;
				} else {
					rowOffset++;
				}
				if (columns + 1 == width) {
					rowOffset = 0
				}
			}
			if (direction == 'chevronvertical') {
				colorIdx = Math.floor((columns + columnOffset) / sectionWidth) % colors.length;
				if (columns + 1 == width) {
					if (Math.floor(rows / sectionHeight) % colors.length % 2) {
						columnOffset++;
					} else {
						columnOffset--;
					}
				}
			}
			if (direction == 'test') {}

			if (columns + 1 == width) {
				rows++;
				columns = 0;
			} else {
				columns++;
			}

			source = colors[colorIdx];
			if (typeof source !== 'undefined') {
				tintR = source[0] * opacity;
				tintG = source[1] * opacity;
				tintB = source[2] * opacity;
			}

			  average = (data[i] + data[i + 1] + data[i + 2]) / 3;

			if (grayscale) {
				data[i]     = average;
				data[i + 1] = average;
				data[i + 2] = average;
			}


			var sv = saturation; // saturation value. 0 = grayscale, 1 = original

			var luR = 0.3086; // constant to determine luminance of red. Similarly, for green and blue
			var luG = 0.6094;
			var luB = 0.0820;

			var az = (1 - sv)*luR + sv;
			var bz = (1 - sv)*luG;
			var cz = (1 - sv)*luB;
			var dz = (1 - sv)*luR;
			var ez = (1 - sv)*luG + sv;
			var fz = (1 - sv)*luB;
			var gz = (1 - sv)*luR;
			var hz = (1 - sv)*luG;
			var iz = (1 - sv)*luB + sv;

			var red = data[i];
			var green = data[i + 1];
			var blue = data[i + 2];

			var saturatedRed = (az*red + bz*green + cz*blue);
			var saturatedGreen = (dz*red + ez*green + fz*blue);
			var saturateddBlue = (gz*red + hz*green + iz*blue);

			r = saturatedRed;
			g = saturatedGreen;
			b = saturateddBlue;

			// alpha compositing
			data[i] = tintR + r * alpha1;
			data[i + 1] = tintG + g * alpha1;
			data[i + 2] = tintB + b * alpha1;

			if (firstloop) {
				firstloop = false;
			}
		}
		//console.log(' columns ' + columns + ' rows : ' + rows);
		context.putImageData(imageData, 0, 0);
		//track();
	} else {
		if (imageoverlayLoaded) {
			imageoverlayElem.width = width;
			imageoverlayElem.height = height;
			var tmpWidth = width;
			var tmpHeight = height;
			if (height <= width) {
				tmpWidth = height;
			}

			var x = _calcCenteringPos(tmpWidth, imageoverlayElem.width);
			var y = _calcCenteringPos(tmpWidth, imageoverlayElem.height);

			rawCtx.save();
			rawCtx.globalAlpha = opacity;
			rawCtx.drawImage(imageoverlayElem, x, y, tmpWidth, tmpWidth);
			rawCtx.restore();
		}
	}

}

function _calcCenteringPos(smallDist, largeDist) {
	if (!smallDist || !largeDist) {
		return 0;
	}
	return Math.ceil(Math.ceil(largeDist / 2) - (smallDist / 2));
}

function hexToRgb(hex) {
	hex = hex.toLowerCase();
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	var ret = {
		0: parseInt(result[1], 16),
		1: parseInt(result[2], 16),
		2: parseInt(result[3], 16),
		3: 1
	};
	return ret;
}


function dlCanvas() {
	track(['download', 'click']);
	if (FBID) {
		fbStream({}, dlCanvasCallback);
	} else {
		track(['download', 'click']);
			var dt = rawCanvas.toDataURL('image/png');
		  /* Change MIME type to trick the browser to downlaod the file instead of displaying it */
		  dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');

		  /* In addition to <a>'s "download" attribute, you can define HTTP-style headers */
		  dt = dt.replace(/^data:application\/octet-stream/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=filtered-photo.png');

		this.href = dt;
	}
}

function dlCanvasCallback() {
	track(['download', 'click']);
	var dt = rawCanvas.toDataURL('image/png');
  /* Change MIME type to trick the browser to downlaod the file instead of displaying it */
  dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');

  /* In addition to <a>'s "download" attribute, you can define HTTP-style headers */
  dt = dt.replace(/^data:application\/octet-stream/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=filtered-photo.png');

	window.location = dt;
}

function getUrlVars() {
	var vars = {};
	var tmpUrl = decodeURIComponent(window.location.href);
	var parts = tmpUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi,
	function(m,key,value) {
	  vars[key] = value;
	});
	return vars;
  }

var FB_APP_ID = '424459907745197';
// if (window.location.href.indexOf('rainbowfilter.io') === (-1)) {
// 	FB_APP_ID = '190461821153519';

// }
var FBID = 0;
var FBSESSION = null;
var FB_CURRENT_USER = null;
var FBLOGOUT = 0;
var CURRENT_USER = null;
var FB_CALLBACKS = [];
function fbRequest(params, callback) {
	//log user in first
	if(!FBID) {
		//not logged in, login first
		fbLogin(function() {
			fbRequest(params, callback);
		});
		return false;
	}
	FB.ui(
		{
			method: 'apprequests',
			message: 'Take this bomb and blast your way to victory!',
			data: 'Friend Smash Custom Tracking 1'
		},
		function(response) {
			//console.log(response);
			if (typeof callback === 'function') {
				callback();
			}
		}
	);
}

function renderMFS() {
	// First get the list of friends for this user with the Graph API
	FB.api(
		'/'+FBID+'/invitable_friends',
		function(response) {
			//console.log('joey, mfs call response: ', response);
			var container = document.getElementById('mfs-wrapper');
			var mfsForm = document.createElement('form');
			mfsForm.id = 'mfsForm';
			// Iterate through the array of friends object and create a checkbox for each one.
			for(var i = 0; i < Math.min(response.data.length, 10); i++) {
				var friendItem = document.createElement('div');
				friendItem.id = 'friend_' + response.data[i].id;
				friendItem.innerHTML = '<input type="checkbox" name="friends" value="'
				+ response.data[i].id
				+ '" />' + response.data[i].name;
				mfsForm.appendChild(friendItem);
			}
			container.appendChild(mfsForm);

			// Create a button to send the Request(s)
			var sendButton = document.createElement('input');
			sendButton.type = 'button';
			sendButton.value = 'Send Request';
			sendButton.onclick = sendRequest;
			mfsForm.appendChild(sendButton);
		}
	);
}
function sendRequest() {
	// Get the list of selected friends
	var sendUIDs = '';
	var mfsForm = document.getElementById('mfsForm');
	for(var i = 0; i < mfsForm.friends.length; i++) {
		if(mfsForm.friends[i].checked) {
			sendUIDs += mfsForm.friends[i].value + ',';
		}
	}

	// Use FB.ui to send the Request(s)
	FB.ui(
		{
			method: 'apprequests',
			to: sendUIDs,
			title: 'My Great Invite',
			message: 'Check out this Awesome App!'
		},
		callback
	);
}

function callback(response) {
	//console.log(response);
}

window.fbAsyncInit = function() {
	FB.init({
	  appId      : FB_APP_ID, // App ID
	  //channelUrl : '', // Channel File
	  status     : true, // check login status
	  cookie     : true, // enable cookies to allow the server to access the session
	  xfbml      : true  // parse XFBML
	});

	// Additional initialization code here
	FB.getLoginStatus(function(response) {
		if (response.status === 'connected') {
			// the user is logged in and has authenticated your
			// app, and response.authResponse supplies
			// the user's ID, a valid access token, a signed
			// request, and the time the access token
			// and signed request each expire
			FBID = response.authResponse.userID;
			FBSESSION = response.authResponse.accessToken;
			//console.log('joey, user is logged in, FBLOGOUT: ', FBID, FBSESSION);
			if (FBLOGOUT) {
				fbLogout();
			} else {

				var elem = document.getElementById('fb-login-btn');
				if(elem) {
					elem.style.display = 'none';
				}
				fbPhotos();
			}
			//if (!CURRENT_USER) {
			//	MyStyle.api(
			//		'user',
			//		'fblogin',
			//		{
			//			fbid: FBID,
			//			fb_session: FBSESSION
			//		},
			//		function() {
			//			top.location = window.location;
			//		},
			//	);
			//}
		} else if (response.status === 'not_authorized') {
			// the user is logged in to Facebook,
			// but has not authenticated your app
			//console.log('joey, user has not authorized your app');
		} else {
			// the user isn't logged in to Facebook.
			//console.log('joey, user not logged in to FB');
		}
		for (var i in FB_CALLBACKS) {
			if (typeof FB_CALLBACKS[i] === 'function') {
				FB_CALLBACKS[i]();
			}
		}
	});
};
// Load the SDK Asynchronously
(function(d){
 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement('script'); js.id = id; js.async = true;
 js.src = "//connect.facebook.net/en_US/all.js#xfbml=1&appId=" + FB_APP_ID;
 ref.parentNode.insertBefore(js, ref);
}(document));

function fbLogin(callback) {
	//console.log('joey, fb login, ', [FBID, FB_CURRENT_USER]);
	FB._https = (window.location.protocol == "https:");

	track(['facebook', 'login']);
	if(FBID) {
		//if (!FB_CURRENT_USER) {
		//	MyStyle.api(
		//		'user',
		//		'fblogin',
		//		{
		//			fbid: FBID,
		//			fb_session: FBSESSION
		//		},
		//		function() {
		//			top.location = window.location;
		//		}
		//	);
		//}
		// else {
		//	callback();
		//}
		if (typeof callback == 'function') {
			callback();
		}

		return FBID;
	}
	FB.login(function(response) {
		// handle the response
		//console.log('joey, loggin in, response: ', response);
		if (response.status === 'connected') {

			// the user is logged in and has authenticated your
			// app, and response.authResponse supplies
			// the user's ID, a valid access token, a signed
			// request, and the time the access token
			// and signed request each expire
			FBID = response.authResponse.userID;
			FBSESSION = response.authResponse.accessToken;
			window.location = window.location + '?ref=fbl';
			//console.log('joey, lower login, ', [FBID, FB_CURRENT_USER]);
			//if (!FB_CURRENT_USER ||
			//	(FB_CURRENT_USER && (FB_CURRENT_USER != FBID))
			//) {
				//MyStyle.api(
				//	'user',
				//	'fblogin',
				//	{
				//		fbid: FBID,
				//		fb_session: FBSESSION
				//	},
				//	function() {
				//		top.location = window.location;
				//	}
				//);
			//}
			//else {
			//	callback();
			//}
		} else if (response.status === 'not_authorized') {
			// the user is logged in to Facebook,
			// but has not authenticated your app
		} else {
			// the user isn't logged in to Facebook.
		}
	}, {scope: 'email,user_photos,publish_actions'});
}

function fbStream(params, callback) {
	//log user in first
	if(!FBID) {
		//not logged in, login first
		fbLogin(function() {
			fbStream(params, callback);
		});
		return false;
	}

	var tmpStreamObj = streamObj;
	for (var i in params) {
		if (tmpStreamObj.hasOwnProperty(i)) {
			tmpStreamObj[i] = params[i];
		}
	}
	//marshal data
	/*
	var tmpStreamObj = {
		method: 'feed',
		name: params.hasOwnProperty('name') ? params.name : 'I just put a Rainbow Filter on my profile picture!',
		link: params.hasOwnProperty('link') ? params.link : 'http://rainbowfilter.io?ref=fbr',
		picture: params.hasOwnProperty('picture') ? params.picture : 'http://rainbowfilter.io/big-heart-banner.png',
		caption: params.hasOwnProperty('caption') ? params.caption : 'Rainbow Filter',
		description: (params.hasOwnProperty('description') ? params.description : '' ) +
					 "Use Rainbow Filter to filter and change your profile picture. You can even change the colors! Rainbow Filter for everyone! Rainbow Filters for everything!",
		action: {
			name: params.hasOwnProperty('actionname') ? params.actionname : 'Filter',
			link: params.hasOwnProperty('link') ? params.link : 'http://rainbowfilter.io?ref=fbr'
		}
	};
	if (typeof streamObj === 'undefined') {
		var streamObj = tmpStreamObj;
	}
	*/

	FB.ui(tmpStreamObj,
		function(response) {
			if (response && response.hasOwnProperty('post_id') && response.post_id) {
				track(['facebook', 'stream', 'success']);
				callback(response.post_id);
			} else {
				track(['facebook', 'stream', 'cancel']);
				callback(0);
			}
		}
	);
}

function drawFlag(img){

	
	ctx.drawImage(
		img,
		0,
		0,
		200,
		200,
		0,
		0,
		200,
		200
	);
	ctx.drawImage(img, 0, 0);

}

function fbPhotos (callback) {
	//log user in first
	if(!FBID) {
		//not logged in, login first
		fbLogin(function() {
			fbPhotos(callback);
		});
		return false;
	}
	FB.api(
		"/me",
			function (response) {
				//console.log('joey, me cllback', response);
				//MyStyle.api(
				//	'rainbowfilter',
				//	'fblogin',
				//	{
				//		fbid: FBID,
				//		email: response.email
				//	}
				//)
			}
	);
	// MyStyle.api(
	// 		'rainbowfilter',
	// 		'session',
	// 		{},
	// 		function (res) {
				///MyStyle.util.overrideSetting('SESSION', res);
				FB.api(
					"/me/picture?type=large",
					function (response) {
						//console.log('/me/picture', response);
						zizoujab_canvas = document.getElementById('c2');
						var ctx = zizoujab_canvas.getContext('2d'); // get the canvas context;
						//var ctx = document.getElementById("main").getContext("2d");
						var background = new Image();
						background.crossOrigin = "Anonymous";
						var photo = new Image();
						var images = [background, photo]; /// the key
						var count = images.length;

						background.onload = photo.onload = counter;
						background.src = response.data.url;
						photo.src = "files/tunisia_flag_transparent.png";

						/// common loader keeping track if loads
						function counter() {
						    count--;
						    if (count === 0) drawImages();
						}

						/// is called when all images are loaded
						function drawImages() {
							zizoujab_canvas.width = background.width;
							    zizoujab_canvas.height = background.height;
						    for(xx = 0; xx < images.length; xx++)
						        ctx.drawImage(images[xx], 0, 0, background.width,background.height);
						    document.getElementById('fb-post-btn').style.display = 'inline-block';
						}



						// var img = new Image();
						// img.crossOrigin = "Anonymous";
						// 	img.onload = function(){
						// 	    zizoujab_canvas.width = img.width;
						// 	    zizoujab_canvas.height = img.height;
						// 	    ctx.save();
						// 	    ctx.globalAlpha = .5 ;
						// 	    ctx.drawImage(img, 0, 0, img.width, img.height);
						// 	    ctx.restore();
						// 	    var flagimg = new Image();
						// 	    flagimg.onload = function(){
						// 	    	//var ctxflag = zizoujab_canvas.getContext('2d'); 
						// 	    	ctx = zizoujab_canvas.getContext('2d');
						// 	    	ctx.save();
						// 	    	zizoujab_canvas.width = img.width;
						// 		    zizoujab_canvas.height = img.height;
						// 		    ctx.globalAlpha = 0.5
						// 		    ctx.drawImage(flagimg, 0, 0, img.width, img.height);
						// 		    ctx.restore();
						// 	    }
						// 	    flagimg.src="files/tunisia_flag_transparent.png";
						// 	}
						// 	img.src = response.data.url;
						// loadImage(
						//     response.data.url,
						//     function (img) {
						//         if(img.type === "error") {
						//             console.log("Error loading image " + imageUrl);
						//         } else {
						//              document.getElementById('profile-pic-img').appendChild(img);
						//              document.getElementById('profile-pic-img').appendChild(img);
						//             drawFlag(img);
						//         }
						//     },
						//     {maxWidth: 600}
						// );
						// profile_pic_id_arr = response.data.url.split('50x50/');
						// profile_pic_id_arr = profile_pic_id_arr[1].split('?');
						// profile_pic_id_arr = profile_pic_id_arr[0];
						//console.log('joey, profile_pic_id_arr: ', profile_pic_id_arr);
						// FB.api(
						// 	FBID+'/albums',
						// 	function(response) {
						// 		//console.log('/me/albums', response);
						// 		if (response && !response.error) {
						// 			/* handle the result */
						// 			//console.log('joey, fbphoto res: ', resp);
						// 		}
						// 		if (response.data.length == 0) {
						// 			//alert('Oops! Looks like Facebook is having an error automatically filtering your picture. Please click the Rainbow Filter button!')
						// 			fbBackupPic();
						// 		}
						// 		for (var i = 0, l = response.data.length; i<l; i++){
						// 			var album = response.data[i];
						// 			if (album.name == 'Profile Pictures' || album.type == 'cover')
						// 			FB.api(
						// 					'/' + album.id + '/photos/',
						// 					function (album_response) {
						// 						//console.log('/me/albums photos ', album_response);
						// 						for (var album_idx in album_response.data) {
						// 							var album_data = album_response.data[album_idx];
						// 							if (profile_pic_id_arr.indexOf(album_data.id) !== (-1)) {
						// 								if (fbProfileImageLocated) {
						// 									continue;
						// 								}
						// 								//console.log('found it! ' + album_data.source);
						// 								fbProfileImageLocated = true;
						// 								fbImgLink = album_data.link + '&makeprofile=1';
						// 								//load the image...
						// 								// MyStyle.api(
						// 								// 	'proxy',
						// 								// 	'verify',
						// 								// 	{
						// 								// 		url: album_data.source
						// 								// 	},
						// 								// 	function (res) {
						// 										//if (res.hasOwnProperty('verify') && res.hasOwnProperty('verify_ts')) {
						// 											//add in new image
						// 											var imgIdx = userImages.length;
						// 											userImages[imgIdx] = new Image();
						// 											var userImage = userImages[imgIdx];
						// 											userImage.crossOrigin = MyStyle.getSetting('API_URL');
						// 											userImage.onload = function() {
						// 												document.getElementById('lead').style.display = 'none';
						// 												document.getElementById('dl').style.display = 'inline-block';
						// 												document.getElementById('image-upload-container').style.display = 'block';
						// 												imageUploadShowUploadedItem(userImage);
						// 												//draw the image
						// 												webWidth = $('#image-upload-container').width();
						// 												var scaleX = (webWidth / userImage.width);
						// 												var scaleY = scaleX; //(userImage.height / userImage.height);
						// 												var finalScale = scaleX;
						// 												if (scaleY > scaleX) {
						// 													finalScale = scaleY;
						// 												}
						// 												webHeight = Math.floor(userImage.height * finalScale);

						// 												//designCanvas.width = webWidth; //userImage.width;
						// 												//designCanvas.height = webHeight; //userImage.height;

						// 												//designCanvas.style.width = webWidth + 'px'; //userImage.width + 'px';
						// 												//designCanvas.style.height = webHeight + 'px'; //userImage.height + 'px';

						// 												//designCtx.canvas.width = userImage.width;
						// 												//designCtx.canvas.height = userImage.height;

						// 												//console.log('joey, webWidth: '+webWidth+' | userImagewidth: '+userImage.width);
						// 												//console.log('joey, scaleX: '+scaleX+' | scaleY: '+scaleY);

						// 												var xPos = 0, yPos = 0;
						// 												if (userImage.width <= webWidth && userImage.height <= webHeight) {
						// 													//console.log('joey, addImage no changing');
						// 													//xPos = _calcCenteringPos(userImage.width, document.getElementById('product-view-container').offsetWidth);
						// 													//yPos = _calcCenteringPos(userImage.height, document.getElementById('product-view-container').offsetHeight);
						// 													imageAdd(
						// 														userImage,
						// 														{
						// 															left: xPos,
						// 															top: yPos,
						// 															angle: 0,
						// 															opacity: 100
						// 														},
						// 														imgIdx
						// 													);
						// 												} else {

						// 													var newWidth = Math.floor(userImage.width * finalScale);
						// 													var newHeight = Math.floor(userImage.height * finalScale);
						// 													//xPos = _calcCenteringPos(newWidth, document.getElementById('product-view-container').offsetWidth);
						// 													//yPos = _calcCenteringPos(newHeight, document.getElementById('product-view-container').offsetHeight);
						// 													imageAdd(
						// 														userImage,
						// 														{
						// 															left: xPos,
						// 															top: yPos,
						// 															angle: 0,
						// 															opacity: 100,
						// 															width: newWidth,
						// 															height: newHeight,
						// 															centeredRotation: 1,
						// 															centeredScaling: 1
						// 														},
						// 														imgIdx
						// 													);
						// 													//console.log('joey, addImage changing');
						// 												}
						// 												//updateControls();
						// 												track(['facebook', 'profilepic']);
						// 											}
						// 											// var manualApiUrl = MyStyle.getSetting('API_URL') + '?' +
						// 											// 	'app_id=' + MyStyle.getSetting('APP_ID') + '&' +
						// 											// 	'action=' + 'proxy' + '&' +
						// 											// 	'method=' + 'get' + '&' +
						// 											// 	'data=' + '{' +
						// 											// 	'"url":"' + encodeURIComponent(res.url) + '"' + ',' +
						// 											// 	'"verify":"' + res.verify + '"' + ',' +
						// 											// 	'"verify_ts":"' + res.verify_ts + '"' +
						// 											// 	'}' + '&' +
						// 											// 	'session=' + MyStyle.getSetting('SESSION');
						// 											var image = document.createElement('img');
						// 											//console.log('joey, manualapiurl: '+manualApiUrl);
						// 											//userImage.src = manualApiUrl;
						// 											//create a new formData, submit val
						// 											/*
						// 											var tmpFormData = imageUploadGetFormData(
						// 												'customizer',
						// 												'imageupload',
						// 												JSON.stringify(
						// 													{
						// 														image_upload: 1,
						// 														mobile: 1
						// 													}
						// 												)
						// 											);
						// 											if (tmpFormData) {
						// 												tmpFormData.append("user_image", userImage);
						// 											}
						// 											imageUploadFormApiCall(tmpFormData, function(res) {
						// 													//console.log('joey, imageUploadFormApiCallCallback: ', [res, imgIdx]);

						// 												//userImagesUrls[imgIdx] = res.images.original.url;
						// 											});
						// 											*/
						// 										//}
						// 								// 	}
						// 								// );
						// 							}
						// 						}
						// 					}
						// 			);
						// 		}
						// 		//Log.info('Albums', resp);
						// 		//var ul = document.getElementById('albums');
						// 		//for (var i=0, l=resp.data.length; i<l; i++){
						// 		//	var
						// 		//		album = resp.data[i],
						// 		//		li = document.createElement('li'),
						// 		//		a = document.createElement('a');
						// 		//	a.innerHTML = album.name;
						// 		//	a.href = album.link;
						// 		//	li.appendChild(a);
						// 		//	ul.appendChild(li);
						// 		//}
						// 	}
						// );
					}
				);
	// 		}
	// )




}

function fbLogout() {
	//console.log('joey, fblogout: ',FBID);
	if(FBID) {
		FB.logout();
	}
}

function fbPostButton(callback) {
	if (fbPosting) {
		//document.getElementById('fb-post-btn').style.display = 'none';
		//alert('Oops, Facebook had an error! Try the Download button instead!');
		//track(['facebook', 'doublepost']);
		return true;
	}
	fbPosting = true;
	track(['facebook', 'stream']);
	document.getElementById('fb-post-btn').innerHTML = 'Updating Facebook...';
var canvas = document.getElementById("c2");
var imageData  = canvas.toDataURL("image/png");
try{
	blob = dataURItoBlob(imageData);
}catch(e){console.log(e);}
var fd = new FormData();
fd.append("access_token",FBSESSION);
fd.append("source", blob);
fd.append("message","");
try{
$.ajax({
	url:"https://graph.facebook.com/me/photos?access_token=" + FBSESSION ,
	type:"POST",
	data:fd,
	processData:false,
	contentType:false,
	cache:false,
	success:function(data){
		//console.log("success ", data);
		FB.api(
			'/' + data.id,
			function (response) {
				//console.log('SUCCESS UPLOAD ', response);
				//console.log(response.link + '&makeprofile=1');
			  fbImgLink = 'https://www.facebook.com/photo.php?fbid='+data.id + '&makeprofile=1'+'&target=_top';
				fbStream(
						{},
						function (res) {
							top.location.href = fbImgLink;
						}
				);
				if (response && !response.error) {
				/* handle the result */
				//console.log('joey, fbphoto res: ', response);
			  }
			}
		)
	},
	error:function(shr,status,data){
		fbStream(
				{},
				function (res) {
					document.getElementById('fb-post-btn').style.display = 'none';
					document.getElementById('fb-post-btn').innerHTML = 'Update Facebook Picture';
					alert('Oops, Facebook had an error! Try the Download button instead!');
				}
		);
		/*
		FB.api(
			'/' + data.id,
			function (response) {
				//console.log('SUCCESS UPLOAD ', response);
				//console.log(response.link + '&makeprofile=1');
			  fbImgLink = response.link + '&makeprofile=1';
				fbStream(
						{},
						function (res) {
							document.location = fbImgLink;
						}
				);
				if (response && !response.error) {
				//console.log('joey, fbphoto res: ', response);
			  }
			}
		)
		*/
	},
	complete:function(){
	//console.log("Posted to facebook");
	}
});

}catch(e){console.log(e);}
}

function dataURItoBlob(dataURI) {
var byteString = atob(dataURI.split(',')[1]);
var ab = new ArrayBuffer(byteString.length);
var ia = new Uint8Array(ab);
for (var i = 0; i < byteString.length; i++) {
	ia[i] = byteString.charCodeAt(i);
}
return new Blob([ab], { type: 'image/png' });
}


function fbLogout() {
	if(FBID) {
		FB.logout();
	}
}

function fbBackupPic() {
	track(['facebook', 'backuppicstart']);
	FB.api(
		'/me/picture?type=large&redirect=false',
		function (response) {
			//console.log('joey, backuprespo: ',response);
			fbProfileImageLocated = true;
			fbImgLink = response.data.url + '&makeprofile=1';
			//load the image...
			MyStyle.api(
				'proxy',
				'verify',
				{
					url: response.data.url
				},
				function (res) {
					if (res.hasOwnProperty('verify') && res.hasOwnProperty('verify_ts')) {
						//add in new image
						var imgIdx = userImages.length;
						userImages[imgIdx] = new Image();
						var userImage = userImages[imgIdx];
						userImage.crossOrigin = MyStyle.getSetting('API_URL');
						userImage.onload = function() {
							document.getElementById('lead').style.display = 'none';
							document.getElementById('dl').style.display = 'inline-block';
							document.getElementById('image-upload-container').style.display = 'block';
							imageUploadShowUploadedItem(userImage);
							//draw the image
							webWidth = $('#image-upload-container').width();
							var scaleX = (webWidth / userImage.width);
							var scaleY = scaleX; //(userImage.height / userImage.height);
							var finalScale = scaleX;
							if (scaleY > scaleX) {
								finalScale = scaleY;
							}
							webHeight = Math.floor(userImage.height * finalScale);

							//designCanvas.width = webWidth; //userImage.width;
							//designCanvas.height = webHeight; //userImage.height;

							//designCanvas.style.width = webWidth + 'px'; //userImage.width + 'px';
							//designCanvas.style.height = webHeight + 'px'; //userImage.height + 'px';

							//designCtx.canvas.width = userImage.width;
							//designCtx.canvas.height = userImage.height;

							//console.log('joey, webWidth: '+webWidth+' | userImagewidth: '+userImage.width);
							//console.log('joey, scaleX: '+scaleX+' | scaleY: '+scaleY);

							var xPos = 0, yPos = 0;
							if (userImage.width <= webWidth && userImage.height <= webHeight) {
								//console.log('joey, addImage no changing');
								//xPos = _calcCenteringPos(userImage.width, document.getElementById('product-view-container').offsetWidth);
								//yPos = _calcCenteringPos(userImage.height, document.getElementById('product-view-container').offsetHeight);
								imageAdd(
									userImage,
									{
										left: xPos,
										top: yPos,
										angle: 0,
										opacity: 100
									},
									imgIdx
								);
							} else {

								var newWidth = Math.floor(userImage.width * finalScale);
								var newHeight = Math.floor(userImage.height * finalScale);
								//xPos = _calcCenteringPos(newWidth, document.getElementById('product-view-container').offsetWidth);
								//yPos = _calcCenteringPos(newHeight, document.getElementById('product-view-container').offsetHeight);
								imageAdd(
									userImage,
									{
										left: xPos,
										top: yPos,
										angle: 0,
										opacity: 100,
										width: newWidth,
										height: newHeight,
										centeredRotation: 1,
										centeredScaling: 1
									},
									imgIdx
								);
								//console.log('joey, addImage changing');
							}
							//updateControls();
							track(['facebook', 'backuppic', 'complete']);
						}
						var manualApiUrl = MyStyle.getSetting('API_URL') + '?' +
							'app_id=' + MyStyle.getSetting('APP_ID') + '&' +
							'action=' + 'proxy' + '&' +
							'method=' + 'get' + '&' +
							'data=' + '{' +
							'"url":"' + encodeURIComponent(res.url) + '"' + ',' +
							'"verify":"' + res.verify + '"' + ',' +
							'"verify_ts":"' + res.verify_ts + '"' +
							'}' + '&' +
							'session=' + MyStyle.getSetting('SESSION');
						//console.log('joey, manualapiurl: '+manualApiUrl);
						userImage.src = manualApiUrl;
						//create a new formData, submit val
						/*
						var tmpFormData = imageUploadGetFormData(
							'customizer',
							'imageupload',
							JSON.stringify(
								{
									image_upload: 1,
									mobile: 1
								}
							)
						);
						if (tmpFormData) {
							tmpFormData.append("user_image", userImage);
						}
						imageUploadFormApiCall(tmpFormData, function(res) {
								//console.log('joey, imageUploadFormApiCallCallback: ', [res, imgIdx]);

							//userImagesUrls[imgIdx] = res.images.original.url;
						});
						*/
					}
				}
			);
		}
	);
}
