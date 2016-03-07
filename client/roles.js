Template.roles.events( {
	'keyup input[name="new-role"]': newRoleKeyup,
	'click button.delete': clickDeleteRole,
	'change #roles tbody input[type="checkbox"]': clickPermission
} );

function newRoleKeyup( event ) {
	var value = getValueIfReturnKey( event, true ); // clear = true
	if( !value ) return;

	Meteor.call( 'updateRole', value );
}

function clickDeleteRole( event ) {
	Meteor.call( 'deleteRole', this.name, function( error ) {
		if( error ) alert( 'Error: ' + error.reason + ',\n' + error.details );
	} );
}

function clickPermission( event ) {
	var permissionName = this.name,
			instruction = {},
			roleName;

	roleName = event.target.parentNode.parentNode.dataset.name;

	instruction[ permissionName ] = event.target.checked;

	Meteor.call( 'updateRole', roleName, instruction );
}

Template.roles.helpers( {
	'permissionsforrole': function() {
		var role = this,
				arr = [];

		permissions.forEach( function( permission ) {
			var item = { name: permission };
			if( role[ permission ] ) item.enabled = true;
			arr.push( item );
		} );

		return arr;
	}
} );
