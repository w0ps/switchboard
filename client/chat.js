var chatStates = {};

Template.chat.events( {
  'keyup textarea[name=message]': textAreaKeyup,
  'focus [contentEditable=true]': editableFocusHandler,
  'keyup [contentEditable=true]': chatMessageKeyup,
  'blur [contentEditable=true]': editableBlurHandler,
  'scroll section.chat': onScroll
} );

Template.chat.helpers( {
  getConversation: getConversation,
  whose: function() {
    return this.createdBy === Meteor.userId() ? ' mine' : '';
  },
  showTyping: function( whosTyping ) {
    var copy = ( whosTyping || [] ).slice(),
        index = copy.indexOf( Meteor.userId() );

    if( index > -1 ) copy.splice( index, 1 );

    return !!copy.length;
  },
  footerHeight: function(){
    return getFooterHeight.call( this );
  }
} );

function getFooterHeight() {
  if( !this.need ) return 0;
  return isAllowed( 'post chatmessages' ) ?
    Session.get( 'bottomInputHeight-' + this.need._id ) || 25 + 5 :
    0;
}

var autoScrolling = false;

Template.chat.onRendered( onRendered );

function onRendered() {
  var sourceId = this.data,
      chat = this;

  Tracker.autorun( function(){
    // refer to data.conversation to make this rerun on update
    getConversation( sourceId );

    // stuff gets drawn later than this, so scroll down in timeout
    setTimeout( function(){
      var chatSection = document.querySelector( 'section.chat[data-sourceId="' + sourceId + '"]' ),
          chatState = chatStates[ sourceId ] = chatStates[ sourceId ] || {};

      if( chatSection && chatState.scrolledToBottom !== false ) {
        scrollToBottom( chatSection );
      }
    } );
  } );
}

function scrollToBottom( element ) {
  autoScrolling = true;
  element.scrollTop = element.scrollHeight;
}

function onScroll( event ) {
  // prevent scroll recursive endless loop
  if( autoScrolling ) {
    autoScrolling = false;
    return;
  }

  var chatSection = event.target,
      sourceId = this.need._id,
      chatState = chatStates[ sourceId ] = chatStates[ sourceId ] || {};

  chatState.scrolledToBottom = chatSection.scrollHeight <
    ( chatSection.scrollTop + window.innerHeight + getFooterHeight() );
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

function textAreaKeyup( event ) {
  var sourceId = this._id,
      target = event.target,
      currentHeight = parseInt( style = window.getComputedStyle( target ).height, 10 ),
      scrollHeight = target.scrollHeight;

  chatStates[ sourceId ] = chatStates[ sourceId ] || {};

  if( scrollHeight > currentHeight ) {
    target.style.height = scrollHeight + 'px';

    Session.set( 'bottomInputHeight-' + sourceId, scrollHeight );
  }

  if( !chatState.isWriting && event.keyCode !== 13 && event.target.value ) {
    chatState.isWriting = true;

    Meteor.call( 'startTyping', sourceId );
    return;
  }

  // backspace or other methods of clearing
  if( isWriting && !event.target.value ) {
    chatState.isWriting = false;

    Meteor.call( 'stopTyping', sourceId );
    return;
  }

  var value = getValueIfReturnKey( event, true );

  if( !value ) return;

  target.style.height = '25px';
  Session.set( 'bottomInputHeight-' + sourceId, 25 );

  chatState.isWriting = false;

  Meteor.call( 'stopTyping', sourceId );
  Meteor.call( 'addChatMessage', { text: value, sourceId: sourceId } );
}

function chatMessageKeyup( event ) {
  if( !event.ctrlKey ) return;

  var keyPressed = String.fromCharCode( event.which ),
      needId = this.sourceId,
      handlers = {
        // C: function updateNeedColor () {
        //  var input = document.createElement( 'input' ),
        //      colorpicker;

        //  input.classList.add( 'modal', 'color' );
        //  document.body.appendChild( input );

        //  // colorpicker = new ColorPicker( input, {
        //  //  mode: 'rgb'
        //  // } );
        // },
        U: function updateNeedTitle () {
          var selectedText = getSelectedText();

          if( !selectedText ) return;

          Meteor.call( 'changeNeedTitle', needId, selectedText );
        },
        'undefined': console.log.bind( console, 'no handler for ' + keyPressed )
      };

  return handlers[ keyPressed ] ? handlers[ keyPressed ]() : undefined;
}
