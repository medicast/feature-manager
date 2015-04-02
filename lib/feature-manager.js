var extend = require('extend'),
	FS = require('fs'),
	Q = require('q');

var defaultConfig = {
	sourceType: 'local',		// one of ['local','http','s3']
	sourceUrl:'features.json',	// one of ['/path/to/filename','http://server/path','s3://bucket/path']
	ttl: 86400					// in s, default 1 day
};

var ENUMS = {
	SourceType: {
		Local: 'local',
		Http: 'http',
		S3: 's3'
	}
};

var readFileFromLocal = function(url) {
	return Q.nfapply(FS.readFile, [url, 'utf-8']);
};

var readFileFromHttp = function(url) {
};

var readFileFromS3 = function(url) {
};

var cacheExpired = function(ctx) {
	console.log(ctx.expires + ' <? ' + new Date().getTime());
	console.log(ctx.expires < new Date().getTime());
	return ctx.expires < new Date().getTime();
};

var updateSource = function(ctx,force) {
	var deferred = Q.defer();
	// only update if we are forcing or the TTL has expired
	if (force || cacheExpired(ctx)) {
		var strategyMethod = readFileFromLocal;
		switch (ctx.config.sourceType) {
			case ENUMS.Http:
				strategyMethod = readFileFromHttp;
				break;
			case ENUMS.S3:
				strategyMethod = readFileFromS3;
				break;
			case ENUMS.Local:
				strategyMethod = readFileFromLocal;
				break;
		}
		strategyMethod(ctx.config.sourceUrl).then(
			function(featureString) {
				try {
					var featureObject = JSON.parse(featureString);
					ctx.featureList = featureObject;
					ctx.expires = new Date().getTime() + (ctx.config.ttl * 1000);	// ttl is in seconds
					deferred.resolve(featureObject);
				} catch (ex) {
					deferred.reject(ex);
				}
			},
			function(reason) { deferred.reject(reason); });
	} else {
		deferred.resolve(ctx.config.featureList);
	}
	return deferred.promise;
};

var FeatureManager = function(_config) {
	this.config = JSON.parse(JSON.stringify(defaultConfig));
	extend(this.config,_config);
	this.expires = 0;
	this.featureList = {};
};

FeatureManager.SourceType = ENUMS.SourceType;

FeatureManager.prototype.getConfig = function() {
	return this.config;
};

FeatureManager.prototype.getFeatureList = function(forceUpdate) {
	return updateSource(this,forceUpdate);
};

FeatureManager.prototype.isEnabled = function(featureId) {
	return updateSource(this).then(function() {
		return Q(this.isEnabledSync(featureId));
	});
};

FeatureManager.prototype.isEnabledSync = function(featureId) {
	if (!this.featureList || cacheExpired(this) ) {
		throw { name: 'FeatureManagerException', message: 'Unable to synchronously check for feature; featureList has not been initialized' };
	}
	var featureItem = this.featureList[featureId];
	return featureItem && (typeof featureItem === 'object' ? (featureItem.disabled ? !featureItem.disabled : featureItem.enabled) : featureItem);
};

module.exports = FeatureManager;