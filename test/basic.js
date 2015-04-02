var should = require('should'),
    FeatureManager = require('../index');


var FeatureManagerDefaultConfig = {
	sourceType: 'local',		// one of ['local','http','s3']
	sourceUrl:'features.json',	// one of ['/path/to/filename','http://server/path','s3://bucket/path']
	ttl: 86400					// in s, default 1 day
};


describe('Module Implementation', function() {
	describe('when statics are defined',function() {
		it('should have SourceType', function() {
			FeatureManager.should.be.ok;
			FeatureManager.SourceType.should.be.ok;
			Object.keys(FeatureManager.SourceType).length.should.be.exactly(3);
			FeatureManager.SourceType.Local.should.be.ok.and.exactly('local');
			FeatureManager.SourceType.Http.should.be.ok.and.exactly('http');
			FeatureManager.SourceType.S3.should.be.ok.and.exactly('s3');
		});
	});
});

describe('Initializing FeatureManager', function() {
    describe('without a config',function() {
		var config = null;
		var fm1 = new FeatureManager(config);

		it('should work', function() {
			fm1.should.be.ok;
		});

        it ('should return the default config', function() {
			should(fm1.getConfig()).eql(FeatureManagerDefaultConfig);
        });
    });

    describe('with an empty config',function() {
		var config = {};
		var fm2 = new FeatureManager(config);

		it('should work', function() {
			fm2.should.be.ok;
		});

        it ('should return the default config', function() {
			should(fm2.getConfig()).eql(FeatureManagerDefaultConfig);
        });

        it('should correctly throw an error when the feature cache is empty',function() {
        	try {
        		fm2.isEnabledSync('any.feature');
        		should(false).ok;
        	} catch (ex) {
        		should(true).ok;
        	}
        });
    });

    describe('with a local strategy feature list',function() {
		var config = {
			sourceType: FeatureManager.SourceType.Local,
			sourceUrl: __dirname + '/samples/feature1.json'
		};
		var configWithDefaults = {
			sourceType: FeatureManager.SourceType.Local,
			sourceUrl: __dirname + '/samples/feature1.json',
			ttl: 86400	
		};
		var fm3 = new FeatureManager(config);

		var featureList = {
			"some.feature" : true,
			"feature.with.options": {
				"enabled": true,
				"option1": "Yes!"
			},
			"feature.explicitly.disabled": false,
			"feature.with.options.explicitly.not.enabled": {
				"enabled" : false,
			},
			"feature.with.options.explicitly.disabled": {
				"disabled" : true,
				"optionX" : {}
			}
		};

		it('should work', function() {
			fm3.should.be.ok;
        });

        it ('should return the expected config', function() {
			fm3.getConfig().should.eql(configWithDefaults);
			fm3.getConfig().sourceType.should.eql(FeatureManager.SourceType.Local);
			fm3.expires.should.equal(0);
        });

        it('should read the local file without error', function() {
			return fm3.getFeatureList();
        });

        it('should read the local file and get the correct feature list', function(done) {
			fm3.getFeatureList().then(
				function(result) {
					try {
						should(result).be.an.object;
						should(result).eql(featureList);
						done();
					} catch (ex) {
						done(ex);
					}
				}, function(reason) {
					done(reason);
				});
        });

        it('should cache the result set',function() {
			var expiresBefore = fm3.expires;
			fm3.getFeatureList().then(function() {
				fm3.expires.should.not.equal(expiresBefore);
			});
        });

        it('should correctly read features from the cached results',function() {
			should(fm3.isEnabledSync('some.feature')).equal(true);
			should(fm3.isEnabledSync('feature.with.options')).equal(true);
			should(fm3.isEnabledSync('feature.not.listed')).not.be.ok;
			should(fm3.isEnabledSync('feature.explicitly.disabled')).equal(false);
			should(fm3.isEnabledSync('feature.with.options.explicitly.not.enabled')).equal(false);
			should(fm3.isEnabledSync('feature.with.options.explicitly.disabled')).equal(false);

        });

    });

});