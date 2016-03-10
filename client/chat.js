var isWriting;

Template[ 'need-detail' ].events( {
  'keyup input[name=message]': function( event ) {
    if( !isWriting && event.keyCode !== 13 && event.target.value ) {
      isWriting = true;
      Meteor.call( 'startTyping', this.need()._id );
      return;
    }

    if( isWriting && !event.target.value ) {
      isWriting = false;
      Meteor.call( 'stopTyping', this.need()._id );
      return;
    }

    if( event.keyCode !== 13 ) return;

    var value = event.target.value;
    if( !value ) return;
    event.target.value = '';
    isWriting = false;
    Meteor.call( 'stopTyping' );
    Meteor.call( 'addChatMessage', value, this.need()._id );
  }
} );

Template.chat.helpers( {
	whose: function() {
		return this.createdBy === Meteor.userId() ? ' mine' : '';
	}
} );

scrolledToBottom = true;

var autoScrolling = false;

Template.chat.onRendered( onRendered );

function onRendered() {
  var chat = this;

  Tracker.autorun( function(){
    // refer to data.conversation to make this rerun on update
    if( scrolledToBottom && chat.data.conversation().length ) scrollToBottom();
  } );

  window.addEventListener( 'scroll', onScroll );
}

function scrollToBottom() {
  console.log( 'scroll to bottom' );
  autoScrolling = true;
  document.body.scrollTop = document.body.scrollHeight;

}

var scrollTimeout;

function onScroll( event ) {
  if( autoScrolling ) {
    autoScrolling = false;
    return;
  }
  console.log( 'onScroll' );
  var delay = 150;

  if( scrollTimeout ) clearTimeout( scrollTimeout );
  scrollTimeout = setTimeout( detectScrollPosition, delay );

  function detectScrollPosition(){
    scrollTimeout = null;
    scrolledToBottom = document.body.scrollHeight < ( document.body.scrollTop + window.innerHeight + 30 );
    console.log( 'setting scroll', scrolledToBottom );
  }
}
