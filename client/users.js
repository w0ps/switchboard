

Template.users.events( {
  'change select[name="select-role"]': selectRoleChange,
   // JF
   'keyup input[name="videochaturl"]': videochaturlChange
    // /JF
} );

function selectRoleChange( event ) {
	Meteor.call( 'setUserRole', this.username, event.target.value, function( error ) {
		console.log( error );
	} );
}


// JF
function videochaturlChange( event ) {
  var url = event.target.value;
  var userId = this._id;
  
  /*
  console.log ("---- videochaturlChange ---- ");
  console.log ("userid: ", userId);
  console.log ("videochaturl: ", url);
  */

  Meteor.call( 'setUserVideochatUrl', userId, url );
}
// /JF
