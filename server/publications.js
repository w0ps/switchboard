var publications = {
      needs: function() { return Needs.find( {} ); },
      chatmessages: function() { return ChatMessages.find( {} ); },
      users: function() {
        return Meteor.users.find( {}, {
          fields: { username: 1, avatar: 1, role: 1 }
        } );
      },
      roles: function() {
        return Roles.find( {} );
      }
    };

function publish( name ) {
  Meteor.publish( name, publications[ name ] );
}

Object.keys( publications ).forEach( publish );
