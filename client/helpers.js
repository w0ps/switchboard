Template.registerHelper( 'userIdToUserName', userIdToUserName );

Template.registerHelper( 'getAvatar', getAvatar );

Template.registerHelper( 'formatTime', formatTime );

Template.registerHelper( 'log', console.log.bind( console ) );

Template.registerHelper( 'isOwner', isOwner );

function userIdToUserName( userId ) {
  return Meteor.users.findOne( { _id: userId} ).username;
}

function getAvatar( userId ) {
  var user = Meteor.users.findOne( { _id: userId } );
  return '<img src="' + user.avatar + '" alt="' + user.username + '" />';
}

function formatTime( date ) {
  return date.toTimeString().substring( 0, 8 );
}

function isOwner() {
  return this.createdBy && this.createdBy === Meteor.userId();
}
