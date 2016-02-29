var helpers = {
			log: console.log.bind( console ),
			userIdToUserName: function ( userId ) {
				var user = Meteor.users.findOne( { _id: userId} );
			  return user ? user.username : user;
			},
			getAvatar: function ( userId ) {
			  var user = Meteor.users.findOne( { _id: userId } );
			  if( !user ) return;
			  return '<img class="avatar" src="' + user.avatar + '" alt="' + user.username + '" />';
			},
			formatTime: function( date ) {
				return date.toTimeString().substring( 0, 8 );
			},
			isOwner: function() {
			  return this.createdBy && this.createdBy === Meteor.userId();
			}
		};

function registerHelper( name ) {
	Template.registerHelper( name, helpers[ name ] );
}

Object.keys( helpers ).forEach( registerHelper );
