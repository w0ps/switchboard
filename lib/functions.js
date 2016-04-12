collectionLoadCallbacks = typeof collectionLoadCallbacks !== 'undefined' ? collectionLoadCallbacks : [];
collectionLoadCallbacks.push( { collectionNames: [ 'users', 'roles' ], fun: connect } );

var connected = false,
    onConnectCallbacks = [];

function connect() {
  connected = true;

  while( onConnectCallbacks.length ) onConnectCallbacks.shift()();
}

isAllowedWhenConnected = function( permission, callback ) {
  if( connected ) callback( isAllowed( permission ) );
  else onConnectCallbacks.push( function() {
    callback( isAllowed( permission ) );
  } );
};

isAllowed = function( permission ) {
  if( permissions.indexOf( permission ) == -1 ) throw new Meteor.Error(
    'unknown permission',
    'permission not found: ' + permission
  );

  var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
      role = user && Roles.findOne( { name: user.role } );

  if( !user ) return;

  return role ? !!role[ permission ] : false;
};

redirectIfNotAllowed = function( permission, controller, location ) {
  isAllowedWhenConnected( permission, function( allowed ) {
    if( !allowed ) controller.redirect( location || '/' );
  } );
};

formatTime = function( date, style ) {
  style = {
    'smart': 'smart',
    'time': 'time',
    'date': 'date',
    'both': 'both'
  }[ style ] || 'smart';

  var yesterday,
      timeString, dateString;

  if( style === 'smart' ) {
    yesterday = new Date();
    yesterday.setDate( yesterday.getDate() - 1 );
  }

  if( style === 'both' || style === 'date' || style === 'smart' && date < yesterday ) {
    dateString = [
    // JF switched date & month to reflect european time format
      date.getDate(),
      date.getMonth(),
      date.getFullYear().toString().slice( 2 )
    ].join( '/' );
  }
  if( style === 'both' || style === 'time' || style === 'smart' && date > yesterday ) {
    timeString  = date.toTimeString().substring( 0, 8 );
  }

  if( dateString && timeString ) return dateString + ' ' + timeString;
  if( dateString ) return dateString;

  return timeString;
};

guessType = function( item ) {
  if( item.title ) return 'need';
  if( item.value ) return 'resource';
  return 'chatmessage';
};
