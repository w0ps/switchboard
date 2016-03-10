boundNeedDetailBodyKeyupHandler = null;

function needDetailBodyKeyupHandler( event ) {
	var need = this.need(),
			keyPressed = String.fromCharCode( event.which ),
			handlers = {
				// C: function updateNeedColor () {
				// 	var input = document.createElement( 'input' ),
				// 			colorpicker;

				// 	input.classList.add( 'modal', 'color' );
				// 	document.body.appendChild( input );

				// 	// colorpicker = new ColorPicker( input, {
				// 	// 	mode: 'rgb'
				// 	// } );
				// },
				U: function updateNeedTitle () {
					var selectedText = getSelectedText();

					if( !selectedText ) return;

					Meteor.call( 'updateNeed', need._id, { title: getSelectedText() } );
				},
				'undefined': console.log.bind( console, 'no handler for ' + keyPressed )
			};

	return handlers[ keyPressed ] ? handlers[ keyPressed ]() : undefined;
}

Template[ 'need-detail' ].onCreated( function() {
	boundNeedDetailBodyKeyupHandler = needDetailBodyKeyupHandler.bind( this.data );
	document.body.addEventListener( 'keyup', boundNeedDetailBodyKeyupHandler );
} );

Template[ 'need-detail' ].onDestroyed( function() {
	document.body.removeEventListener( boundNeedDetailBodyKeyupHandler );
} );
