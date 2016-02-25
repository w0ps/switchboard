Avatars = new FS.Collection( 'avatars', {
  stores: [ new FS.Store.FileSystem( 'avatars', { path: '~/avatars' } ) ]
} );

Avatars.allow({
	update: function () {
   // add custom authentication code here
  return true;
  },
  insert: function () {
    // add custom authentication code here
    return true;
  }
});

Meteor.methods( {
	updateUserName: function( newName ) {
		var userId = Meteor.userId();
		console.log( newName, userId );
		Meteor.users.update( { _id: userId }, { $set: { username: newName } } );
	}
} );
