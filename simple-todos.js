Tasks = new Mongo.Collection("tasks");

Needs = new Mongo.Collection( 'needs' );

ChatMessages = new Mongo.Collection( 'chatmessages' );

Responses = new Mongo.Collection( 'responses' );

function Post() {
  this.createdBy = Meteor.userId();
  this.created = new Date();
  this.responses = [];
}

function Need( need ) {
  this.title = need.title;
  this.description = need.description;
  this.created = new Date();
  this.createdBy = Meteor.userId();
  // users that get notified when something happens in this thread
  this.subscribed = [ this.createdBy ];
  this.keywords = need.keywords || [];
  // ids of response posts
  this.responses = need.responses || [];
  // other needs this need needs to be met
  this.requirements = need.requirements || [];
  this.inChat = need.inChat || [];
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

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.publish( 'needs', function() {
    return Needs.find( {} );
  } );

  Meteor.publish( 'chatmessages', function() {
    return ChatMessages.find( {} );
  } );

  Meteor.publish( 'users', function(){
    return Meteor.users.find( {}, {
      fields: { username: 1, avatar: 1 }
    } );
  } );

  Meteor.publish( 'avatars', function(){
    return Meteor.avatars.find( {} );
  } );
}

function userIdToUserName( userId ) {
  return Meteor.users.findOne( { _id: userId} ).username;
}

function formatTime( date ) {
  return date.toTimeString().substring( 0, 8 );
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Meteor.subscribe( 'needs' );

  Meteor.subscribe( 'chatmessages' );

  Meteor.subscribe( 'users' );

  Meteor.subscribe( 'avatars' );

  Template.registerHelper( 'userIdToUserName', userIdToUserName );

  Template.registerHelper( 'formatTime', formatTime );

  Template['need-detail'].helpers({
    // log: function( something ) {
    //   console.log( something, this );
    // }
  });

  Template[ 'need-detail' ].events( {
    'keyup input[name=message]': function( event ) {
      if( event.keyCode !== 13 ) return;
      var value = event.target.value;
      if( !value ) return;
      event.target.value = '';
      Meteor.call( 'addChatMessage', value, this.need()._id );
    }
  } );

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  } );
}

Meteor.methods({
  addNeed: function( need ) {
    if ( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    //need = new Need( need );

    Needs.insert( new Need( need ) );
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
