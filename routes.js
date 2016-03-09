Router.route( '/', function(){ this.render( 'root' ); } );
Router.route( '/needs' );
Router.route( '/profile' );
Router.route( '/needs/:id', showNeed );
Router.route( '/roles', showRoles );
Router.route( '/users', showUsers );
Router.route( '/snapshots', showSnapshots );

function beforeUnLoad( event ) {
	Meteor.call( 'leaveChat', this.params.id );
  Meteor.call( 'stopTyping', this.params.id );
}

function showNeed() {
  var id = this.params.id;
  Meteor.call( 'joinChat', id );

  window.onbeforeunload = beforeUnLoad.bind( this );

  this.render( 'need-detail', {
    data: {
      need: function() {
        return Needs.findOne( { _id: id } );
      },
      conversation: function() {
        return getConversation( id );
      }
    }
  } );
}

function showRoles() {
  redirectIfNotAllowed( 'edit roles', this );

  this.render( 'roles', {
    data: {
      roles: function() {
        var roles = [];

        Roles.find( {} ).forEach( addUserCount );
        
        return roles;

        function addUserCount( role ) {
          role.userCount = Meteor.users.find( { role: role.name } ).count();
          roles.push( role );
        }
      },
      permissions: permissions
    }
  } );
}

function showUsers() {
  redirectIfNotAllowed( 'edit users', this );

  this.render( 'users', {
    data: {
      usersByRole: function() {
        var allUsers = Meteor.users.find( {} ),
            roles = Roles.find( {} ),
            rolesByName = {},
            usersByRole = { 'no role': [] },
            usersByRoleArray = [];

        roles.forEach( addInfo );

        allUsers.forEach( placeUserInList );

        populateUsersByRoleArray( 'no role' );
        
        Object.keys( rolesByName ).forEach( populateUsersByRoleArray );

        return usersByRoleArray;

        function addInfo( role ) {
          var totalPermissions = 0;

          permissions.forEach( function( permission ) {
            if( role[ permission ] ) ++totalPermissions;
          } );

          role.usersInRole = Meteor.users.find( {
            role: role.name
          } ).count();

          role.totalPermissions = totalPermissions;

          rolesByName[ role.name ] = role;
        }

        function placeUserInList( user ) {
          var selectableRoles = Object.keys( rolesByName ),
              list;

          if( !user.role ) {
            list = usersByRole[ 'no role' ];
          } else {
            list = usersByRole[ user.role ] = usersByRole[ user.role ] || [];
            selectableRoles.splice( selectableRoles.indexOf( user.role ), 1 );
          }

          list.push( user );
          user.selectableRoles = selectableRoles;
        }

        function populateUsersByRoleArray( name ) {
          usersByRoleArray.push( {
            role: rolesByName[ name ] || { name: name },
            users: usersByRole[ name ] || []
          } );
        }
      }
    }
  } );
}

function showSnapshots() {
  redirectIfNotAllowed( 'edit snapshots', this );
  
  this.render( 'snapshots', {
    data: {
      snapshots: function() {
        var snapshots = [];
        
        addSnapshot( { name: 'current content', _id: { $exists: false } } );
        Snapshots.find( {} ).forEach( addSnapshot );
        
        return snapshots;

        function addSnapshot( snapshot ) {
          snapshot.timeline = [];

          Needs.find( { snapshot: snapshot._id } ).forEach( addNeedAndItsChatsToTimeline );

          if( typeof snapshot._id === 'object' ) delete snapshot._id;

          snapshot.timeline.sort( sortByDate );

          return snapshots.push( snapshot );

          function addNeedAndItsChatsToTimeline( need ) {
            addEntityToTimeline( 'need', need );

            return ChatMessages.find( { sourceId: need._id } ).forEach( addChatmessageToTimeline );

            function addChatmessageToTimeline( chatmessage ) {
              chatmessage.need = need;
              addEntityToTimeline( 'chatmessage', chatmessage );
            }
          }

          function addEntityToTimeline( entityType, entity ) {
            entity.type = entityType;
            snapshot.timeline.push( entity );
          }

          function sortByDate( a, b ) {
            return a.created > b.created ? 1 : -1;
          }
        }
      }
    }
  } );
}

function getConversation( id ) {
  var messages = ChatMessages.find( { sourceId: id } ),
      conversation = [];

  messages.forEach( function( message, i ) {
    var previousSpeakingTurn = i && conversation[ conversation.length - 1 ],
        previousStreak = i && previousSpeakingTurn.streaks[ previousSpeakingTurn.streaks.length - 1 ],
        previousLine = i && previousStreak.lines[ previousStreak.lines.length - 1 ],
        newStreak = {
          createdBy: message.createdBy,
          created: message.created,
          lines: [ message ]
        };

    if( !i || previousSpeakingTurn.createdBy !== message.createdBy ) {
      return conversation.push( {
        createdBy: message.createdBy,
        streaks: [ newStreak ]
      } );
    }

    if( message.created.getTime() - previousLine.created.getTime() > 60 * 1000 ) {
      return previousSpeakingTurn.streaks.push( newStreak );
    }

    previousStreak.lines.push( message );
    previousStreak.created = message.created;
  } );

  return conversation;
}
