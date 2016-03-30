var collectionNames = [
			'needs',
			'users',
			'roles',
			'snapshots',
			'chatmessages',
			'supplies'
		],
		loadedCollections = [];

collectionLoadCallbacks = typeof collectionLoadCallbacks !== 'undefined' ? collectionLoadCallbacks : [];

onLoadCollections = function( collectionNames, fun ) {
	collectionNames = typeof collectionNames === 'string' ? [ collectionNames ] : collectionNames;

	// remove already loaded collections from list
	loadedCollections.forEach( spliceCollectionName );

	// if they're all loaded, go
	if( !collectionNames.length ) return fun();

	return collectionLoadCallbacks.push( { fun: fun, collectionNames: collectionNames } );

	function spliceCollectionName( name ) {
		var collectionIndex = collectionNames.indexOf( name );

		if( collectionIndex > -1 ) collectionNames.splice( collectionIndex, 1 );
	}
};

collectionNames.forEach( subscribe );

function subscribe( collectionName ) {
	Meteor.subscribe( collectionName, createLoadedCallback( collectionName ) );
}

function createLoadedCallback( name ) {
	return function loadCallback() {
		loadedCollections.push( name );
		var i = 0,
				callback,
				collectionIndex;

		while( i < collectionLoadCallbacks.length ) {
			callback = collectionLoadCallbacks[ i ];

			// if this callback is waiting for this collection remove it from its wait list
			collectionIndex = callback.collectionNames.indexOf( name );
			if( collectionIndex !== -1 ) {
				callback.collectionNames.splice( collectionIndex, 1 );

				// no more items on waitlist?: execute and remove
				if( !callback.collectionNames.length ) {
					callback.fun();
					collectionLoadCallbacks.splice( i, 1 );
				} else ++i;
			} else ++i;
		}
	};
}
