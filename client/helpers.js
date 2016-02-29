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
				var yesterday = new Date();
				yesterday.setDate( yesterday.getDate() - 1 );

				if( date < yesterday ) return [
					date.getMonth(),
					date.getDate(),
					new Date().getFullYear().toString().slice( 2 )
				].join( '/' );

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
