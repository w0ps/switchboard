isAllowed = function( permission ) {
	if( permissions.indexOf( permission ) == -1 ) throw new Meteor.Error(
		500,
		'unknown permission',
		'permission not found: ' + permission
	);

	var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
			role = user && Roles.findOne( { name: user.role } );

	if( !user ) return;

	return role ? role[ permission ] : false;
};
