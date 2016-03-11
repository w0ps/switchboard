Needs = new Mongo.Collection( 'needs' );

ChatMessages = new Mongo.Collection( 'chatmessages' );

Responses = new Mongo.Collection( 'responses' );

Roles = new Mongo.Collection( 'roles' );

Snapshots = new Mongo.Collection( 'snapshots' );

permissions = [
  'post needs',
  'post chatmessages',
  'post responses',
  'edit roles',
  'edit users',
  'edit needs',
  'edit chatmessages',
  'edit snapshots'
  // 'multiuser',
  // 'chatroom',
  // 'separate windows' ?
];

Meteor.methods({
  addNeed: function( title ) {
    if ( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    var need = new Need( { title: title } ),
        nId = Needs.insert( need );

    Meteor.call( 'addChatMessage', need.title, nId );
  },
  deleteNeed: function( needId ) {
    if ( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.remove( needId );
    ChatMessages.remove( { sourceId: needId } );
  },
  changeNeedOwner: function( needId, newOwnerId ) {
    if( !isAllowed( 'edit needs') ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: { createdBy: newOwnerId } } );
    ChatMessages.update( { sourceId: needId }, { $set: { createdBy: newOwnerId } } );
  },
  changeNeedTitle: function( needId, title ) {
    if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: { title: title } } );
  },
  changeNeedCreated: function( needId, created ) {
    if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: { created: created } } );
    ChatMessages.update( { sourceId: needId }, { $set: { created: created } } );
  },
  addChatMessage: function( text, sourceId ) {
    if ( !isAllowed( 'post chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.insert( new ChatMessage( text, sourceId ) );
  },
  deleteChatMessage: function( chatmessageId ) {
    if( !isAllowed( 'edit chatmessages' ) ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.remove( { _id: chatmessageId } );
  },
  changeChatMessageOwner: function( chatmessageId, newOwnerId ) {
    if( !isAllowed( 'edit chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.update( { _id: chatmessageId }, { $set: { createdBy: newOwnerId } } );
  },
  'changeChatMessageText': function( chatmessageId, text ) {
    if( !isAllowed( 'edit chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.update( { _id: chatmessageId }, { $set: { text: text } } );
  },
  changeChatMessageCreated: function( chatmessageId, created ) {
    if( !isAllowed( 'edit chatmessages' ) ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.update( { _id: chatmessageId }, { $set: { created: created } } );
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
      throw( new Meteor.Error( 'not allowed', 'you are not allowed to edit roles' ) );
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
  },
  copyToSnapshot: function( name, source ) {
    var snapshot = new Snapshot( name ),
        needQuery = {},
        snapshotId;

    Snapshots.update( { name: name }, { $set: snapshot }, { upsert: true } );

    snapshotId = Snapshots.findOne( { name: name } )._id;

    // copy needs
    if( source ) needQuery.snapshot = source;
    else needQuery.snapshot = { $exists: false };

    return Needs.find( needQuery ).forEach( copyNeed );

    function copyNeed( need ) {
      var oldNeedId = need._id;

      delete need._id;
      need.snapshot = snapshotId;

      Needs.insert( need, copyChatMessages );

      function copyChatMessages( err, _id ) {
        ChatMessages.find( { sourceId: oldNeedId } ).forEach( copyChatMessage );

        function copyChatMessage( chatmessage ) {
          delete chatmessage._id;
          chatmessage.sourceId = _id;

          ChatMessages.insert( chatmessage );
        }
      }
    }
  },
  loadSnapshot: function( name ) {
    if( name === 'current content' ) return;

    var snapshotId = Snapshots.findOne( { name: name } )._id;

    return Needs.find( { snapshot: snapshotId } ).forEach( copyNeed );

    function copyNeed( need ) {
      var oldNeedId = need._id;

      delete need._id;
      delete need.snapshot;

      return Needs.insert( need, copyChatMessages );

      function copyChatMessages( err, _id ) {
        return ChatMessages.find( { sourceId : oldNeedId } ).forEach( copyChatmessage );

        function copyChatmessage( chatmessage ) {
          delete chatmessage._id;
          chatmessage.sourceId = _id;

          ChatMessages.insert( chatmessage );
        }
      }
    }
  },
  deleteSnapshot: function( name ) {
    var query = {},
        fields = {
          _id: true
        },
        sourceIds = [];

    if( name === 'current content' ) {
      query.snapshot = { $exists: false };
    } else query.snapshot = Snapshots.findOne( { name: name } )._id;

    Needs.find( query ).forEach( getId );
    Needs.remove( query );
    ChatMessages.remove( { sourceId : { $in: sourceIds } } );

    if( name !== 'current content' ) Snapshots.remove( { name: name } );

    function getId( need ) {
      sourceIds.push( need._id );
    }
  },
  timeOffsetSnapshot: function( name, offsetAndUnit ) {
    var needQuery = {},
        split = offsetAndUnit.split( ' ' ),
        offset = parseInt( split.shift(), 10 ),
        unit = split.shift();

    if( name === 'current content' ) needQuery.snapshot = { $exists: false };
    else needQuery.snapshot = Snapshots.findOne( { name: name } )._id;

    Needs.find( needQuery ).forEach( updateNeedAndChatMessages );

    function updateNeedAndChatMessages( need ) {
      Needs.update( { _id: need._id }, { $set: { created: offsetDate( need.created ) } } );
      ChatMessages.find( { sourceId: need._id } ).forEach( updateChatMessage );
    }

    function updateChatMessage( chatmessage ) {
      ChatMessages.update( { _id: chatmessage._id }, { $set: { created: offsetDate( chatmessage.created ) } } );
    }

    function offsetDate( date ) {
      var newDate = new Date( date );

      switch( unit ) {
        case 'Y': newDate.setFullYear( date.getFullYear() + offset ); break;
        case 'M': newDate.setMonth( date.getMonth() + offset ); break;
        case 'W': newDate.setDate( date.getDate() + offset * 7 ); break;
        case 'D': newDate.setDate( date.getDate() + offset ); break;
        case 'h': newDate.setHours( date.getHours() + offset ); break;
        case 'm': newDate.setMinutes( date.getMinutes() + offset ); break;
        case 's': newDate.setSeconds( date.getSeconds() + offset ); break;
      }

      return newDate;
    }
  }
} );

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

function Snapshot( name ) {
  this.name = name;
  this.created = new Date();
  this.createdBy = Meteor.userId();
}
