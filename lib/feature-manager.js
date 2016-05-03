var extend = require('extend'),
	FS = require('fs'),
	Q = require('q'),
	AWS = require('aws-sdk');

var defaultConfig = {
	sourceType: 'local',		// one of ['local','http','s3']
	sourcePath:'features.json',	// must have one of [sourcePath, sourceUrl, sourceBucket && sourcePath]
	ttl: 86400					// in s, default 1 day
};

var ENUMS = {
	SourceType: {
		Local: 'local',
		Http: 'http',
		S3: 's3'
	}
};

var readFileFromLocal = function(cfg) {
	return Q.nfapply(FS.readFile, [cfg.sourcePath, 'utf-8']);
};

var readFileFromHttp = function(cfg) {
	return Q.reject('not supported yet');
};

var readFileFromS3 = function(cfg) {
	var deferred = Q.defer();
	var s3 = new AWS.S3();
	s3.getObject({Bucket: cfg.sourceBucket, Key: cfg.sourcePath}, function(err,response) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(response.Body.toString());
		}
	});
	return deferred.promise;
};

var cacheExpired = function(ctx) {
	return ctx.expires < new Date().getTime();
};

var updateSource = function(ctx,force) {
	var deferred = Q.defer();
	// only update if we are forcing or the TTL has expired
	if (ctx.updating) {
		return ctx.updating;
	} else if (force || cacheExpired(ctx)) {
		ctx.updating = deferred.promise;
		var strategyMethod = readFileFromLocal;
		switch (ctx.config.sourceType) {
			case ENUMS.SourceType.Http:
				strategyMethod = readFileFromHttp;
				break;
			case ENUMS.SourceType.S3:
				strategyMethod = readFileFromS3;
				break;
			case ENUMS.SourceType.Local:
				strategyMethod = readFileFromLocal;
				break;
		}
		strategyMethod(ctx.config).then(
			function(featureString) {
				try {
					var featureObject = JSON.parse(featureString);
					ctx.featureList = featureObject;
					ctx.expires = new Date().getTime() + (ctx.config.ttl * 1000);	// ttl is in seconds
					deferred.resolve(featureObject);
				} catch (ex) {
					deferred.reject(ex);
				} finally {
					ctx.updating = false;
				}
			},
			function(reason) { deferred.reject(reason); ctx.updating = false; });
	} else {
		deferred.resolve(ctx.featureList);
	}
	return deferred.promise;
};

var FeatureManager = function(_config) {
	this.config = JSON.parse(JSON.stringify(defaultConfig));
	extend(this.config,_config);
	this.expires = 0;
	this.featureList = {};
	if (this.config.sourceType === ENUMS.SourceType.S3) {
		AWS.config.update(this.config.aws);
	}
	this.updating = false;
};

FeatureManager.SourceType = ENUMS.SourceType;

FeatureManager.prototype.getConfig = function() {
	return this.config;
};

FeatureManager.prototype.getFeatureList = function(forceUpdate) {
	return updateSource(this,forceUpdate).then(function(result) {
		return Q(result);
	}, function(reason) {
		return Q.reject(reason);
	});
};

FeatureManager.prototype.isEnabled = function(featureId) {
	return updateSource(this).then(function() {
		return Q(this.isEnabledSync(featureId));
	});
};

FeatureManager.prototype.getFeatureOptions = function(featureId) {
	return updateSource(this).then(function() {
		return Q(this.featureList[featureId] ? this.featureList[featureId] : null);
	});
};

FeatureManager.prototype.getFeatureOption = function(featureId,optionKey) {
	return updateSource(this).then(function() {
		return Q(this.isEnabledSync(featureId));
	});
};


FeatureManager.prototype.isEnabledSync = function(featureId) {
	if (!this.featureList || cacheExpired(this) ) {
		throw { name: 'FeatureManagerException', message: 'Unable to synchronously check for feature; featureList has not been initialized' };
	}
	var featureItem = this.featureList[featureId];
	return (featureItem !== undefined) && (typeof featureItem === 'object' ? (featureItem.enabled === undefined ? true : featureItem.enabled) : featureItem);
};

module.exports = FeatureManager;
