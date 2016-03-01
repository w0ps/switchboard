getSelectedText = function () {
  if ( window.getSelection ) {
    return window.getSelection().toString();
  }

  if ( document.selection && document.selection.type !== 'Control' ) {
    return document.selection.createRange().text;
  }

  console.warn( 'could not get selected text' );
};
