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
  'edit snapshots',
  'pretend',
  'separate windows'
];

Meteor.methods({
  addNeed: function( title ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        userId = user.pretend || user._id;

    if( !isAllowed( 'post needs' ) ) throw new Meteor.Error( 'not-authorized' );

    var need = new Need( { title: title, createdBy: userId } ),
        nId = Needs.insert( need );

    Meteor.call( 'addChatMessage', { text: need.title, sourceId: nId } );
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
  addChatMessage: function( options ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );
    if ( !isAllowed( 'post chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.insert( new ChatMessage( { text: options.text, sourceId: options.sourceId, createdBy: user.pretend || user._id } ) );
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
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $addToSet: { inChat: user ? user.pretend || user._id : Meteor.userId() }
    } );
  },
  leaveChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $pull: { inChat: user.pretend || user._id }
    } );
  },
  startTyping: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $addToSet: { writingMessage: user.pretend || user._id }
    } );
  },
  stopTyping: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $pull: { writingMessage: user.pretend || user._id }
    } );
  },
  leave: function() {
    Session.get( 'openConversations' ).forEach( leave );

    function leave( sourceId ) {
      Meteor.call( 'leaveChat', sourceId );
      Meteor.call( 'stopTyping', sourceId );
    }
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
  },
  pretend: function( username ) {
    if( !isAllowed( 'pretend' ) ) return new Meteor.Error( 'not-authorized' );

    var ownUserId = Meteor.userId(),
        user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        otherUserId = Meteor.users.findOne( { username: username } )._id,
        update = otherUserId === ownUserId ? { $unset: { pretend: true } } : { $set: { pretend: otherUserId } },
        previousUserId = user.pretend || ownUserId;

    Meteor.users.update( { _id: ownUserId }, update );

    arrayReplaceUpdate( Needs, 'inChat', previousUserId, otherUserId );
    arrayReplaceUpdate( Needs, 'writingMessage', previousUserId, otherUserId );
  }
} );

// to circumvent mongodb issue where you cannot push and pull to the same array in 1 update
// http://stackoverflow.com/questions/9823140/multiple-mongo-update-operator-in-a-single-statement
function arrayReplaceUpdate( collection, key, originalValue, newValue ) {
  var tempKey = key + 'Temp',
      tempKeyPart = {},
      originalQuery = {},
      secondQuery = tempKeyPart,
      update1 = { $pull: {}, $set: tempKeyPart },
      update2 = { $push: {}, $unset: tempKeyPart };

  originalQuery[ key ] = originalValue;
  update1.$pull[ key ] = originalValue;
  tempKeyPart[ tempKey ] = newValue;
  update2.$push[ key ] = newValue;

  collection.update( originalQuery, update1, { multi: true } );
  collection.update( secondQuery, update2, { multi: true} );
}

function Need( options ) {
  this.title = options.title;

  this.created = new Date();
  this.createdBy = options.createdBy || Meteor.userId();

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

function ChatMessage( options ) {
  this.text = options.text;
  this.created = new Date();
  this.createdBy = options.createdBy || Meteor.userId();
  this.sourceId = options.sourceId;
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
