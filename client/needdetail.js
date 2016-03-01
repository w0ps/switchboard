boundNeedDetailBodyKeyupHandler = null;

function needDetailBodyKeyupHandler( event ) {
	var need = this.need(),
			keyPressed = String.fromCharCode( event.which ),
			handlers = {
				U: function updateNeedTitle() {
					Meteor.call( 'updateNeed', need._id, { title: getSelectedText() } );
				},
				'undefined': console.log.bind( console, 'no handler for ' + keyPressed )
			};

	return ( handlers[ keyPressed ] || handlers[ undefined ] )();
}

Template['need-detail'].onCreated( function() {
	console.log( 'created chat' );
	boundNeedDetailBodyKeyupHandler = needDetailBodyKeyupHandler.bind( this.data );
	document.body.addEventListener( 'keyup', boundNeedDetailBodyKeyupHandler );
    // $(window).on('mouseup', chatMouseUpHandler);
} );

Template['need-detail'].onRendered(function() {
	console.log( 'rendered chat' );
    // $(window).on('mouseup', chatMouseUpHandler);
});

Template['need-detail'].onDestroyed(function() {
	console.log( 'destroyed chat' );
	document.body.removeEventListener( boundNeedDetailBodyKeyupHandler );
    // $(window).off('mouseup', chatMouseUpHandler);
});
