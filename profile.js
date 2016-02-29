var resizeAvatar = function( fileObj, readStream, writeStream ) {
  // Transform the image into a 10x10px thumbnail
  gm( readStream, fileObj.name() ).resize( '50', '50', "!" ).stream().pipe( writeStream );
};

Avatars = new FS.Collection( 'avatars', {
  stores: [ new FS.Store.FileSystem( 'avatars', { transformWrite: resizeAvatar } ) ],
  filter: { allow: { contentTypes: [ 'image/*' ] } }
} );

if( Meteor.isServer ) {
  Meteor.publish( 'avatars', function(){
    return Avatars.find( {} );
  } );

  Avatars.allow({
    update: function () {
     // add custom authentication code here
    return true;
    },
    insert: function () {
      // add custom authentication code here
      return true;
    },
    download: function(userId, fileObj) {
      return true;
    }
  });

  Meteor.methods( {
    updateUserName: function( newName ) {
      Meteor.users.update( { _id: Meteor.userId() }, { $set: { username: newName } } );
    },
    updateAvatar: function( url ) {
      Meteor.users.update( { _id: Meteor.userId() }, { $set: { avatar: url } } );
    }
  } );

} else {
  Meteor.subscribe( 'avatars' );

  Template.profile.events( {
    'keyup input[name=username]': usernameKeyup,
    'change input[name=avatar-file]': avatarFileChange
  } );
}

function usernameKeyup( event ) {
  event.target.classList.add( 'changed' );
  if( event.keyCode !== 13 ) return;
  var value = event.target.value;
  if( !value ) return;

  Meteor.call( 'updateUserName', value );
  event.target.classList.remove( 'changed' );
}

function avatarFileChange( event ) {
  FS.Utility.eachFile(event, function(file) {
    Avatars.insert(file, updateAvatar );
  });
}

function updateAvatar(err, fileObj) {
  
  // this is a bit of a hack because url is undefined at first
  ( function getUrl(){
    var url = fileObj.url();
    if( !url ) return setTimeout( getUrl, 10 );

    Meteor.call( 'updateAvatar', url.split( '?' )[ 0 ] );
  } )();
}
