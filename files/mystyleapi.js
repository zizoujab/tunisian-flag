var MyStyle = {
	_settings: {
		API_URL: '',
		STATIC_URL: '//static.ogmystyle.com/shared-static/',
		CUSTOMIZER_URL: '',
		APP_ID: 0,
		SESSION: null,
		HTML_RENDER_ENABLED: 1,
		CUSTOMIZER_STATIC_URL: '//static.ogmystyle.com/customizer-js/',
		URL_STATIC_MAIN: '//static.ogmystyle.com',
		LOCAL_STORAGE_ENABLED: 0
	},

	//an ode to Jacky Wang (Wang Chao)... -joey 5/18/2013
	_processCache: {},
	_fileDepends: [],
	_apiDepends: [],
	_apiQueue: [],
	_xhrBucket: {},
	_loaded: false,
	_initCalled: false,

	init: function(settings) {
		if (MyStyle._initCalled) {
			return;
		}
		MyStyle._initCalled = true;
		//setup JS process cache...
		MyStyle._processCache._user = [];
		MyStyle._processCache._product = [];
		MyStyle._processCache._design = [];
		MyStyle._processCache._affiliate = [];

		var setting = null;
		for (var settingName in settings) {
			setting = settings[settingName];
			if (!MyStyle._settings.hasOwnProperty(settingName) ||
				!MyStyle._settings[settingName]) {
				MyStyle._settings[settingName] = setting;
			}
		}
		if (typeof jQuery === 'undefined') {
			var jqueryUrl = 'https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js';
			MyStyle._fileDepends.push(jqueryUrl);
			MyStyle.util.load(
				jqueryUrl,
				jqueryUrl.split('.').pop(),
				function () {
					MyStyle._fileDepends.pop();
					MyStyle._addFileDepends();
				}
			);
		} else {
			MyStyle._addFileDepends();
		}

		MyStyle.storage.init();
	},

	_addFileDepends: function () {

		if (typeof easyXDM === 'undefined') {
			MyStyle._fileDepends.push(MyStyle.getSetting('STATIC_URL') + 'js/easyXDM/easyXDM.min.js');
		}
		//if (typeof jQuery.fancybox === 'undefined') {
			//MyStyle._fileDepends.push(MyStyle.getSetting('STATIC_URL') + 'js/fancybox/jquery.fancybox-1.3.4.js');
			//MyStyle._fileDepends.push(MyStyle.getSetting('STATIC_URL') + 'js/fancybox/jquery.fancybox-1.3.4.css');
		//}
		for (var i in MyStyle._fileDepends) {
			MyStyle.util.load(
				MyStyle._fileDepends[i],
				MyStyle._fileDepends[i].split('.').pop(),
				MyStyle._fileDependsLoaded
			);
		}
	},

	_fileDependsLoaded: function (data) {
		if (typeof data === 'undefined') {
			return;
		}
		MyStyle._fileDepends.pop();
		if (MyStyle._fileDepends.length) {
			return;
		}
		MyStyle._loaded = true;
		if (MyStyle._apiQueue.length) {
			var queueCopy = MyStyle._apiQueue;
			MyStyle._apiQueue = null;
			var call = null;
			for (var i in queueCopy) {
				call = queueCopy[i];
				MyStyle.api(
					call.action,
					call.method,
					call.data,
					call.callback
				);
			}
			queueCopy = null;
		} else {
			MyStyle._init();
		}

	},

	_init: function () {
		if (MyStyle._fileDepends.length) {
			return;
		}

		if (typeof window.MyStyleInitCallback === 'function') {
			window.MyStyleInitCallback();
		}

		if (MyStyle.getSetting('HTML_RENDER_ENABLED')) {
			if (jQuery.isReady) {
				MyStyle._renderAllTags();
			} else {
				jQuery(document).ready(MyStyle._renderAllTags);
			}
		}
	},

	getSetting: function(name) {
		if (MyStyle._settings.hasOwnProperty(name)) {
			return MyStyle._settings[name];
		} else {
			return null;
		}
	},

	api: function(action, method, data, callback) {
		if (!MyStyle._loaded) {
			MyStyle._apiQueue.push(
				{
					action: action,
					method: method,
					data: data,
					callback: callback
				}
			);
			return;
		}
		var apiUrl = MyStyle.getSetting('API_URL');
		var staticUrl = MyStyle.getSetting('STATIC_URL');
		if (!MyStyle._xhrBucket[apiUrl]) {
			MyStyle._xhrBucket[apiUrl] = new easyXDM.Rpc({
				swf: staticUrl + "js/easyXDM/easyxdm.swf",
				remote: apiUrl + "cors/",
				remoteHelper: staticUrl + "js/easyXDM/name.html"
			}, {
				remote: {
					request: {}
				}
			});
		}
		var reqPacket = {
			action: action,
			method: method,
			app_id: MyStyle.getSetting('APP_ID'),
			data: JSON.stringify(data)
		};
		if (MyStyle.getSetting('SESSION')) {
			reqPacket.session = MyStyle.getSetting('SESSION');
		}
		MyStyle._xhrBucket[apiUrl].request(
			{
				url: apiUrl,
				method: "POST",
				data: reqPacket
			},
			function (response) {
				if (!response.hasOwnProperty('data')) {
					//connect failed...
					MyStyle.logger.critical('Error contacting API.');
					callback(null);
					return;
				}
				var parsed = JSON.parse(response.data);
				if (!parsed.hasOwnProperty('error') && parsed.hasOwnProperty('data')) {
					if (typeof callback === 'function') {
						callback(parsed.data);
					}
				} else {
					if (typeof callback === 'function') {
						callback(null);
					}
				}
			}
		);
	},

	ui: function (name, settings, data) {
		if (MyStyle._ui.hasOwnProperty(name)) {
			MyStyle._ui[name].load(settings);
		}
	},

	_renderTagCalls: 0,
	_renderAllTags: function() {
		var tmp = {};
		jQuery('.mystyle').each(function(index){
			var classes = jQuery(this).attr('class');
			classes = classes.split(' ');
			for (var i = 0; i < classes.length; i++) {
				if (/^mystyle-/.test(classes[i])) {
					var splits = classes[i].split('-');
					if (splits[1] == 'design' && typeof splits[2] !== 'undefined') {
						if (!tmp.hasOwnProperty('tmpDesignArr')) {
							tmp.tmpDesignArr = [];
						}
						tmp.tmpDesignArr.push(splits[2]);
					}
					if (splits[1] == 'product' && typeof splits[2] !== 'undefined') {
						if (!tmp.hasOwnProperty('tmpProductArr')) {
							tmp.tmpProductArr = [];
						}
						tmp.tmpProductArr.push(splits[2]);
					}
					if (splits[1] == 'user' && typeof splits[2] !== 'undefined') {
						if (!tmp.hasOwnProperty('tmpUserArr')) {
							tmp.tmpUserArr = [];
						}
						tmp.tmpUserArr.push(splits[2]);
					}
					if (splits[1] == 'affiliate' && typeof splits[2] !== 'undefined') {
						if (!tmp.hasOwnProperty('tmpAffArr')) {
							tmp.tmpAffArr = [];
						}
						tmp.tmpAffArr.push(splits[2]);
					}
				}
			}
			if (jQuery(this).attr('design_id')) {
				if (!tmp.hasOwnProperty('tmpDesignArr')) {
					tmp.tmpDesignArr = [];
				}
				tmp.tmpDesignArr.push(jQuery(this).attr('design_id'));
			}
			if (jQuery(this).attr('product_id')) {
				if (!tmp.hasOwnProperty('tmpProductArr')) {
					tmp.tmpProductArr = [];
				}
				tmp.tmpProductArr.push(jQuery(this).attr('product_id'));
			}
			if (jQuery(this).attr('user_id')) {
				if (!tmp.hasOwnProperty('tmpUserArr')) {
					tmp.tmpUserArr = [];
				}
				tmp.tmpUserArr.push(jQuery(this).attr('user_id'));
			}
			if (jQuery(this).attr('affiliate_id')) {
				if (!tmp.hasOwnProperty('tmpAffArr')) {
					tmp.tmpAffArr = [];
				}
				tmp.tmpAffArr.push(jQuery(this).attr('affiliate_id'));
			}
		});
		var batch = {};
		if (typeof tmp.tmpDesignArr !== 'undefined' && tmp.tmpDesignArr.length) {
			batch.design = {
				action: 'design',
				method: 'get',
				data: {
					id: tmp.tmpDesignArr
				}
			};
		}
		if (typeof tmp.tmpProductArr !== 'undefined' &&
			tmp.tmpProductArr.length) {
			batch.product = {
				action: 'product',
				method: 'get',
				data: {
					id: tmp.tmpProductArr
				}
			};
		}
		if (typeof tmp.tmpUserArr !== 'undefined' &&
			tmp.tmpUserArr.length) {
			batch.user = {
				action: 'user',
				method: 'get',
				data: {
					id: tmp.tmpUserArr
				}
			};
		}
		if (typeof tmp.tmpAffArr !== 'undefined' &&
			tmp.tmpAffArr.length) {
			batch.affiliate = {
				action: 'affiliate',
				method: 'get',
				data: {
					id: tmp.tmpAffArr
				}
			};
		}

		//batch call
		if (MyStyle.util.objSize(batch)) {
			MyStyle.api(
				'batch',
				'call',
				batch,
				MyStyle._renderAllTagsCallback
			);
			MyStyle._renderTagCalls++;
		}

		if (!MyStyle._renderTagCalls) {
			MyStyle._renderTagCalls++;
			MyStyle._renderAllTagsCallback(false, false);
		}
	},

	_renderAllTagsCallback: function(data) {
		MyStyle._renderTagCalls--;
		for(var resIdx in data) {
			if (data[resIdx].hasOwnProperty('data')) {
				var innerData = data[resIdx]['data'];
				for (var innerResIdx in innerData) {
					switch (resIdx) {
						case 'design':
							MyStyle._processCache._design[innerResIdx] = data[resIdx]['data'][innerResIdx];
							break;
						case 'product':
							MyStyle._processCache._product[innerResIdx] = data[resIdx]['data'][innerResIdx];
							break;
						case 'user':
							MyStyle._processCache._user[innerResIdx] = data[resIdx]['data'][innerResIdx];
							break;
						case 'affiliate':
							MyStyle._processCache._affiliate[innerResIdx] = data[resIdx]['data'][innerResIdx];
							break;
						default:
							break;
					}
				}
			}
		}
		if (MyStyle._renderTagCalls) {
			return;
		}

		jQuery('.mystyle').each(function(index){
			var classes = jQuery(this).attr('class');
			classes = classes.split(' ');
			for (var i = 0; i < classes.length; i++) {
				if (/^mystyle-/.test(classes[i])) {
					var splits = classes[i].split('-');
					if (typeof splits[1] !== 'undefined' &&
						typeof MyStyle._ui[splits[1]] !== 'undefined') {
						MyStyle._ui[splits[1]].load(jQuery(this));
					}
				}
			}
		});
	},

	_ui: {
		customizer: {
			load: function (jQRef) {
				var urlVars = [];
				var designToView = null;
				var productToView = null;
				var userToView = null;
				var affiliateToView = null;

				var classes = jQRef.attr('class');
				classes = classes.split(' ');
				for (var i = 0; i < classes.length; i++) {
					if (/^mystyle-/.test(classes[i])) {
						var splits = classes[i].split('-');
						if (splits[1] == 'design' && typeof splits[2] !== 'undefined' &&
							typeof MyStyle._processCache._design[splits[2]] !== 'undefined') {
							designToView = MyStyle._processCache._design[splits[2]];
						}
						if (splits[1] == 'product' && typeof splits[2] !== 'undefined' &&
							typeof MyStyle._processCache._product[splits[2]] !== 'undefined') {
							productToView = MyStyle._processCache._product[splits[2]];
						}
						if (splits[1] == 'user' && typeof splits[2] !== 'undefined' &&
							typeof MyStyle._processCache._user[splits[2]] !== 'undefined') {
							designToView = MyStyle._processCache._design[splits[2]];
						}
						if (splits[1] == 'affiliate' && typeof splits[2] !== 'undefined' &&
							typeof MyStyle._processCache._affiliate[splits[2]] !== 'undefined') {
							designToView = MyStyle._processCache._design[splits[2]];
						}
					}
				}
				if (jQRef.attr('mystyle_design_id') &&
					typeof MyStyle._processCache._design[jQRef.attr('mystyle_design_id')] !== 'undefined') {
					designToView = MyStyle._processCache._design[jQRef.attr('mystyle_design_id')];
				}
				if (jQRef.attr('mystyle_product_id') &&
					typeof MyStyle._processCache._product[jQRef.attr('mystyle_product_id')] !== 'undefined') {
					productToView = MyStyle._processCache._product[jQRef.attr('mystyle_product_id')];
				}
				if (jQRef.attr('mystyle_user_id') &&
					typeof MyStyle._processCache._user[jQRef.attr('mystyle_user_id')] !== 'undefined') {
					userToView = MyStyle._processCache._user[jQRef.attr('mystyle_user_id')];
				}
				if (jQRef.attr('mystyle_affiliate_id') &&
					typeof MyStyle._processCache._affiliate[jQRef.attr('mystyle_affiliate_id')] !== 'undefined') {
					affiliateToView = MyStyle._processCache._affiliate[jQRef.attr('mystyle_affiliate_id')];
				}

				if (designToView) {
					urlVars.push('design_id=' + designToView.id);
				}
				if (productToView) {
					urlVars.push('product_id=' + productToView.id);
				}
				if (userToView) {
					urlVars.push('user_id=' + userToView.id);
				}
				if (affiliateToView) {
					urlVars.push('affiliate_id=' + affiliateToView.id);
				}

				jQRef.attr('target', '');
				jQRef.fancybox({
						'type' : 'iframe',
						'width' : 990,
						'height' : 580,
						'autoDimensions' : false,
						'hideOnOverlayClick':false,
						'hideOnContentClick':false
				});
				if (urlVars.length) {
					jQRef.attr('href', MyStyle.getSetting('CUSTOMIZER_URL') + 'design/create/' + '?' + urlVars.join("&"));
				} else {
					jQRef.attr('href', MyStyle.getSetting('CUSTOMIZER_URL') + 'design/create/');
				}
				if (designToView && typeof designToView.web_url !== 'undefined') {
					var thumbUrl = 'https' + designToView.web_url.substring(4);
					jQRef.html('<img src="' + thumbUrl + '" border="0" />');
				}
			}
		},
		cart: {
			load: function (jQRef) {

			}
		}
	},

	deviceDetect: function() {
		var ua = navigator.userAgent;
		var detect = {
			iPhone: ua.match(/(iPhone)/),
			iPad: ua.match(/(iPad)/),
			iPod: ua.match(/(iPod)/),
			BlackBeryy: ua.match(/BlackBerry/),
			Android: ua.match(/Android/),
			webOS: ua.match(/(webOS)/)
		};
		for (var i in detect) {
			if (detect[i]) {
				return i;
			}
		}
		return null;
	},

	storage: {
		enabled: 0,
		isInit: 0,
		init: function() {
			//set the storage length for browsers that get file access after JS member set
			window.localStorage.length;
			if (typeof window.localStorage !== 'undefined') {
				window.localStorage.length;
				MyStyle.storage.enabled = 1;
			}
		},
		setStorage: function(key, data) {
			MyStyle.storage.init();
			if (MyStyle.storage.enabled) {
				if (typeof key === 'Array' || typeof key === 'array') {
					key = key.join();
				}
				try {
					window.localStorage.setItem(key, data);
				} catch (e) {
					//some browsers show it exists but it doesnt, catch exceptions
				}
			} else {
				return null;
			}
		},
		getStorage: function(key) {
			MyStyle.storage.init();
			if (MyStyle.storage.enabled) {
				if (typeof key === 'Array' || typeof key === 'array') {
					key = key.join();
				}
				return window.localStorage.getItem(key);
			} else {
				return null;
			}
		},
		clearStorage: function() {
			MyStyle.storage.init();
			if (MyStyle.storage.enabled) {
				//clean out the old data
				window.localStorage.clear();
				return true;
			} else {
				return null;
			}
		}
	},

	profiler: {},

	logger: {
		logLevel: 3,
		forceHtml: false,

		CRITICAL: 1,
		ERROR: 2,
		DEBUG: 3,

		_div: document.getElementById('mystyle-logger-div'),
		_queue: [],

		checkConsole: function() {
			if (typeof console !== 'undefined' && typeof console.log === 'function') {
				return true;
			} else {
				return false;
			}
		},
		setLogLevel: function (newLevel) {
			MyStyle.logger.logLevel = newLevel;
		},
		setForceHtml: function (newVal) {
			MyStyle.logger.forceHtml = newVal;
		},
		debug: function(message, params) {
			if (MyStyle.logger.logLevel >= MyStyle.logger.DEBUG) {
				MyStyle.logger.log(message, params);
			}
		},
		error: function(message, params) {
			if (MyStyle.logger.logLevel >= MyStyle.logger.ERROR) {
				MyStyle.logger.log(message, params);
			}
		},
		critical: function(message, params) {
			if (MyStyle.logger.logLevel >= MyStyle.logger.CRITICAL) {
				MyStyle.logger.log(message, params);
			}
		},
		log: function (message, params){
			if (MyStyle.logger.checkConsole()) {
				if (typeof params === 'undefined') {
					console.log(message);
				} else {
					console.log(message, params);
				}
			}
			if (!MyStyle.logger.checkConsole() || MyStyle.logger.forceHtml) {
				///**/alert(message);
				if (!MyStyle.logger._div && document.getElementById('mystyle-logger-div')) {
					MyStyle.logger._div = document.getElementById('mystyle-logger-div');
				}
				if (MyStyle.logger._div) {
					if (MyStyle.logger._queue.length) {
						for (var i in MyStyle.logger._queue) {
							MyStyle.logger._div.innerHTML = MyStyle.logger._div.innerHTML +
															MyStyle.logger._queue[i] +
															'<br/>' + "\n";
						}
						MyStyle.logger._queue = [];
					}

					MyStyle.logger._div.innerHTML = MyStyle.logger._div.innerHTML + message + '<br/>' + "\n";
				} else {
					MyStyle.logger._queue.push(message);
				}
			}
		}
	},

	util: {
		load: function (scriptSrc, filetype, callback) {
			//gets document head element
			var oHead = document.getElementsByTagName('head')[0];
			if(oHead)
			{
				var fileref = null;
				switch (filetype) {
					case 'js':
						fileref = document.createElement('script')
						fileref.setAttribute("type","text/javascript")
						fileref.setAttribute("src", scriptSrc)
						break;
					case 'css':
						fileref = document.createElement("link")
						fileref.setAttribute("rel", "stylesheet")
						fileref.setAttribute("type", "text/css")
						fileref.setAttribute("href", scriptSrc)
						break;
					default:
						break;
				}
				//calling a function after the js is loaded (IE)
				var loadFunction = function() {
					if (this.readyState == 'complete' || this.readyState == 'loaded') {
						callback({filename: scriptSrc});
					}
				};
				//calling a function after the js is loaded (Firefox)
				fileref.onload = callback;
				//append the script tag to document head element
				oHead.appendChild(fileref);
				fileref.onreadystatechange = loadFunction;
			}
		},
		overrideSetting: function(settingName, settingValue) {
			MyStyle._settings[settingName] = settingValue;
		},
		validateEmail: function (email) {
			var re = /^[a-zA-Z0-9._\+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,6}jQuery/;
			return re.test(email);
		},
		objSize: function(obj) {
			var size = 0, key;
			for (key in obj) {
				if (obj.hasOwnProperty(key)) size++;
			}
			return size;
		},
		objDump: function (arr,level) {
			var dumped_text = "";
			if(!level) level = 0;

			//The padding given at the beginning of the line.
			var level_padding = "";
			for(var j=0;j<level+1;j++) level_padding += "    ";

			if(typeof(arr) == 'object') { //Array/Hashes/Objects
				for(var item in arr) {
					var value = arr[item];

					if(typeof(value) == 'object') { //If it is an array,
						dumped_text += level_padding + "'" + item + "' ...\n";
						dumped_text += MyStyle.util.objDump(value,level+1);
					} else {
						dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
					}
				}
			} else { //Stings/Chars/Numbers etc.
				dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
			}
			return dumped_text;
		},
		clearTxt: function(elemId) {
			var elem = document.getElementById(elemId);
			elem.setAttribute('value', '');
		},
		clearHtml: function (elemId) {
			var elem = document.getElementById(elemId);
			elem.innerHTML = '';
		},
		onEnterPress: function (elemId, action) {
			jQuery('#' + elemId).keypress(function(event) {
				if (event.which == 13) {
					event.preventDefault();
					action();
				}
			});
		}
	}
};
if (typeof window.MyStyleAsyncInit === 'function') {
	window.MyStyleAsyncInit();
}
if (typeof JSON === 'undefined') {
var JSON;if(!JSON){JSON={}}(function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){if(typeof rep[i]==="string"){k=rep[i];v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*jQuery/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());
}