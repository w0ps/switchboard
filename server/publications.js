var publications = {
      needs: function() { return Needs.find( {} ); },
      chatmessages: function() { return ChatMessages.find( {} ); },
      tagchatmessages: function() { return TagChatMessages.find( {} ); },

      // JF 2016-08-22
      tagchatrooms: function() {                // ensure that title is unique, i.e. prevent "duplicate" chatrooms
                                    TagChatRooms._ensureIndex( {title:1}, {unique:true} );
                                    return TagChatRooms.find( {} ); },
      // /JF

      users: function() {
        return Meteor.users.find( {}, {
          fields: { username: 1, avatar: 1, role: 1, pretend: 1, email: 1, videochaturl: 1 }
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


// JF 2016-08-23 
// When a new user is created, set its role to 'audience' by default
Accounts.onCreateUser(function(options, user) {

    console.log("---- /server/publications - Accounts.onCreateUser -- user.username:"+user.username);

    user.role = 'audience';
    
  return user;
});
