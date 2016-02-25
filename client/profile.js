Avatars = new FS.Collection( 'avatars', {
  stores: [ new FS.Store.FileSystem( 'avatars', { path: '~/avatars' } ) ]
} );

Template.profile.events( {
	'keyup input[name=username]': usernameKeyup,
	'change input[name=avatar-file]': avatarFileChange
} );

function usernameKeyup( event ) {
	event.target.classList.add( 'changed' );
	if( event.keyCode !== 13 ) return;
	var value = event.target.value;
	if( !value ) return;

	Meteor.call( 'updateUserName', value );
	event.target.classList.remove( 'changed' );
}

function avatarFileChange( event ) {
	console.log( event.target.files );

	FS.Utility.eachFile(event, function(file) {
    Avatars.insert(file, function (err, fileObj) {
    	console.log( err, fileObj );
    	console.log( { 'isInstance': fileObj instanceof FS.File });
    	window.imagefile = fileObj;
    	//Meteor.call( 'updateUserAvatar', )
      // Inserted new doc with ID fileObj._id, and kicked off the data upload using HTTP
    });
  });
}
