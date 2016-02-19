Tasks = new Mongo.Collection("tasks");

Needs = new Mongo.Collection( 'needs' );

function Post() {
  this.createdBy = Meteor.userId();
  this.created = new Date();
  this.responses = [];
}

function Need( need ) {
  this.title = need.title;
  this.description = need.description;
  this.createdBy = Meteor.userId();
  // users that get notified when something happens in this thread
  this.subscribed = [ this.createdBy ];
  this.keywords = need.keywords || [];
  // ids of response posts
  this.responses = need.responses || [];
  // other needs this need needs to be met
  this.requirements = need.requirements || [];
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
}

Router.route( '/needs', function() {
  console.log( 'rendering needs' );
  this.render( 'needs' );
} );


if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Meteor.subscribe( 'needs' );

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    needs: function() {
      return Needs.find( {} );
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";
    },
    "submit .new-need": function( event ) {
      event.preventDefault();

      var title = event.target.title.value,
          description = event.target.description.value;

      Meteor.call( 'addNeed', { title: title, description: description } );
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

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
    // 'click input[type="submit"]': function() {

    // }
  } );

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
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
  addNeed: function( need ) {
    if ( !Meteor.userId() ) throw new Meteor.Error( 'not-authorized' );

    //need = new Need( need );

    Needs.insert( new Need( need ) );
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
