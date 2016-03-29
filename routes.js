Router.configure( {
    layoutTemplate: "mainlayout",
    before: setLayout
} );

Router.route( '/', function(){ this.render( 'root' ); } );
Router.route( '/profile' );
Router.route( '/needs', showFeed );
Router.route( '/needs/:id', showNeed );
Router.route( '/roles', showRoles );
Router.route( '/users', showUsers );
Router.route( '/snapshots', showSnapshots );
Router.route( '/pretend', showPretend );

function showFeed() {
  isAllowedWhenConnected( 'separate windows', bindBeforeUnload );

  return this.render( 'needs' );

  function bindBeforeUnload( separateWindowsAllowed ) {
    if( !separateWindowsAllowed ) window.onbeforeunload = beforeUnloadFeed;

    function beforeUnloadFeed() {
      Session.get( 'openConversations' ).forEach( leave );

      function leave( sourceId ) {
        Meteor.call( 'leaveChat', sourceId );
        Meteor.call( 'stopTyping', sourceId );
      }
    }
  }
}

function showNeed() {
  var id = this.params.id;
  Meteor.call( 'joinChat', id );

  window.onbeforeunload = beforeUnloadNeedDetail.bind( this );

  return this.render( 'need-detail', {
    data: {
      need: function() {
        return Needs.findOne( { _id: id } );
      },
      conversationId: id
    }
  } );

  function beforeUnloadNeedDetail() {
    Meteor.call( 'leaveChat', this.params.id );
    Meteor.call( 'stopTyping', this.params.id );
  }
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

            return ChatMessages.find( { sourceId: need._id }, { sort: { created: 1 } } ).forEach( addChatmessageToTimeline );

            function addChatmessageToTimeline( chatmessage, index ) {
              if( !index ) {
                if( chatmessage.text === need.title ) return;
              }

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

function showPretend() {
  redirectIfNotAllowed( 'pretend', this );
  this.render( 'pretend', { data: {
    users: function() {
      return Meteor.users.find( {} );
    },
    pretendingAs: function() {
      var user = Meteor.users.findOne( { _id: Meteor.userId() } );

      if( user && user.pretend ) return Meteor.users.findOne( { _id: user.pretend } );
    }
  } } );
}

function setLayout(){
  if( (
    this.url === '/needs' ||
    this.route.getName() === 'needs.:id'
  ) && isAllowed( 'separate windows' ) ) {
    this.layout( 'emptylayout' );
  }

  this.next();
}
