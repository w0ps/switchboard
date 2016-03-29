var isWriting;

Template.chat.events( {
  'keyup textarea[name=message]': function( event ) {
    var sourceId = this._id,
        target = event.target,
        currentHeight = parseInt( style = window.getComputedStyle( target ).height, 10 ),
        scrollHeight = target.scrollHeight;

    if( scrollHeight > currentHeight ) {
      target.style.height = scrollHeight + 'px';
    }

    if( !isWriting && event.keyCode !== 13 && event.target.value ) {
      isWriting = true;
      Meteor.call( 'startTyping', sourceId );
      return;
    }

    if( isWriting && !event.target.value ) {
      isWriting = false;
      Meteor.call( 'stopTyping', sourceId );
      return;
    }

    var value = getValueIfReturnKey( event, true );

    if( !value ) return;

    target.style.height = '25px';

    isWriting = false;
    Meteor.call( 'stopTyping', sourceId );
    Meteor.call( 'addChatMessage', { text: value, sourceId: sourceId } );
  }
} );

Template.chat.helpers( {
  getConversation: getConversation,
	whose: function() {
		return this.createdBy === Meteor.userId() ? ' mine' : '';
	}
} );

scrolledToBottom = true;

var autoScrolling = false;

Template.chat.onRendered( onRendered );

function onRendered() {
  var sourceId = this.data;

  Tracker.autorun( function(){
    // refer to data.conversation to make this rerun on update

    if( scrolledToBottom && getConversation( sourceId ).length ) scrollToBottom();
  } );

  window.addEventListener( 'scroll', onScroll );
}

function scrollToBottom() {
  autoScrolling = true;
  document.body.scrollTop = document.body.scrollHeight;

}

var scrollTimeout;

function onScroll( event ) {
  if( autoScrolling ) {
    autoScrolling = false;
    return;
  }

  var delay = 150;

  if( scrollTimeout ) clearTimeout( scrollTimeout );
  scrollTimeout = setTimeout( detectScrollPosition, delay );

  function detectScrollPosition(){
    scrollTimeout = null;
    scrolledToBottom = document.body.scrollHeight < ( document.body.scrollTop + window.innerHeight + 30 );
  }
}

function getConversation( id ) {
  var need = Needs.findOne( { _id: id } ),
      messages = ChatMessages.find( { sourceId: id } ),
      speakingTurns = [];

  messages.forEach( processMessage );

  return {
    need: need,
    speakingTurns: speakingTurns
  };

  function processMessage( message, i ) {
    var previousSpeakingTurn = i && speakingTurns[ speakingTurns.length - 1 ],
        previousStreak = i && previousSpeakingTurn.streaks[ previousSpeakingTurn.streaks.length - 1 ],
        previousLine = i && previousStreak.lines[ previousStreak.lines.length - 1 ],
        newStreak = {
          createdBy: message.createdBy,
          created: message.created,
          lines: [ message ]
        };

    if( !i || previousSpeakingTurn.createdBy !== message.createdBy ) {
      return speakingTurns.push( {
        createdBy: message.createdBy,
        streaks: [ newStreak ]
      } );
    }

    if( message.created.getTime() - previousLine.created.getTime() > constants.bubbleJoinGap * 1000 ) {
      return previousSpeakingTurn.streaks.push( newStreak );
    }

    previousStreak.lines.push( message );
    previousStreak.created = message.created;
  }
}
