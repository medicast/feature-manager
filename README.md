# medicast-app-framework

Feature flag manager for SaaS and white-label products

Test status
[![Circle CI](https://circleci.com/gh/medicast/feature-manager.svg?style=svg)](https://circleci.com/gh/medicast/feature-manager)

## Overview

Use feature-manager when you have an externalized configuration that you need to load to enable and disable features.  For now it's just a small abstraction layer to pull in a catalog file from a local or remote source--not that interesting.  But we'll be adding some smart stuff soon like auto-reloading at a configurable interval + a back-end service and UI to manage features, etc.

## Usage

### Basic Flow

``` js
var FeatureManager = require('feature-manager');

var options = { /* see below */ };
var featureManager = new FeatureManager(options);

// blocking call
featureManager.isEnabledSync('mainpage.sidebar');		// returns true, false

// using promises
featureManager.isEnabled('mainpage.sidebar').then(function(enabled) {
	// enabled is true or false
});
```

### Initializing

``` js
var options = {
	sourceType: FeatureManager.SourceType.Local,		// or just 'local'
	sourcePath: __dirname + '/features.json',
	ttl: 86400	
	// see below for additional configurations
};
var featureManager = new FeatureManager(options);
```

Options is an object containing details on *where* and *how often* to retrieve the feature catalog.  Currently, feature catalog files can be stored locally or on [AWS S3](https://aws.amazon.com/s3):

``` js
var options = {
	sourceType: FeatureManager.SourceType.S3,		// or just 's3'
	sourceBucket: 's3.bucket.example.com',
	sourcePath: 'path/to/features.json',
	ttl: 86400,
	aws: {
		accessKeyId: 'AMAZON-ACCESS-KEY-ID',
		secretAccessKey: 'SECRETACCESSKEY'
	}
}
```

### Feature Catalog Format

The catalog is a JSON file that contains an object whose keys represent features that you wish to enable or disable.  Values can be either true/false to indicate that the feature is enabled, or an object that contains additional configuration elements for the feature.

``` js
{
	"feature1" : true,
	"feature2" : { 
		"optionA" : "some value",
		"optionB" : "another config element"
	},
	"feature3" : {
		"enabled" : false,
		"optionA" : "red"					// unused
	},
	"feature4": {
		"enabled" : true,					// redundant
		"optionX" : "/path/to/something"
	}
}
```

Note the presence of the ```enabled``` key, which can be used to explicitly enable/disable a feature.  Setting this to ```true``` is redundant because the presence of options for a feature key indicates that it is enabled, but it's provided as syntactic sugar and to help maintain consistency.

At this time, the catalog cannot include nested feature containers, i.e. the following is not valid syntax:

```js
{
	"mainpage" : {
		"sidebar": false,
		"navbar" : {
			"enabled" : true,
			"theme" : "light"
		}
	}
}
```

This capability will be added in a later version.  The workaround is to do this for now:

```js
{
	"mainpage.sidebar" : false,
	"mainpage.navbar" : {
		"theme" : "light"
	}
}
```

## License

MIT License.  Our gift to you--happy birthday.  Use at your own risk.
