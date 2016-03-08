Needs = new Mongo.Collection( 'needs' );

ChatMessages = new Mongo.Collection( 'chatmessages' );

Responses = new Mongo.Collection( 'responses' );

Roles = new Mongo.Collection( 'roles' );

permissions = [
  'post chatmessages',
  'post needs',
  'post responses',
  'edit roles',
  'edit users',
  'edit needs',
  'edit chatmessages',
  // 'multiuser',
  // 'chatroom',
  // 'separate windows' ?
];

Meteor.methods({
  addNeed: function( title ) {
    console.log( 'addneed called', title);
    if ( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    var need = new Need( { title: title } ),
        nId = Needs.insert( need );

    Meteor.call( 'addChatMessage', need.title, nId );
  },
  updateNeed: function( needId, updateData ) {
    if( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: updateData } );
  },
  deleteNeed: function( needId ) {
    if ( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    Needs.remove( needId );
  },
  addChatMessage: function( text, sourceId ) {
    if ( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.insert( new ChatMessage( text, sourceId ) );
  },
  joinChat: function( id ) {
    Needs.update( { _id: id }, {
      $addToSet: { inChat: Meteor.userId() }
    } );
  },
  leaveChat: function( id ) {
    Needs.update( { _id: id }, {
      $pull: { inChat: Meteor.userId() }
    } );
  },
  startTyping: function( id ) {
    Needs.update( { _id: id }, {
      $addToSet: { writingMessage: Meteor.userId() }
    } );
  },
  stopTyping: function( id ) {
    Needs.update( { _id: id }, {
      $pull: { writingMessage: Meteor.userId() }
    } );
  },
  updateRole: function( name, incomingPermissions ) {
    incomingPermissions = incomingPermissions || {};
    
    if( !isAllowed( 'edit roles' ) ) {
      throw( new Meteor.Error( 503, 'not allowed', 'you are not allowed to edit roles' ) );
    }

    var instructions = {
          $set: {
            name: name,
            updated: new Date(),
            updatedBy: Meteor.userId()
          }
        },
        target = instructions.$set;
    
    Object.keys( incomingPermissions ).forEach( receivePermission );

    Roles.update( { name: name }, instructions, { upsert: true } );

    function receivePermission( key ) {
      if( permissions.indexOf( key ) > -1 ) target[ key ] = !!incomingPermissions[ key ];
    }
  },
  deleteRole: function( name ) {

    // check if role is in use, then don't delete
    var count = Meteor.users.find( { role: name } ).count();

    if ( count ) {
      throw( new Meteor.Error(
        403,
        'role is used',
        'the role ' + name + ' is currently assigned to ' + count + ' users'
      ) );
    }

    Roles.remove( {
      name: name
    } );
  },
  setUserRole: function( username, role ) {
    Meteor.users.update( { username: username }, { $set: {
      role: role
    } } );
  }
});

function Post() {
  this.createdBy = Meteor.userId();
  this.created = new Date();
  this.responses = [];
}

function Need( options ) {
  this.title = options.title;

  this.created = new Date();
  this.createdBy = Meteor.userId();

  this.updated = new Date( this.created );

  // users that get notified when something happens in this thread
  this.subscribed = [ this.createdBy ];
  this.keywords = options.keywords || [];
  // ids of response posts
  this.responses = options.responses || [];
  // other needs this need needs to be met
  this.requirements = options.requirements || [];
  this.inChat = options.inChat || [];
  this.writingMessage = options.writingMessage || [];
}

function ChatMessage( text, sourceId ) {
  this.text = text;
  this.created = new Date();
  this.createdBy = Meteor.userId();
  this.sourceId = sourceId;
}

function Response( text, sourceId ) {
  this.text = text;
  this.created = new Date();
  this.createdBy = Meteor.userId();
  this.sourceId = sourceId;
  this.responses = [];
}
