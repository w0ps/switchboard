Needs = new Mongo.Collection( 'needs' );

ChatMessages = new Mongo.Collection( 'chatmessages' );

Responses = new Mongo.Collection( 'responses' );

Meteor.methods({
  addNeed: function( title ) {
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
  }
});

function Post() {
  this.createdBy = Meteor.userId();
  this.created = new Date();
  this.responses = [];
}

function Need( need ) {
  this.title = need.title;

  this.created = new Date();
  this.createdBy = Meteor.userId();

  this.updated = new Date( this.created );

  // users that get notified when something happens in this thread
  this.subscribed = [ this.createdBy ];
  this.keywords = need.keywords || [];
  // ids of response posts
  this.responses = need.responses || [];
  // other needs this need needs to be met
  this.requirements = need.requirements || [];
  this.inChat = need.inChat || [];
  this.writingMessage = needs.writingMessage || [];
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
