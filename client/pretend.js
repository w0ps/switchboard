Template.pretend.events( {
	'keyup input[name="pretend"]': keyupPretend
} );

function keyupPretend( event ){
	var value = getValueIfReturnKey( event, true );

	if( !value ) return;

	event.target.blur();

	Meteor.call( 'pretend', value );
}

Template.pretend.onRendered( function(){
	document.querySelector( 'input[name="pretend"]' ).focus();
} );
