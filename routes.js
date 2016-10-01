Router.configure( {
    // 2016-09-29
    // layoutTemplate: "mainlayout",
    // before: setLayout
    
    layoutTemplate: "emptylayout",
    before: setLayout2
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

// JF 2016-08-23
Router.route('/register', function () { this.render('register');});
Router.route('/register2', function () { this.render('register2');});
Router.route('/register3', function () { this.render('register3');});
// /JF
// JF 2016-09-12
Router.route('/login', function () { this.render('login');});
// /JF


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

// 2016-09-29 this is not used anymore, but keeping it in the source case it needs to be reverted
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
  
  // JF 2016-08-23 
  if (this.url === '/register' || this.url === '/register2' || this.url === '/register3' || this.url === '/login') {this.layout( 'emptylayout' );}
  // / JF 2016-08-23

  this.next();
}

// 2016-09-29 to prevent the "top menu" showing by default for users with "seperate windows" before the rest is loaded, as was the case until now, which confused the mobile users
function setLayout2(){
  // this.layout is 'emptylayout' by default. change this to 'mainlayout' if user has 'separate windows' permission

  console.log (' ---- setLayout2 ---- ');

  var user = Meteor.users.findOne( { _id: Meteor.userId() } );
  
  if( !user ) { // not logged in
    
    if (this.url === '/register' || this.url === '/register2' || this.url === '/register3' || this.url === '/login') { 
      this.layout( 'emptylayout' ); 
     } else { 
         this.layout( 'mainlayout' ); 
       }
     
    this.next();
    return;
  } 
  
  // user IS logged in: 
  
  var role = Roles.findOne( { name: user.role } ) || [];

  console.log (' role[ "separate windows" ]: ',role[ 'separate windows' ]);

  if (this.url === '/register' || this.url === '/register2' || this.url === '/register3' || this.url === '/login') { 
    // this.layout( 'emptylayout' );
  } else {
  
    if(  role[ 'separate windows' ] == false ) {
 
      console.log (' User does NOT have "separate windows" permission');
      this.layout( 'mainlayout' );
     
    } else {
      console.log (' Assuming that user has "separate windows" permission, since role["separate windows"] is either true or undefined');
      // then still default to the empty layout - except for url '/', so that we can login from there
      if( this.url === '/' ) { this.layout( 'mainlayout' ); }
      }
    }
  
  
  this.next();
}
