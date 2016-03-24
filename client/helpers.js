var defaultPictureSrc = '/defaultpicture.jpg';

var helpers = {
      log: console.log.bind( console ),
      userIdToUserName: function ( userId ) {
        var user = Meteor.users.findOne( { _id: userId} );
        return user ? user.username : user;
      },
      getAvatar: function ( userId ) {
        var user = Meteor.users.findOne( { _id: userId } ),
            htmlString;
        if( !user ) return;

        htmlString = [
          '<img class="avatar" src="', user.avatar || defaultPictureSrc, '" alt="', user.username, '" />'
        ].join( '' );

        if( user.videochaturl ) {
          htmlString = '<a href="' + user.videochaturl + '" title="videochat with ' + user.username + '" >' + htmlString + '</a>';
          htmlString = [
          '<a href="', user.videochaturl, '" title="videochat with ', user.username, '">', htmlString, '</a>'
          ].join( '' );
        }

        return htmlString;
      },
      formatTime: formatTime,
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
        comparison = typeof comparison === 'string' ? comparison : '===';

        switch( comparison ) {

          case '===': return a === b;
          case '!==': return a !== b;
          case '==': return a == b;
          case '!=': return a != b;
          case '<=': return a <= b;
          case '>=': return a >= b;
          case '<': return a < b;
          case '>': return a > b;
        }

        throw( new Meteor.Error( 'illegal operator', 'compare: "' + comparison + '" is not a valid operator' ) );
      },
      keyvalues: function( object ) {
        return Object.keys( object ).map( function( key ) {
          return { key: key, value: object[ key ] };
        } );
      },
      now: function() { return new Date(); }
    };

function registerHelper( name ) {
  Template.registerHelper( name, helpers[ name ] );
}

Object.keys( helpers ).forEach( registerHelper );
