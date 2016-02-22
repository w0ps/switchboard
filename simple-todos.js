Tasks = new Mongo.Collection("tasks");

Needs = new Mongo.Collection( 'needs' );

ChatMessages = new Mongo.Collection( 'chatmessages' );

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
}

function ChatMessage( text, sourceId ) {
  this.text = text;
  this.created = new Date();
  this.createdBy = Meteor.userId();
  this.sourceId = sourceId;
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
}

Router.route( '/', function(){
  this.render( 'root' );
} );

Router.route( '/needs' );

Router.route( '/needs/:id', function() {
  var id = this.params.id;
  this.render( 'need-detail', {
    data: {
      need: function() {
        return Needs.findOne( { _id: id } );
      },
      chatmessages: function() {
          return ChatMessages.find( { sourceId: id } );
      }
    }
  } );
} );

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Meteor.subscribe( 'needs' );

  Meteor.subscribe( 'chatmessages' );

  Meteor.subscribe( 'users' );

  Template.registerHelper( 'userIdToUserName', userIdToUserName );

  function userIdToUserName( userId ) {
    console.log( this, arguments );
    return Meteor.users.findOne( { _id: userId} ).username;
    return 'a name';
  }

  Template.needs.helpers({
    needs: function() {
      return Needs.find( {} );
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    },
    log: function( something ) {
      console.log( something );
    }
  });

  Template['need-detail'].helpers({
    log: function( something ) {
      console.log( something, this );
    }
  });

  Template.needs.events( {
    "keyup input[name=need]": function( event ) {
      if( event.keyCode !== 13 ) return;
      var value = event.target.value, split, description;
      if( !value ) return;
      event.target.value = '';
      if( ( split = value.split( '-' ) ).length > 1 ) {
        value = split[ 0 ];
        description = split[ 1 ];
      }

      Meteor.call( 'addNeed', { title: value, description: description } );
    }
  } );

  // Template.task.helpers({
  //   isOwner: function () {
  //     return this.owner === Meteor.userId();
  //   }
  // });

  // Template.task.events({
  //   "click .toggle-checked": function () {
  //     // Set the checked property to the opposite of its current value
  //     Meteor.call("setChecked", this._id, ! this.checked);
  //   },
  //   "click .delete": function () {
  //     Meteor.call("deleteTask", this._id);
  //   },
  //   "click .toggle-private": function () {
  //     Meteor.call("setPrivate", this._id, ! this.private);
  //   }
  // });
  
  Template.need.events( {
    'click button.delete': function( event ) {
      Meteor.call( 'deleteNeed', this._id );
    }
  } );

  Template[ 'need-detail' ].events( {
    'keyup input[name=message]': function( event ) {
      if( event.keyCode !== 13 ) return;
      var value = event.target.value;
      if( !value ) return;
      event.target.value = '';
      console.log( 'creating chat message:', value, this.need()._id );
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
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});
