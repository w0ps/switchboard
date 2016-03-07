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
