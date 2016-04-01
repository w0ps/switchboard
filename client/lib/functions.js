getSelectedText = function () {
  if ( window.getSelection ) {
    return window.getSelection().toString();
  }

  if ( document.selection && document.selection.type !== 'Control' ) {
    return document.selection.createRange().text;
  }

  console.warn( 'could not get selected text' );
};

getValueIfReturnKey = function ( event, clear ) {
	if( event.keyCode !== 13 ) return null;

	var value = event.target.value;

  if( clear ) event.target.value = '';

	return value ? value : null;
};

var originalContent;

editableFocusHandler = function( event ) {
  originalContent = event.target.textContent;
};

editableBlurHandler = function( event ) {
  var id = this._id,
      type = guessType( this ),
      content = event.target.textContent;

  if( content === originalContent ) return;

  if( type === 'need' ) return Meteor.call( 'changeNeedTitle', id, content );
  if( type === 'chatmessage' ) return Meteor.call( 'changeChatMessageText', id, content );
  if( type === 'resource' ) return Meteor.call( 'changeResourceText', id, content );
};
