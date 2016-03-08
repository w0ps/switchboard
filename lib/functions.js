collectionLoadCallbacks = typeof collectionLoadCallbacks !== 'undefined' ? collectionLoadCallbacks : [];
collectionLoadCallbacks.push( { collectionNames: [ 'users', 'roles' ], fun: connect } )

var connected = false,
		onConnectCallbacks = [];

function connect() {
	connected = true;

	while( onConnectCallbacks.length ) onConnectCallbacks.shift()();
}

isAllowedWhenConnected = function( permission, callback ) {
	if( connected ) callback( isAllowed( permission ) );
	else onConnectCallbacks.push( function() {
		callback( isAllowed( permission ) );
	} );
};

isAllowed = function( permission ) {
	if( permissions.indexOf( permission ) == -1 ) throw new Meteor.Error(
		'unknown permission',
		'permission not found: ' + permission
	);

	var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
			role = user && Roles.findOne( { name: user.role } );

	if( !user ) return;

	return role ? !!role[ permission ] : false;
};
