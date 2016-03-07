Template.users.events( {
	'change select[name="select-role"]': selectRoleChange
} );

function selectRoleChange( event ) {
	Meteor.call( 'setUserRole', this.username, event.target.value, function( error ) {
		console.log( error );
	} );
}
