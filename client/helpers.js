var defaultPictureSrc = '/defaultpicture.jpg';

var helpers = {
      log: console.log.bind( console ),
      userIdToUserName: function ( userId ) {
        var user = Meteor.users.findOne( { _id: userId} );
        return user ? user.username : user;
      },
      getAvatar: function ( userId ) {
        var user = Meteor.users.findOne( { _id: userId } ),
            self = Meteor.userId() && Meteor.users.findOne( { _id: Meteor.userId() } ),
            pretend = self && self.pretend,
            htmlString;

        if( !user ) return;

        htmlString = [
          '<img class="avatar" src="', user.avatar || defaultPictureSrc, '" alt="', user.username, '" />'
        ].join( '' );

        /* Jf debug
        
        console.log("----getAvatar----");
        console.log(["user.videochaturl: ",user.videochaturl]);
        console.log(["user._id: ",user._id]);
        console.log(["Meteor.userId(): ",Meteor.userId()]);
        console.log(["pretend: ",pretend]);
        */

        if( user.videochaturl && user._id !== Meteor.userId() && user._id !== pretend && isAllowed ('start videochat') ) {        
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
      now: function() { return new Date(); },
      contenteditability: function() {
        var type = guessType( this );
        if(
          ( type === 'need' && isAllowed( 'edit needs' ) ) ||
          ( type === 'chatmessage' && isAllowed( 'edit chatmessages' ) ) ||
          ( type === 'resource' && isAllowed( 'edit resources' ) )
        ) return { contentEditable: true };
      }
    };

function registerHelper( name ) {
  Template.registerHelper( name, helpers[ name ] );
}

Object.keys( helpers ).forEach( registerHelper );
