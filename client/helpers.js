var defaultPictureSrc = '/defaultpicture.jpg';

var helpers = {
      log: console.log.bind( console ),
      userIdToUserName: function ( userId ) {
        var user = Meteor.users.findOne( { _id: userId} );
        return user ? user.username : user;
      },
      getAvatar: function ( userId ) {
        var user = Meteor.users.findOne( { _id: userId } );
        if( !user ) return;
        return '<img class="avatar" src="' + ( user.avatar || defaultPictureSrc ) + '" alt="' + user.username + '" />';
      },
      formatTime: function( date ) {
        var yesterday = new Date();
        yesterday.setDate( yesterday.getDate() - 1 );

        if( date < yesterday ) return [
          date.getMonth(),
          date.getDate(),
          new Date().getFullYear().toString().slice( 2 )
        ].join( '/' );

        return date.toTimeString().substring( 0, 8 );
      },
      truncate: function( string, ending, limit ) {
        limit = parseInt( limit, 10 );
        if( string.length <= limit ) return string;

        var split = string.split( ' ' ),
            newString = split.shift(),
            part = split.shift();

        while( part && newString.length + part.length + ending.length < limit ) {
          newString += ' ' + part;
          part = split.shift();
        }

        return newString + ending;
      },
      isOwner: function() {
        return this.createdBy && this.createdBy === Meteor.userId();
      },
      isAllowed: function( permission ) {
        return isAllowed( permission );
      },
      compare: function( a, b, comparison ) {
        if( comparison === '==' ) return a == b;
        if( comparison === '<' ) return a < b;
        if( comparison === '>' ) return a > b;
        if( comparison === '<=' ) return a <= b;
        if( comparison === '>=' ) return a >= b;
        if( comparison === '!=' ) return a != b;
        if( comparison === '!==' ) return a !== b;
        return a === b;
      }
    };

function registerHelper( name ) {
  Template.registerHelper( name, helpers[ name ] );
}

Object.keys( helpers ).forEach( registerHelper );
