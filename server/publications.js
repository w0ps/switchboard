var publications = {
      needs: function() { return Needs.find( {} ); },
      chatmessages: function() { return ChatMessages.find( {} ); },
      users: function() {
        return Meteor.users.find( {}, {
          fields: { username: 1, avatar: 1, role: 1, pretend: 1, videochaturl: 1 }
        } );
      },
      roles: function() {
        return Roles.find( {} );
      },
      snapshots: function() {
        return Snapshots.find( {} );
      },
      resources: function(){
        return Resources.find( {} );
      }
    };

function publish( name ) {
  Meteor.publish( name, publications[ name ] );
}

Object.keys( publications ).forEach( publish );
