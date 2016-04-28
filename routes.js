Router.configure( {
    layoutTemplate: "mainlayout",
    before: setLayout
} );

Router.route( '/', function(){ this.render( 'root' ); } );
Router.route( '/profile' );
Router.route( '/needs', showFeed );

Router.route( '/needscolumns', showFeed );

Router.route( '/needs/:id', showNeed );
// JF 2016-04-22
Router.route( '/needs/tagged/:id', showNeedTagged );
// /JF
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
      ( Session.get( 'openConversations' ) || [] ).forEach( leave );
      ( Session.get( 'openTagConversations' ) || [] ).forEach( leave );

      function leave( sourceId ) {
        Meteor.call( 'leaveChat', sourceId );
        Meteor.call( 'stopTyping', sourceId );
        
        Meteor.call( 'leaveTagChat', sourceId );
        Meteor.call( 'stopTypingTagChat', sourceId );

      }
    }
  }
}

/*
function showFeedColumns() {
  isAllowedWhenConnected( 'separate windows', bindBeforeUnload );

  return this.render( 'needscolumns' );

  function bindBeforeUnload( separateWindowsAllowed ) {
    if( !separateWindowsAllowed ) window.onbeforeunload = beforeUnloadFeed;

    function beforeUnloadFeed() {
      ( Session.get( 'openConversations' ) || [] ).forEach( leave );
      ( Session.get( 'openTagConversations' ) || [] ).forEach( leave );

      function leave( sourceId ) {
        Meteor.call( 'leaveChat', sourceId );
        Meteor.call( 'stopTyping', sourceId );
        
        Meteor.call( 'leaveTagChat', sourceId );
        Meteor.call( 'stopTypingTagChat', sourceId );

      }
    }
  }
}
*/


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

// JF 2016-04-22
function showNeedTagged() {
  var id = this.params.id;
  Meteor.call( 'joinTagChat', id );

  window.onbeforeunload = beforeUnloadNeedDetail.bind( this );

  return this.render( 'tag-need-detail', {
    data: {
      need: function() {
        return Needs.findOne( { _id: id } );
      },
      conversationId: id
    }
  } );

  function beforeUnloadNeedDetail() {
    Meteor.call( 'leaveTagChat', this.params.id );
    Meteor.call( 'stopTypingTagChat', this.params.id );
  }
}
// /JF


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
          var need;

          snapshot.timeline = [];

          Needs.find( { snapshot: snapshot._id } ).forEach( addNeedAndItsChatsAndResourcesToTimeline );

          Resources.find( { snapshot: snapshot._id, sourceId: { $exists: false } } ).forEach( addResourceToTimeline );

          if( typeof snapshot._id === 'object' ) delete snapshot._id;

          snapshot.timeline.sort( sortByDate );

          return snapshots.push( snapshot );

          function addNeedAndItsChatsAndResourcesToTimeline( need ) {
            addEntityToTimeline( 'need', need );

            ChatMessages.find( { sourceId: need._id }, { sort: { created: 1 } } ).forEach( addChatmessageToTimeline );
            Resources.find( { sourceId: need._id }, { sort: { created: 1 } } ).forEach( addResourceToTimeline );

            function addChatmessageToTimeline( chatmessage, index ) {
              if( !index ) {
                if( chatmessage.text === need.title ) return;
              }

              chatmessage.need = need;
              addEntityToTimeline( 'chatmessage', chatmessage );
            }
          }

          function addResourceToTimeline( resource ) {
            if( need ) resource.need = need;
            addEntityToTimeline( 'resource', resource );
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
    this.url === '/needscolumns' ||
    // JF 2016-04-22
    this.url === '/needs/tagged' ||
    this.route.getName() === 'needs.tagged.:id' ||
    // /JF
    
    this.route.getName() === 'needs.:id'
  ) && isAllowed( 'separate windows' ) ) {
    this.layout( 'emptylayout' );
  }

  this.next();
}
