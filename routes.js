Router.route( '/', function(){ this.render( 'root' ); } );
Router.route( '/needs' );
Router.route( '/profile' );
Router.route( '/needs/:id', showNeed );


function beforeUnLoad( event ) {
	Meteor.call( 'leaveChat', this.params.id );
  Meteor.call( 'stopTyping', this.params.id );
}

function showNeed() {
  var id = this.params.id;
  Meteor.call( 'joinChat', id );

  window.onbeforeunload = beforeUnLoad.bind( this );

  this.render( 'need-detail', {
    data: {
      need: function() {
        return Needs.findOne( { _id: id } );
      },
      conversation: function() {
        return getConversation( id );
      }
    }
  } );
}

function getConversation( id ) {
  var messages = ChatMessages.find( { sourceId: id } ),
      conversation = [];

  messages.forEach( function( message, i ) {
    var previousSpeakingTurn = i && conversation[ conversation.length - 1 ],
        previousStreak = i && previousSpeakingTurn.streaks[ previousSpeakingTurn.streaks.length - 1 ],
        previousLine = i && previousStreak.lines[ previousStreak.lines.length - 1 ],
        newStreak = {
          createdBy: message.createdBy,
          created: message.created,
          lines: [ message ]
        };

    if( !i || previousSpeakingTurn.createdBy !== message.createdBy ) {
      return conversation.push( {
        createdBy: message.createdBy,
        streaks: [ newStreak ]
      } );
    }

    if( message.created.getTime() - previousLine.created.getTime() > 60 * 1000 ) {
      return previousSpeakingTurn.streaks.push( newStreak );
    }

    previousStreak.lines.push( message );
    previousStreak.created = message.created;
  } );

  return conversation;
}
